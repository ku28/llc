import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export const config = {
    api: {
        responseLimit: false,
    },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    let cancelled = false
    
    // Handle client disconnect
    const cancelHandler = () => {
        if (!cancelled) {
            cancelled = true
            console.log('Client disconnected - cancelling invoice generation')
        }
    }
    
    req.on('close', cancelHandler)
    req.on('error', cancelHandler)

    try {
        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        // Send immediate initializing status
        res.write(`data: ${JSON.stringify({ type: 'progress', current: 0, total: 0 })}\n\n`)
        // @ts-ignore - Next.js streaming support
        if (typeof res.flush === 'function') res.flush()

        // Load data in parallel for faster initialization
        const [visits, allProducts, existingInvoices, lastInvoice] = await Promise.all([
            // Get all visits - only IDs initially for faster duplicate checking
            prisma.visit.findMany({
                select: {
                    id: true,
                    patientId: true,
                    date: true,
                    amount: true,
                    phone: true,
                    address: true,
                    opdNo: true
                },
                orderBy: { date: 'asc' }
            }),
            // Pre-load all products for faster lookup
            prisma.product.findMany(),
            // Get existing invoices to check duplicates - only notes field
            prisma.customerInvoice.findMany({
                select: {
                    notes: true
                }
            }),
            // Get last invoice number
            prisma.customerInvoice.findFirst({
                select: { id: true },
                orderBy: { id: 'desc' }
            })
        ])

        const productMap = new Map(allProducts.map((p: any) => [p.id, p]))

        // Fast duplicate detection - create set of invoiced visit IDs
        const invoicedVisitIds = new Set<number>()
        for (const inv of existingInvoices) {
            const match = inv.notes?.match(/visit ID: (\d+)/)
            if (match) {
                invoicedVisitIds.add(parseInt(match[1]))
            }
        }

        // Count visits that need invoices (not duplicates)
        const visitsToProcess = visits.filter((v: any) => !invoicedVisitIds.has(v.id))
        const totalVisits = visits.length
        const alreadyInvoiced = totalVisits - visitsToProcess.length

        const invoicesCreated: any[] = []
        const errors: any[] = []
        let processed = alreadyInvoiced // Start with already invoiced count

        // Send progress with totals including already invoiced
        res.write(`data: ${JSON.stringify({ 
            type: 'progress', 
            current: alreadyInvoiced, 
            total: totalVisits,
            created: 0,
            skipped: alreadyInvoiced,
            errors: 0
        })}\n\n`)
        // @ts-ignore - Next.js streaming support
        if (typeof res.flush === 'function') res.flush()

        let invoiceCounter = (lastInvoice?.id || 0) + 1

        // Process visits in optimized batches
        const BATCH_SIZE = 100
        
        for (let i = 0; i < visitsToProcess.length; i += BATCH_SIZE) {
            // Check cancellation before each batch
            if (cancelled) {
                console.log('Cancellation detected at batch start')
                res.write(`data: ${JSON.stringify({ type: 'cancelled' })}\n\n`)
                // @ts-ignore
                if (typeof res.flush === 'function') res.flush()
                res.end()
                return
            }

            const batchIds = visitsToProcess.slice(i, Math.min(i + BATCH_SIZE, visitsToProcess.length)).map((v: any) => v.id)
            
            // Load full visit data for this batch only
            const batchVisits = await prisma.visit.findMany({
                where: { id: { in: batchIds } },
                include: {
                    patient: true,
                    prescriptions: {
                        include: {
                            product: true
                        }
                    }
                }
            })
            
            // Prepare all invoices in this batch
            const invoicesToCreate: any[] = []
            const batchVisitData: any[] = []
            
            for (const visit of batchVisits) {
                if (cancelled) break

                try {
                    // Basic validation - no need to check duplicates again
                    if (!visit || !visit.id) {
                        processed++
                        continue
                    }

                    // Prepare customer information
                    const customerName = visit.patient 
                        ? `${visit.patient.firstName || ''} ${visit.patient.lastName || ''}`.trim()
                        : 'Walk-in Customer'
                    
                    const customerPhone = visit.patient?.phone || visit.phone || ''
                    const customerEmail = visit.patient?.email || ''
                    const customerAddress = visit.patient?.address || visit.address || ''

                    // Prepare invoice items from prescriptions
                    const items: any[] = []
                    
                    if (visit.prescriptions && visit.prescriptions.length > 0) {
                        for (const prescription of visit.prescriptions) {
                            if (prescription.product && prescription.quantity > 0) {
                                const quantity = Math.abs(prescription.quantity || 1)
                                const unitPrice = Math.abs(prescription.product.priceRupees || 0)
                                
                                if (unitPrice > 0) {
                                    items.push({
                                        productId: prescription.product.id,
                                        description: prescription.product.name || 'Product',
                                        quantity: quantity,
                                        unitPrice: unitPrice,
                                        taxRate: 0,
                                        discount: 0
                                    })
                                }
                            }
                        }
                    }

                    // If no prescription items but visit has amount, add consultation fee
                    if (items.length === 0 && visit.amount && visit.amount > 0) {
                        const consultationFee = Math.abs(visit.amount)
                        if (consultationFee > 0) {
                            items.push({
                                productId: null,
                                description: 'Consultation Fee',
                                quantity: 1,
                                unitPrice: consultationFee,
                                taxRate: 0,
                                discount: 0
                            })
                        }
                    }

                    // Skip if no items
                    if (items.length === 0) {
                        processed++
                        continue
                    }

                    // Generate Invoice Number
                    const invoiceNumber = `INV-${String(invoiceCounter++).padStart(6, '0')}`

                    // Calculate totals
                    let subtotal = 0
                    let taxAmount = 0

                    const invoiceItems = items.map((item: any) => {
                        const itemTotal = item.quantity * item.unitPrice
                        const itemTax = itemTotal * (item.taxRate || 0) / 100
                        
                        subtotal += itemTotal
                        taxAmount += itemTax

                        return {
                            productId: item.productId,
                            description: item.description,
                            quantity: Number(item.quantity),
                            unitPrice: parseFloat(item.unitPrice.toFixed(2)),
                            taxRate: parseFloat((item.taxRate || 0).toFixed(2)),
                            discount: 0,
                            totalAmount: parseFloat((itemTotal + itemTax).toFixed(2))
                        }
                    })

                    const totalAmount = Math.round(subtotal + taxAmount)

                    invoicesToCreate.push({
                        invoiceNumber,
                        patientId: visit.patientId,
                        customerName,
                        customerEmail,
                        customerPhone,
                        customerAddress,
                        customerGSTIN: null,
                        invoiceDate: visit.date,
                        dueDate: null,
                        subtotal: Math.round(subtotal),
                        taxAmount: Math.round(taxAmount),
                        discount: 0,
                        totalAmount,
                        balanceAmount: 0,  // Set to 0 for paid invoices
                        paidAmount: totalAmount,  // Set paidAmount to totalAmount for paid status
                        status: 'paid',  // Set status to paid
                        paymentMethod: 'CASH',  // Set default payment method
                        notes: `Auto-generated from visit on ${new Date(visit.date).toLocaleDateString()} (visit ID: ${visit.id})`,
                        termsAndConditions: 'Payment due within 30 days.',
                        items: invoiceItems,
                        originalItems: items,
                        visitId: visit.id,
                        opdNo: visit.opdNo
                    })
                    
                    batchVisitData.push({ visit, items, invoiceNumber, customerName, totalAmount })
                    
                } catch (error: any) {
                    console.error('Error preparing visit:', visit?.id, error)
                    errors.push({
                        visitId: visit?.id,
                        opdNo: visit?.opdNo,
                        error: error.message || 'Unknown error',
                        customerName: visit.patient ? `${visit.patient.firstName || ''} ${visit.patient.lastName || ''}`.trim() : 'Unknown'
                    })
                }
            }

            // Check cancellation before creating invoices
            if (cancelled) break

            // Create all invoices in this batch with optimized product handling
            if (invoicesToCreate.length > 0) {
                // Aggregate all product updates across the entire batch to avoid deadlocks
                const batchProductUpdates: Map<number, { quantity: number, sales: number, invoices: any[] }> = new Map()
                
                for (const invoiceData of invoicesToCreate) {
                    for (const item of invoiceData.originalItems) {
                        if (item.productId) {
                            const existing = batchProductUpdates.get(item.productId) || { quantity: 0, sales: 0, invoices: [] }
                            batchProductUpdates.set(item.productId, {
                                quantity: existing.quantity + item.quantity,
                                sales: existing.sales + item.quantity,
                                invoices: [...existing.invoices, { invoiceData, item }]
                            })
                        }
                    }
                }

                // Process each invoice in separate smaller transactions to avoid deadlocks
                for (const invoiceData of invoicesToCreate) {
                    // Check cancellation before each invoice
                    if (cancelled) {
                        console.log('Cancellation detected - stopping invoice creation')
                        break
                    }
                    
                    try {
                        const { items, originalItems, visitId, opdNo, ...invoiceFields } = invoiceData
                        
                        const newInvoice = await prisma.$transaction(async (tx: any) => {
                            // Create invoice with items
                            const invoice = await tx.customerInvoice.create({
                                data: {
                                    ...invoiceFields,
                                    items: {
                                        create: items
                                    }
                                }
                            })

                            // Create stock transactions for this invoice
                            const stockTransactions = originalItems
                                .filter((item: any) => item.productId)
                                .map((item: any) => {
                                    const product: any = productMap.get(item.productId)
                                    if (!product) return null
                                    
                                    const newQuantity = Math.max(0, product.quantity - item.quantity)
                                    
                                    return tx.stockTransaction.create({
                                        data: {
                                            productId: item.productId,
                                            transactionType: 'OUT',
                                            quantity: item.quantity,
                                            unitPrice: item.unitPrice,
                                            totalValue: item.quantity * item.unitPrice,
                                            balanceQuantity: newQuantity,
                                            referenceType: 'CustomerInvoice',
                                            referenceId: invoice.id,
                                            notes: `Auto-generated - Invoice ${invoiceFields.invoiceNumber}`
                                        }
                                    })
                                })
                                .filter(Boolean)

                            await Promise.all(stockTransactions)

                            return invoice
                        }, {
                            maxWait: 5000,
                            timeout: 15000
                        })

                        // Track success
                        invoicedVisitIds.add(visitId)
                        invoicesCreated.push({
                            status: 'created',
                            invoiceId: newInvoice.id,
                            invoiceNumber: invoiceFields.invoiceNumber,
                            visitId,
                            opdNo,
                            customerName: invoiceFields.customerName,
                            totalAmount: invoiceFields.totalAmount
                        })
                        processed++
                        
                    } catch (error: any) {
                        console.error('Error creating invoice for visit:', invoiceData.visitId, error)
                        errors.push({
                            visitId: invoiceData.visitId,
                            opdNo: invoiceData.opdNo,
                            error: error.message || 'Failed to create invoice',
                            customerName: invoiceData.customerName
                        })
                    }
                }

                // Check cancellation after invoice creation loop
                if (cancelled) {
                    console.log('Cancellation detected - skipping product updates')
                    break
                }

                // Update all products in a single transaction at the end of the batch
                if (batchProductUpdates.size > 0 && !cancelled) {
                    try {
                        await prisma.$transaction(async (tx: any) => {
                            const productUpdatePromises = Array.from(batchProductUpdates.entries()).map(async ([productId, updates]) => {
                                const product: any = productMap.get(productId)
                                if (!product) return

                                const newQuantity = Math.max(0, product.quantity - updates.quantity)
                                
                                await tx.product.update({
                                    where: { id: productId },
                                    data: {
                                        quantity: newQuantity,
                                        totalSales: product.totalSales + updates.sales
                                    }
                                })
                                
                                // Update in-memory map for next batch
                                product.quantity = newQuantity
                            })

                            await Promise.all(productUpdatePromises)
                        }, {
                            maxWait: 10000,
                            timeout: 30000
                        })
                    } catch (error: any) {
                        console.error('Error updating product quantities:', error)
                        // Non-critical error - invoices are already created
                    }
                }
            }

            // Final cancellation check after batch processing
            if (cancelled) {
                console.log('Cancellation detected - ending generation')
                res.write(`data: ${JSON.stringify({ type: 'cancelled' })}\n\n`)
                res.end()
                return
            }

            // Send progress update after each batch
            const currentProcessed = Math.min(processed, totalVisits)
            res.write(`data: ${JSON.stringify({ 
                type: 'progress', 
                current: currentProcessed, 
                total: totalVisits,
                created: invoicesCreated.length,
                skipped: alreadyInvoiced + (currentProcessed - invoicesCreated.length - errors.length),
                errors: errors.length
            })}\n\n`)
            // @ts-ignore - Next.js streaming support
            if (typeof res.flush === 'function') res.flush()
        }

        // Send final result
        res.write(`data: ${JSON.stringify({
            type: 'complete',
            success: true,
            message: `Created ${invoicesCreated.length} invoices from visits`,
            invoicesCreated,
            errors,
            total: totalVisits,
            created: invoicesCreated.length,
            skipped: alreadyInvoiced + (totalVisits - invoicesCreated.length - errors.length),
            failed: errors.length
        })}\n\n`)

        res.end()

    } catch (error: any) {
        console.error('Generate invoices error:', error)
        res.write(`data: ${JSON.stringify({
            type: 'error',
            error: error.message || 'Failed to generate invoices'
        })}\n\n`)
        res.end()
    }
}
