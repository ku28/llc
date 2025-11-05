import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth } from '../../lib/auth'
import { generateOpdNo } from '../../lib/utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const { id, patientId } = req.query
            
            // If ID is provided, fetch single visit
            if (id) {
                const visit = await prisma.visit.findUnique({
                    where: { id: Number(id) },
                    include: {
                        prescriptions: {
                            include: {
                                product: true
                            }
                        },
                        patient: true
                    }
                })
                
                if (!visit) {
                    return res.status(404).json({ error: 'Visit not found' })
                }
                
                return res.status(200).json(visit)
            }
            
            // If patientId is provided, fetch visits for that patient
            if (patientId) {
                const items = await prisma.visit.findMany({ 
                    where: { patientId: Number(patientId) },
                    orderBy: { date: 'desc' },
                    include: {
                        prescriptions: {
                            include: {
                                product: true
                            }
                        },
                        patient: true
                    }
                })
                return res.status(200).json(items)
            }
            
            // Otherwise fetch all visits
            const items = await prisma.visit.findMany({ 
                orderBy: { date: 'desc' },
                include: {
                    prescriptions: {
                        include: {
                            product: true
                        }
                    },
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
            id, // If provided, this is an update operation
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

        const isUpdate = !!id

        try {
            // Create or update visit, prescriptions, update inventory, and optionally create invoice - all in one transaction
            const result = await prisma.$transaction(async (tx: any) => {
                // Auto-generate opdNo if creating a new visit
                let generatedOpdNo = opdNo
                if (!isUpdate && !opdNo) {
                    // Get visit count for this patient
                    const visitCount = await tx.visit.count({
                        where: { patientId: Number(patientId) }
                    })
                    
                    // Get token for today (or create one)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const tomorrow = new Date(today)
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    
                    let token = await tx.token.findFirst({
                        where: {
                            patientId: Number(patientId),
                            date: {
                                gte: today,
                                lt: tomorrow
                            }
                        }
                    })
                    
                    // If no token exists for today, create one
                    if (!token) {
                        // Get the highest token number for today across all patients
                        const todayTokens = await tx.token.findMany({
                            where: {
                                date: {
                                    gte: today,
                                    lt: tomorrow
                                }
                            },
                            orderBy: {
                                tokenNumber: 'desc'
                            },
                            take: 1
                        })
                        
                        const nextTokenNumber = todayTokens.length > 0 ? todayTokens[0].tokenNumber + 1 : 1
                        
                        token = await tx.token.create({
                            data: {
                                patientId: Number(patientId),
                                tokenNumber: nextTokenNumber,
                                date: today,
                                status: 'waiting'
                            }
                        })
                    }
                    
                    // Generate OPD number
                    generatedOpdNo = generateOpdNo(today, token.tokenNumber, visitCount + 1)
                }
                
                // 1. Create or update the visit
                const visitData = {
                    patientId: Number(patientId),
                    opdNo: generatedOpdNo || '',
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
                
                let visit
                if (isUpdate) {
                    // Update existing visit
                    visit = await tx.visit.update({
                        where: { id: Number(id) },
                        data: visitData
                    })
                    
                    // Delete existing prescriptions for this visit
                    await tx.prescription.deleteMany({
                        where: { visitId: visit.id }
                    })
                } else {
                    // Create new visit
                    visit = await tx.visit.create({ data: visitData })
                }

                // Update patient with clinical information for future reference
                if (patientId) {
                    const patientUpdateData: any = {}
                    if (temperament) patientUpdateData.temperament = temperament
                    if (pulseDiagnosis) patientUpdateData.pulseDiagnosis = pulseDiagnosis
                    if (majorComplaints) patientUpdateData.majorComplaints = majorComplaints
                    if (historyReports) patientUpdateData.historyReports = historyReports
                    if (investigations) patientUpdateData.investigations = investigations
                    if (provisionalDiagnosis) patientUpdateData.provisionalDiagnosis = provisionalDiagnosis
                    if (improvements) patientUpdateData.improvements = improvements
                    
                    if (Object.keys(patientUpdateData).length > 0) {
                        await tx.patient.update({
                            where: { id: Number(patientId) },
                            data: patientUpdateData
                        })
                    }
                }


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

    if (req.method === 'DELETE') {
        const user = await requireAuth(req, res)
        if (!user) return
        
        const { id } = req.query
        
        if (!id) {
            return res.status(400).json({ error: 'Visit ID is required' })
        }
        
        try {
            // Delete associated prescriptions first
            await prisma.prescription.deleteMany({
                where: { visitId: Number(id) }
            })
            
            // Then delete the visit
            await prisma.visit.delete({
                where: { id: Number(id) }
            })
            
            return res.status(200).json({ message: 'Visit deleted successfully' })
        } catch (err: any) {
            console.error('Error deleting visit:', err)
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
