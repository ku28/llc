import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireDoctorOrAdmin, requireAuth } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Treatments restricted to doctors and admins only
    const user = await requireDoctorOrAdmin(req, res)
    if (!user) return
    
    if (req.method === 'GET') {
        try {
            // Check if we want to include deleted treatments
            const includeDeleted = req.query.includeDeleted === 'true'
            
            const items = await prisma.treatment.findMany({ 
                where: includeDeleted ? {} : {
                    deleted: { not: true }
                },
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
            provDiagnosis, planNumber, speciality, organ, diseaseAction, 
            treatmentPlan, administration, notes, products 
        } = req.body
        
        try {
            // Create treatment with products
            const t = await prisma.treatment.create({ 
                data: { 
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
                            spy1: p.spy1 || null,
                            spy2: p.spy2 || null,
                            spy3: p.spy3 || null,
                            spy4: p.spy4 || null,
                            spy5: p.spy5 || null,
                            spy6: p.spy6 || null,
                            timing: p.timing || null,
                            dosage: p.dosage || null,
                            additions: p.additions || null,
                            addition1: p.addition1 || null,
                            addition2: p.addition2 || null,
                            addition3: p.addition3 || null,
                            procedure: p.procedure || null,
                            presentation: p.presentation || null
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
            id, provDiagnosis, planNumber, speciality, organ, diseaseAction, 
            treatmentPlan, administration, notes, products 
        } = req.body
        
        try {
            const treatmentId = parseInt(id)
            
            // Delete existing products and create new ones
            await prisma.treatmentProduct.deleteMany({
                where: { treatmentId: treatmentId }
            })
            
            // Update treatment with new products
            const t = await prisma.treatment.update({ 
                where: { id: treatmentId },
                data: { 
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
                            spy1: p.spy1 || null,
                            spy2: p.spy2 || null,
                            spy3: p.spy3 || null,
                            spy4: p.spy4 || null,
                            spy5: p.spy5 || null,
                            spy6: p.spy6 || null,
                            timing: p.timing || null,
                            dosage: p.dosage || null,
                            additions: p.additions || null,
                            addition1: p.addition1 || null,
                            addition2: p.addition2 || null,
                            addition3: p.addition3 || null,
                            procedure: p.procedure || null,
                            presentation: p.presentation || null
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
            // Get the treatment being deleted
            const treatment = await prisma.treatment.findUnique({ where: { id } })
            if (!treatment) {
                return res.status(404).json({ error: 'Treatment not found' })
            }

            const deletedPlanNumber = treatment.planNumber ? parseInt(treatment.planNumber, 10) : null

            // Mark as deleted instead of actually deleting
            await prisma.treatment.update({
                where: { id },
                data: {
                    deleted: true,
                    planNumber: null // Remove plan number from deleted treatments
                }
            })

            // If the deleted treatment had a plan number, renumber the remaining plans
            if (deletedPlanNumber !== null && !isNaN(deletedPlanNumber)) {
                // Get all non-deleted treatments with plan numbers greater than the deleted one
                const treatmentsToRenumber = await prisma.treatment.findMany({
                    where: {
                        deleted: { not: true },
                        planNumber: { not: null }
                    },
                    orderBy: { planNumber: 'asc' }
                })

                // Renumber plans sequentially starting from 01
                for (let i = 0; i < treatmentsToRenumber.length; i++) {
                    const newPlanNumber = String(i + 1).padStart(2, '0')
                    await prisma.treatment.update({
                        where: { id: treatmentsToRenumber[i].id },
                        data: { planNumber: newPlanNumber }
                    })
                }
            }

            return res.status(200).json({ success: true })
        } catch (err: any) {
            console.error('Delete treatment error:', err)
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
