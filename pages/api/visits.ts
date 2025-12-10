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
                            email: true,
                            imageUrl: true
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
            officeCopyPdfUrl, // Cloudinary URL for office copy
            prescriptions, // optional array of { treatmentId, dosage, administration, quantity, taken, productId }
            autoGenerateInvoice // flag to automatically create customer invoice
        } = req.body

        const isUpdate = !!id
        
        // Get the doctor ID before the transaction
        const doctorIdForTask = getDoctorIdForCreate(user, req.body.doctorId)

        // Fetch patient data once before transaction to avoid queries inside
        const patientData = patientId ? await prisma.patient.findUnique({ 
            where: { id: Number(patientId) },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, address: true }
        }) : null

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
                    officeCopyPdfUrl: officeCopyPdfUrl || undefined,
                    isImported: false, // Explicitly mark as not imported for PDF generation
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
                        where: { visitId: visit.id },
                        select: { id: true, productId: true, quantity: true }
                    })
                    
                    // Get unique product IDs and fetch all at once
                    const oldProductIds = [...new Set(oldPrescriptions.filter((pr: any) => pr.productId).map((pr: any) => pr.productId!))]
                    
                    if (oldProductIds.length > 0) {
                        const oldProducts = await tx.product.findMany({
                            where: { id: { in: oldProductIds } }
                        })
                        const oldProductMap = new Map(oldProducts.map((p: any) => [p.id, p]))
                        
                        // Restore inventory in batch
                        for (const oldPr of oldPrescriptions) {
                            if (oldPr.productId) {
                                const prod: any = oldProductMap.get(oldPr.productId)
                                if (prod) {
                                    await tx.product.update({
                                        where: { id: oldPr.productId },
                                        data: {
                                            quantity: { increment: oldPr.quantity },
                                            totalSales: { decrement: oldPr.quantity }
                                        }
                                    })
                                }
                            }
                        }
                    }
                    
                    // SAFETY CHECK: Prevent accidental deletion of all prescriptions
                    // Only delete if we have new prescriptions to replace them with
                    const existingPrescriptionCount = await tx.prescription.count({
                        where: { visitId: visit.id }
                    })
                    
                    const newPrescriptionCount = Array.isArray(prescriptions) ? prescriptions.length : 0
                    
                    // If there are existing prescriptions but no new ones, something is wrong - don't delete
                    if (existingPrescriptionCount > 0 && newPrescriptionCount === 0) {
                        console.error(`⚠️ SAFETY: Attempted to delete ${existingPrescriptionCount} prescriptions with no replacement for visitId: ${visit.id}`)
                        // Keep the existing prescriptions - don't delete them
                    } else {
                        // Safe to delete and replace
                        if (existingPrescriptionCount > 0) {
                            console.log(`Deleting ${existingPrescriptionCount} existing prescriptions for visitId: ${visit.id} to replace with ${newPrescriptionCount} new ones`)
                        }
                        await tx.prescription.deleteMany({
                            where: { visitId: visit.id }
                        })
                    }
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
                let productUpdates: any[] = []

                // 2. Process prescriptions if provided
                console.log(`Processing ${Array.isArray(prescriptions) ? prescriptions.length : 0} prescriptions for visitId: ${visit.id}`)
                
                if (Array.isArray(prescriptions) && prescriptions.length > 0) {
                    // Collect all prescription data first
                    const prescriptionDataArray = prescriptions.map((pr) => {
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
                            discussions: pr.discussions || null,
                            taken: !!pr.taken,
                            dispensed: !!pr.dispensed
                        }

                        if (pr.treatmentId && String(pr.treatmentId).trim() !== '') {
                            prescriptionData.treatmentId = Number(pr.treatmentId)
                        }

                        return prescriptionData
                    })

                    // Batch create all prescriptions
                    await tx.prescription.createMany({
                        data: prescriptionDataArray
                    })
                    
                    // Fetch the created prescriptions
                    createdPrescriptions = await tx.prescription.findMany({
                        where: { visitId: visit.id }
                    })

                    // Get all unique product IDs that need inventory updates (filter out invalid IDs)
                    const productIds = [...new Set(
                        prescriptions
                            .filter(pr => pr.productId && !isNaN(Number(pr.productId)))
                            .map(pr => Number(pr.productId))
                    )]
                    
                    if (productIds.length > 0) {
                        // Fetch all products at once
                        const products = await tx.product.findMany({
                            where: { id: { in: productIds } },
                            include: { category: true }
                        })
                        
                        const productMap = new Map(products.map((p: any) => [p.id, p]))

                        // Process inventory updates
                        for (const pr of prescriptions) {
                            if (!pr.productId || isNaN(Number(pr.productId))) continue
                            
                            const pid = Number(pr.productId)
                            const qtyToConsume = Number(pr.quantity || 1)
                            const prod: any = productMap.get(pid)
                            
                            if (prod) {
                                const newQty = prod.quantity - qtyToConsume
                                
                                // Collect for batch update
                                productUpdates.push({ 
                                    id: pid, 
                                    quantity: Math.max(0, newQty),
                                    totalSales: prod.totalSales + qtyToConsume,
                                    priceRupees: prod.priceRupees,
                                    name: prod.name
                                })

                                // Prepare invoice item if auto-generating invoice
                                if (autoGenerateInvoice) {
                                    invoiceItems.push({
                                        productId: pid,
                                        description: prod.name,
                                        quantity: qtyToConsume,
                                        unitPrice: prod.priceRupees,
                                        taxRate: 0,
                                        discount: 0,
                                        totalAmount: qtyToConsume * (prod.priceRupees || 0)
                                    })
                                }
                            }
                        }

                        // Batch update all products
                        for (const update of productUpdates) {
                            await tx.product.update({
                                where: { id: update.id },
                                data: {
                                    quantity: update.quantity,
                                    totalSales: update.totalSales
                                }
                            })
                        }
                    }
                }

                // 6. Auto-generate customer invoice if requested and there are items
                let invoice = null
                if (autoGenerateInvoice && invoiceItems.length > 0 && patientData) {
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
                                customerName: `${patientData.firstName} ${patientData.lastName || ''}`,
                                customerEmail: patientData.email || undefined,
                                customerPhone: patientData.phone || undefined,
                                customerAddress: patientData.address || undefined,
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

                return { visit, invoice, prescriptions: createdPrescriptions, opdNo: generatedOpdNo, productUpdates }
            }, {
                timeout: 60000 // Increase timeout to 60 seconds for complex operations
            })

            // Handle stock transactions and product reorders after transaction (non-critical operations)
            if (result.productUpdates && result.productUpdates.length > 0) {
                try {
                    // Create stock transactions for audit trail
                    const stockTransactions = result.productUpdates.map((update: any) => {
                        const qtyConsumed = prescriptions.find((pr: any) => Number(pr.productId) === update.id)?.quantity || 1
                        return {
                            productId: update.id,
                            transactionType: 'OUT',
                            quantity: qtyConsumed,
                            unitPrice: update.priceRupees,
                            totalValue: qtyConsumed * (update.priceRupees || 0),
                            balanceQuantity: update.quantity,
                            referenceType: 'Visit',
                            referenceId: result.visit.id,
                            notes: `Dispensed for visit ${result.opdNo}`,
                            performedBy: user.email
                        }
                    })

                    await prisma.stockTransaction.createMany({
                        data: stockTransactions
                    })

                    // Check for reorder needs
                    for (const update of result.productUpdates) {
                        const product = await prisma.product.findUnique({
                            where: { id: update.id },
                            include: { category: true }
                        })

                        if (product) {
                            const reorderLevel = product.category?.reorderLevel ?? 10
                            if (update.quantity <= reorderLevel) {
                                const existingOrder = await prisma.productOrder.findFirst({
                                    where: {
                                        productId: update.id,
                                        status: 'pending'
                                    }
                                })

                                if (!existingOrder) {
                                    const orderQty = Math.max(reorderLevel * 2, 10)
                                    await prisma.productOrder.create({
                                        data: {
                                            productId: update.id,
                                            quantity: orderQty,
                                            status: 'pending',
                                            orderVia: 'AUTO_REORDER'
                                        }
                                    })
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error creating stock transactions or product orders:', error)
                }
            }

            // Fetch complete visit with prescriptions after transaction completes
            const fullVisit = await prisma.visit.findUnique({ 
                where: { id: result.visit.id }, 
                include: { prescriptions: true } 
            })

            // Create or update suggested task for receptionist with 1 hour expiry (outside transaction)
            if (result.prescriptions.length > 0 && patientData) {
                try {
                    const oneHourLater = new Date()
                    oneHourLater.setHours(oneHourLater.getHours() + 1)

                    // Build task description with attachments
                    let taskDescription = `Visit OPD No: ${result.opdNo}\nPatient: ${patientData.firstName} ${patientData.lastName || ''}\nPrescriptions: ${result.prescriptions.length} item(s)`
                    
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
                    const existingTask = await prisma.task.findFirst({
                        where: {
                            visitId: result.visit.id,
                            isSuggested: true,
                            assignedTo: null // Only update if not yet assigned
                        }
                    })

                    if (existingTask) {
                        // Update existing task
                        await prisma.task.update({
                            where: { id: existingTask.id },
                            data: {
                                title: `Process prescription for ${patientData.firstName} ${patientData.lastName || ''}`,
                                description: taskDescription,
                                expiresAt: oneHourLater,
                                attachmentUrl: officeCopyPdfUrl || null
                            }
                        })
                    } else {
                        // Create new suggested task with doctorId
                        await prisma.task.create({
                            data: {
                                title: `Process prescription for ${patientData.firstName} ${patientData.lastName || ''}`,
                                description: taskDescription,
                                type: 'task',
                                status: 'pending',
                                isSuggested: true,
                                expiresAt: oneHourLater,
                                visitId: result.visit.id,
                                doctorId: doctorIdForTask, // Link task to the doctor
                                attachmentUrl: officeCopyPdfUrl || null
                            }
                        })
                    }
                } catch (taskError) {
                    // Log task creation error but don't fail the whole request
                    console.error('Error creating/updating task:', taskError)
                }
            }

            return res.status(201).json(fullVisit)
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
