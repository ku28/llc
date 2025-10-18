import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const items = await prisma.visit.findMany({ 
                orderBy: { date: 'desc' },
                include: {
                    prescriptions: true,
                    patient: true
                }
            })
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
            amount,
            payment,
            balance,
            prescriptions, // optional array of { treatmentId, dosage, administration, quantity, taken, productId }
            autoGenerateInvoice // flag to automatically create customer invoice
        } = req.body

        try {
            // Create visit, prescriptions, update inventory, and optionally create invoice - all in one transaction
            const result = await prisma.$transaction(async (tx: any) => {
                // 1. Create the visit
                const visit = await tx.visit.create({ 
                    data: {
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
                        weight: weight ? Number(weight) : undefined,
                        amount: amount ? Number(amount) : undefined,
                        payment: payment ? Number(payment) : undefined,
                        balance: balance ? Number(balance) : undefined
                    } 
                })

                let createdPrescriptions: any[] = []
                let invoiceItems: any[] = []

                // 2. Process prescriptions if provided
                if (Array.isArray(prescriptions) && prescriptions.length > 0) {
                    for (const pr of prescriptions) {
                        const prescriptionData: any = {
                            visitId: visit.id,
                            treatmentId: pr.treatmentId ? Number(pr.treatmentId) : undefined,
                            productId: pr.productId ? Number(pr.productId) : undefined,
                            comp1: pr.comp1 || null,
                            comp2: pr.comp2 || null,
                            comp3: pr.comp3 || null,
                            quantity: Number(pr.quantity || 1),
                            timing: pr.timing || null,
                            dosage: pr.dosage || null,
                            additions: pr.additions || null,
                            procedure: pr.procedure || null,
                            presentation: pr.presentation || null,
                            droppersToday: pr.droppersToday ? Number(pr.droppersToday) : null,
                            medicineQuantity: pr.medicineQuantity ? Number(pr.medicineQuantity) : null,
                            administration: pr.administration || null,
                            taken: !!pr.taken,
                            dispensed: !!pr.dispensed
                        }

                        // Create prescription
                        const prescription = await tx.prescription.create({ data: prescriptionData })
                        createdPrescriptions.push(prescription)

                        // 3. Handle inventory deduction if productId is provided
                        if (pr.productId) {
                            const pid = Number(pr.productId)
                            const qtyToConsume = Number(pr.quantity || 1)
                            
                            // Get current product
                            const prod = await tx.product.findUnique({ where: { id: pid } })
                            
                            if (prod) {
                                const newQty = prod.quantity - qtyToConsume
                                
                                // Update product quantity and sales
                                await tx.product.update({ 
                                    where: { id: pid }, 
                                    data: { 
                                        quantity: Math.max(0, newQty),
                                        totalSales: prod.totalSales + qtyToConsume
                                    } 
                                })

                                // Create stock transaction for audit trail
                                await tx.stockTransaction.create({
                                    data: {
                                        productId: pid,
                                        transactionType: 'OUT',
                                        quantity: qtyToConsume,
                                        unitPrice: prod.priceCents,
                                        totalValue: qtyToConsume * prod.priceCents,
                                        balanceQuantity: Math.max(0, newQty),
                                        referenceType: 'Visit',
                                        referenceId: visit.id,
                                        notes: `Dispensed for visit ${opdNo}`,
                                        performedBy: user.email
                                    }
                                })

                                // 4. Check if stock is low and create product order if needed
                                const reorderLevel = prod.category?.reorderLevel ?? 10
                                if (newQty <= reorderLevel) {
                                    // Check if there's already a pending order for this product
                                    const existingOrder = await tx.productOrder.findFirst({
                                        where: {
                                            productId: pid,
                                            status: 'pending'
                                        }
                                    })

                                    if (!existingOrder) {
                                        // Create auto-reorder with smart quantity (2x reorder level or minimum 10)
                                        const orderQty = Math.max(reorderLevel * 2, 10)
                                        await tx.productOrder.create({ 
                                            data: { 
                                                productId: pid, 
                                                quantity: orderQty, 
                                                status: 'pending',
                                                orderVia: 'AUTO_REORDER'
                                            } 
                                        })
                                    }
                                }

                                // 5. Prepare invoice item if auto-generating invoice
                                if (autoGenerateInvoice) {
                                    invoiceItems.push({
                                        productId: pid,
                                        description: prod.name,
                                        quantity: qtyToConsume,
                                        unitPrice: prod.priceCents,
                                        taxRate: 0, // Can be configured
                                        discount: 0,
                                        totalAmount: qtyToConsume * prod.priceCents
                                    })
                                }
                            }
                        }
                    }
                }

                // 6. Auto-generate customer invoice if requested and there are items
                let invoice = null
                if (autoGenerateInvoice && invoiceItems.length > 0) {
                    // Get patient details for invoice
                    const patient = await tx.patient.findUnique({ where: { id: Number(patientId) } })
                    
                    if (patient) {
                        // Generate Invoice Number
                        const lastInvoice = await tx.customerInvoice.findFirst({
                            orderBy: { id: 'desc' }
                        })
                        const invoiceNumber = `INV-${String((lastInvoice?.id || 0) + 1).padStart(6, '0')}`

                        // Calculate totals
                        const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalAmount, 0)
                        const totalAmount = subtotal
                        const paidAmount = payment ? Number(payment) : 0
                        const balanceAmount = totalAmount - paidAmount

                        invoice = await tx.customerInvoice.create({
                            data: {
                                invoiceNumber,
                                patientId: Number(patientId),
                                customerName: `${patient.firstName} ${patient.lastName}`,
                                customerEmail: patient.email || undefined,
                                customerPhone: patient.phone || undefined,
                                customerAddress: patient.address || undefined,
                                invoiceDate: new Date(),
                                dueDate: nextVisit ? new Date(nextVisit) : undefined,
                                status: balanceAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid'),
                                subtotal,
                                taxAmount: 0,
                                discount: 0,
                                totalAmount,
                                paidAmount,
                                balanceAmount,
                                notes: `Auto-generated from visit ${opdNo}`,
                                items: {
                                    create: invoiceItems
                                }
                            },
                            include: {
                                items: true
                            }
                        })
                    }
                }

                // Fetch complete visit with prescriptions
                const fullVisit = await tx.visit.findUnique({ 
                    where: { id: visit.id }, 
                    include: { prescriptions: true } 
                })

                return { visit: fullVisit, invoice }
            }, {
                timeout: 30000 // Increase timeout to 30 seconds
            })

            return res.status(201).json(result.visit)
        } catch (err: any) {
            console.error('Error creating visit:', err)
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
