import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireAuth } from '../../lib/auth'
import { generateOpdNo } from '../../lib/utils'
import { getDoctorFilter, getDoctorIdForCreate } from '../../lib/doctorUtils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const user = await requireAuth(req, res)
        if (!user) return
        
        try {
            const { id, patientId, limit, offset, includePrescriptions, doctorId: selectedDoctorId } = req.query
            
            // If ID is provided, fetch single visit
            if (id) {
                const visit = await prisma.visit.findFirst({
                    where: { 
                        id: Number(id),
                        ...getDoctorFilter(user, selectedDoctorId ? Number(selectedDoctorId) : null)
                    },
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
                    where: { 
                        patientId: Number(patientId),
                        ...getDoctorFilter(user, selectedDoctorId ? Number(selectedDoctorId) : null)
                    },
                    orderBy: { date: 'desc' },
                    include: {
                        prescriptions: includePrescriptions === 'true' ? {
                            include: {
                                product: true
                            }
                        } : false,
                        patient: true
                    }
                })
                return res.status(200).json(items)
            }
            
            // Otherwise fetch all visits with pagination and minimal data
            const limitNum = limit ? Math.min(Number(limit), 10000) : 100 // Default 100, max 10000
            const offsetNum = offset ? Number(offset) : 0
            
            const items = await prisma.visit.findMany({ 
                where: getDoctorFilter(user, selectedDoctorId ? Number(selectedDoctorId) : null),
                take: limitNum,
                skip: offsetNum,
                orderBy: { date: 'desc' },
                include: {
                    // Only include prescriptions if explicitly requested
                    prescriptions: includePrescriptions === 'true' ? {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    category: true
                                }
                            }
                        }
                    } : false,
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                            gender: true,
                            email: true
                        }
                    }
                }
            })
            
            // Get total count for pagination
            const total = await prisma.visit.count()
            
            return res.status(200).json({
                data: items,
                pagination: {
                    total,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: offsetNum + limitNum < total
                }
            })
        } catch (err: any) {
            console.error('Error fetching visits:', err)
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
            date,
            diagnoses,
            temperament,
            pulseDiagnosis,
            pulseDiagnosis2,
            majorComplaints,
            historyReports,
            investigations,
            provisionalDiagnosis,
            improvements,
            specialNote,
            discussion,
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
            discount,
            payment,
            balance,
            visitNumber,
            followUpCount,
            reportsAttachments, // JSON string of report attachments
            patientCopyPdfUrl, // Cloudinary URL for patient copy
            officeCopyPdfUrl, // Cloudinary URL for office copy
            prescriptions, // optional array of { treatmentId, dosage, administration, quantity, taken, productId }
            autoGenerateInvoice // flag to automatically create customer invoice
        } = req.body

        const isUpdate = !!id
        
        // Get the doctor ID before the transaction
        const doctorIdForTask = getDoctorIdForCreate(user, req.body.doctorId)

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
                    date: date ? new Date(date) : undefined,
                    diagnoses,
                    temperament,
                    pulseDiagnosis,
                    pulseDiagnosis2,
                    majorComplaints,
                    historyReports,
                    investigations,
                    provisionalDiagnosis,
                    improvements,
                    specialNote,
                    discussion,
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
                    discount: discount ? Number(discount) : undefined,
                    payment: payment ? Number(payment) : undefined,
                    balance: balance ? Number(balance) : undefined,
                    visitNumber: visitNumber ? Number(visitNumber) : undefined,
                    followUpCount: followUpCount ? Number(followUpCount) : undefined,
                    reportsAttachments: reportsAttachments !== undefined ? reportsAttachments : undefined,
                    patientCopyPdfUrl: patientCopyPdfUrl || undefined,
                    officeCopyPdfUrl: officeCopyPdfUrl || undefined,
                    doctorId: getDoctorIdForCreate(user, req.body.doctorId)
                }
                
                let visit
                if (isUpdate) {
                    // Update existing visit
                    visit = await tx.visit.update({
                        where: { id: Number(id) },
                        data: visitData
                    })
                    
                    // Before deleting prescriptions, restore inventory from old prescriptions
                    const oldPrescriptions = await tx.prescription.findMany({
                        where: { visitId: visit.id }
                    })
                    
                    // Restore inventory for each old prescription
                    for (const oldPr of oldPrescriptions) {
                        if (oldPr.productId) {
                            const prod = await tx.product.findUnique({ where: { id: oldPr.productId } })
                            if (prod) {
                                await tx.product.update({
                                    where: { id: oldPr.productId },
                                    data: {
                                        quantity: prod.quantity + oldPr.quantity,
                                        totalSales: Math.max(0, prod.totalSales - oldPr.quantity)
                                    }
                                })
                                
                                // Create stock transaction for audit trail
                                await tx.stockTransaction.create({
                                    data: {
                                        productId: oldPr.productId,
                                        transactionType: 'IN',
                                        quantity: oldPr.quantity,
                                        unitPrice: prod.priceRupees,
                                        totalValue: oldPr.quantity * (prod.priceRupees || 0),
                                        balanceQuantity: prod.quantity + oldPr.quantity,
                                        referenceType: 'Visit',
                                        referenceId: visit.id,
                                        notes: `Inventory restored from visit ${visit.opdNo} edit`,
                                        performedBy: user.email
                                    }
                                })
                            }
                        }
                    }
                    
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
                    // Process prescriptions in parallel for better performance
                    const prescriptionPromises = prescriptions.map(async (pr) => {
                        const prescriptionData: any = {
                            visitId: visit.id,
                            productId: pr.productId ? Number(pr.productId) : undefined,
                            quantity: Number(pr.quantity || 1),
                            timing: pr.timing || null,
                            dosage: pr.dosage || null,
                            procedure: pr.procedure || null,
                            presentation: pr.presentation || null,
                            spy1: pr.spy1 || null,
                            spy2: pr.spy2 || null,
                            spy3: pr.spy3 || null,
                            spy4: pr.spy4 || null,
                            spy5: pr.spy5 || null,
                            spy6: pr.spy6 || null,
                            addition1: pr.addition1 || null,
                            addition2: pr.addition2 || null,
                            addition3: pr.addition3 || null,
                            bottleSize: pr.bottleSize || null,
                            patientHasMedicine: !!pr.patientHasMedicine,
                            administration: pr.administration || null,
                            taken: !!pr.taken,
                            dispensed: !!pr.dispensed
                        }

                        // Only add treatmentId if it's provided and valid
                        if (pr.treatmentId && String(pr.treatmentId).trim() !== '') {
                            prescriptionData.treatmentId = Number(pr.treatmentId)
                        }

                        // Create prescription
                        const prescription = await tx.prescription.create({ data: prescriptionData })
                        
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
                                        unitPrice: prod.priceRupees,
                                        totalValue: qtyToConsume * (prod.priceRupees || 0),
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
                                        unitPrice: prod.priceRupees,
                                        taxRate: 0, // Can be configured
                                        discount: 0,
                                        totalAmount: qtyToConsume * (prod.priceRupees || 0)
                                    })
                                }
                            }
                        }
                        
                        return prescription
                    })
                    
                    // Wait for all prescriptions to be processed
                    createdPrescriptions = await Promise.all(prescriptionPromises)
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

                // Create or update suggested task for receptionist with 1 hour expiry
                if (createdPrescriptions.length > 0) {
                    const patient = await tx.patient.findUnique({ where: { id: Number(patientId) } })
                    const oneHourLater = new Date()
                    oneHourLater.setHours(oneHourLater.getHours() + 1)

                    // Build task description with attachments
                    let taskDescription = `Visit OPD No: ${generatedOpdNo}\nPatient: ${patient?.firstName} ${patient?.lastName}\nPrescriptions: ${createdPrescriptions.length} item(s)`
                    
                    // Add reports attachments to description if provided
                    if (reportsAttachments && typeof reportsAttachments === 'string') {
                        try {
                            const attachments = JSON.parse(reportsAttachments)
                            if (Array.isArray(attachments) && attachments.length > 0) {
                                taskDescription += `\n\nAttachments (${attachments.length}):`
                                attachments.forEach((att: any, idx: number) => {
                                    taskDescription += `\n${idx + 1}. ${att.name || 'File'}: ${att.url}`
                                })
                            }
                        } catch (e) {
                            console.error('Failed to parse reportsAttachments for task:', e)
                        }
                    }

                    // Check if a suggested task already exists for this visit
                    const existingTask = await tx.task.findFirst({
                        where: {
                            visitId: visit.id,
                            isSuggested: true,
                            assignedTo: null // Only update if not yet assigned
                        }
                    })

                    if (existingTask) {
                        // Update existing task
                        await tx.task.update({
                            where: { id: existingTask.id },
                            data: {
                                title: `Process prescription for ${patient?.firstName} ${patient?.lastName}`,
                                description: taskDescription,
                                expiresAt: oneHourLater,
                                attachmentUrl: officeCopyPdfUrl || null
                            }
                        })
                    } else {
                        // Create new suggested task with doctorId
                        await tx.task.create({
                            data: {
                                title: `Process prescription for ${patient?.firstName} ${patient?.lastName}`,
                                description: taskDescription,
                                type: 'task',
                                status: 'pending',
                                isSuggested: true,
                                expiresAt: oneHourLater,
                                visitId: visit.id,
                                doctorId: doctorIdForTask, // Link task to the doctor
                                attachmentUrl: officeCopyPdfUrl || null
                            }
                        })
                    }
                }

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
