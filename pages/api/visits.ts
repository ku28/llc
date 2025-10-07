import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const items = await prisma.visit.findMany({ orderBy: { date: 'desc' } })
            return res.status(200).json(items)
        } catch (err: any) {
            if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'POST') {
        const user = await requireAuth(req, res)
        if(!user) return
        const {
            patientId,
            opdNo,
            diagnoses,
            temperament,
            pulseDiagnosis,
            majorComplaints,
            historyReports,
            investigations,
            provisionalDiagnosis,
            improvements,
            specialNote,
            dob,
            age,
            address,
            gender,
            phone,
            nextVisit,
            occupation,
            pendingPaymentCents,
            height,
            weight,
            prescriptions // optional array of { treatmentId, dosage, administration, quantity, taken }
        } = req.body

        try {
            // Create visit, then optionally create prescriptions linked to it
            const visit = await prisma.visit.create({ data: {
                patientId: Number(patientId),
                opdNo: opdNo || '',
                diagnoses,
                temperament,
                pulseDiagnosis,
                majorComplaints,
                historyReports,
                investigations,
                provisionalDiagnosis,
                improvements,
                specialNote,
                dob: dob ? new Date(dob) : undefined,
                age: age ? Number(age) : undefined,
                address,
                gender,
                phone,
                nextVisit: nextVisit ? new Date(nextVisit) : undefined,
                occupation,
                pendingPaymentCents: pendingPaymentCents ? Number(pendingPaymentCents) : undefined,
                height: height ? Number(height) : undefined,
                weight: weight ? Number(weight) : undefined
            } })

            // Process prescriptions and adjust inventory when productId is provided on each prescription
            let createdPrescriptions: any[] = []
            if (Array.isArray(prescriptions) && prescriptions.length > 0) {
                // Build prescription create ops
                const ops = prescriptions.map((pr: any) => ({
                    visitId: visit.id,
                    treatmentId: pr.treatmentId ? Number(pr.treatmentId) : undefined,
                    dosage: pr.dosage,
                    administration: pr.administration,
                    quantity: Number(pr.quantity || 1),
                    taken: !!pr.taken
                }))

                // Create prescriptions inside transaction and update product quantities where applicable
                await prisma.$transaction(async (tx: any) => {
                    // create prescriptions
                    const created = await tx.prescription.createMany({ data: ops })

                    // For each prescription that has productId, decrement product quantity and create product order if low
                    for (const pr of prescriptions) {
                        if (pr.productId) {
                            const pid = Number(pr.productId)
                            const qtyToConsume = Number(pr.quantity || 1)
                            // Decrement product quantity
                            const prod = await tx.product.findUnique({ where: { id: pid } })
                            if (prod) {
                                const newQty = prod.quantity - qtyToConsume
                                await tx.product.update({ where: { id: pid }, data: { quantity: newQty } })
                                // If stock at or below reorder level, create a ProductOrder if none pending
                                const reorderLevel = (prod as any).reorderLevel ?? 0
                                if (newQty <= reorderLevel) {
                                    // create an order record (quantity is placeholder: reorderLevel * 2 or 10 minimum)
                                    const orderQty = Math.max(reorderLevel * 2, 10)
                                    await tx.productOrder.create({ data: { productId: pid, quantity: orderQty, status: 'pending' } })
                                }
                            }
                        }
                    }
                })
            }

            const full = await prisma.visit.findUnique({ where: { id: visit.id }, include: { prescriptions: true } })
            return res.status(201).json(full)
        } catch (err: any) {
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
