import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireDoctorOrAdmin, requireAuth } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Treatments restricted to doctors and admins only
    const user = await requireDoctorOrAdmin(req, res)
    if (!user) return
    
    if (req.method === 'GET') {
        try {
            const items = await prisma.treatment.findMany({ 
                orderBy: { createdAt: 'desc' },
                include: {
                    treatmentProducts: {
                        include: {
                            product: true
                        }
                    }
                }
            })
            return res.status(200).json(items)
        } catch (err: any) {
            // If the table/column doesn't exist yet, return empty list so frontend can load
            if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'POST') {
        const user = await requireAuth(req, res)
        if(!user) return
        
        const { 
            srNo, provDiagnosis, planNumber, speciality, organ, diseaseAction, 
            treatmentPlan, administration, notes, products 
        } = req.body
        
        try {
            // Create treatment with products
            const t = await prisma.treatment.create({ 
                data: { 
                    srNo,
                    provDiagnosis,
                    planNumber,
                    speciality,
                    organ,
                    diseaseAction,
                    treatmentPlan,
                    administration,
                    notes,
                    // Create related products with medicine-specific fields
                    treatmentProducts: {
                        create: (products || []).map((p: any) => ({
                            productId: parseInt(p.productId),
                            comp1: p.comp1 || null,
                            comp2: p.comp2 || null,
                            comp3: p.comp3 || null,
                            quantity: p.quantity || 1,
                            timing: p.timing || null,
                            dosage: p.dosage || null,
                            additions: p.additions || null,
                            procedure: p.procedure || null,
                            presentation: p.presentation || null,
                            droppersToday: p.droppersToday || null,
                            medicineQuantity: p.medicineQuantity || null
                        }))
                    }
                },
                include: {
                    treatmentProducts: {
                        include: {
                            product: true
                        }
                    }
                }
            })
            return res.status(201).json(t)
        } catch (err: any) {
            console.error('Create treatment error:', err)
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'PUT') {
        const user = await requireAuth(req, res)
        if(!user) return
        
        const { 
            id, srNo, provDiagnosis, planNumber, speciality, organ, diseaseAction, 
            treatmentPlan, administration, notes, products 
        } = req.body
        
        try {
            // Delete existing products and create new ones
            await prisma.treatmentProduct.deleteMany({
                where: { treatmentId: id }
            })
            
            // Update treatment with new products
            const t = await prisma.treatment.update({ 
                where: { id },
                data: { 
                    srNo,
                    provDiagnosis,
                    planNumber,
                    speciality,
                    organ,
                    diseaseAction,
                    treatmentPlan,
                    administration,
                    notes,
                    // Create new product relationships with medicine-specific fields
                    treatmentProducts: {
                        create: (products || []).map((p: any) => ({
                            productId: parseInt(p.productId),
                            comp1: p.comp1 || null,
                            comp2: p.comp2 || null,
                            comp3: p.comp3 || null,
                            quantity: p.quantity || 1,
                            timing: p.timing || null,
                            dosage: p.dosage || null,
                            additions: p.additions || null,
                            procedure: p.procedure || null,
                            presentation: p.presentation || null,
                            droppersToday: p.droppersToday || null,
                            medicineQuantity: p.medicineQuantity || null
                        }))
                    }
                },
                include: {
                    treatmentProducts: {
                        include: {
                            product: true
                        }
                    }
                }
            })
            return res.status(200).json(t)
        } catch (err: any) {
            console.error('Update treatment error:', err)
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'DELETE') {
        const user = await requireAuth(req, res)
        if(!user) return
        
        const { id } = req.body
        try {
            await prisma.treatment.delete({ where: { id } })
            return res.status(200).json({ success: true })
        } catch (err: any) {
            console.error('Delete treatment error:', err)
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
