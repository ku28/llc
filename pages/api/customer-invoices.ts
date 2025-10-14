import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const invoices = await prisma.customerInvoice.findMany({
                orderBy: { invoiceDate: 'desc' },
                include: {
                    patient: true,
                    items: {
                        include: {
                            product: true
                        }
                    },
                    payments: true
                }
            })
            return res.status(200).json(invoices)
        } catch (error) {
            console.error('Error fetching invoices:', error)
            return res.status(500).json({ error: 'Failed to fetch invoices' })
        }
    }

    if (req.method === 'POST') {
        try {
            const {
                patientId,
                customerName,
                customerEmail,
                customerPhone,
                customerAddress,
                customerGSTIN,
                invoiceDate,
                dueDate,
                items,
                discount,
                paymentMethod,
                notes,
                termsAndConditions
            } = req.body

            // Generate Invoice Number
            const lastInvoice = await prisma.customerInvoice.findFirst({
                orderBy: { id: 'desc' }
            })
            const invoiceNumber = `INV-${String((lastInvoice?.id || 0) + 1).padStart(6, '0')}`

            // Calculate totals
            let subtotal = 0
            let taxAmount = 0

            const invoiceItems = items.map((item: any) => {
                const itemTotal = item.quantity * item.unitPrice
                const itemTax = itemTotal * (item.taxRate || 0) / 100
                const itemDiscount = item.discount || 0
                
                subtotal += itemTotal
                taxAmount += itemTax

                return {
                    productId: item.productId ? Number(item.productId) : null,
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    taxRate: Number(item.taxRate || 0),
                    discount: Number(itemDiscount),
                    totalAmount: Math.round(itemTotal + itemTax - itemDiscount)
                }
            })

            const totalAmount = Math.round(subtotal + taxAmount - (discount || 0))
            const balanceAmount = totalAmount

            const invoice = await prisma.customerInvoice.create({
                data: {
                    invoiceNumber,
                    patientId: patientId ? Number(patientId) : null,
                    customerName,
                    customerEmail,
                    customerPhone,
                    customerAddress,
                    customerGSTIN,
                    invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
                    dueDate: dueDate ? new Date(dueDate) : null,
                    subtotal: Math.round(subtotal),
                    taxAmount: Math.round(taxAmount),
                    discount: Math.round(discount || 0),
                    totalAmount,
                    balanceAmount,
                    paymentMethod,
                    notes,
                    termsAndConditions,
                    items: {
                        create: invoiceItems
                    }
                },
                include: {
                    patient: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            })

            // Update product stock for items sold
            for (const item of items) {
                if (item.productId) {
                    const product = await prisma.product.findUnique({
                        where: { id: Number(item.productId) }
                    })

                    if (product) {
                        const newQuantity = product.quantity - item.quantity
                        await prisma.product.update({
                            where: { id: Number(item.productId) },
                            data: {
                                quantity: Math.max(0, newQuantity),
                                totalSales: product.totalSales + item.quantity
                            }
                        })

                        // Create stock transaction
                        await prisma.stockTransaction.create({
                            data: {
                                productId: Number(item.productId),
                                transactionType: 'OUT',
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                totalValue: item.quantity * item.unitPrice,
                                balanceQuantity: Math.max(0, newQuantity),
                                referenceType: 'CustomerInvoice',
                                referenceId: invoice.id,
                                notes: `Sold via Invoice ${invoiceNumber}`
                            }
                        })
                    }
                }
            }

            return res.status(201).json(invoice)
        } catch (error) {
            console.error('Error creating invoice:', error)
            return res.status(500).json({ error: 'Failed to create invoice' })
        }
    }

    if (req.method === 'PUT') {
        try {
            const { id, status, paidAmount, paymentMethod } = req.body

            const invoice = await prisma.customerInvoice.findUnique({
                where: { id: Number(id) }
            })

            if (!invoice) {
                return res.status(404).json({ error: 'Invoice not found' })
            }

            const newPaidAmount = invoice.paidAmount + (paidAmount || 0)
            const newBalanceAmount = invoice.totalAmount - newPaidAmount
            const newStatus = newBalanceAmount === 0 ? 'paid' : newBalanceAmount < invoice.totalAmount ? 'partial' : 'unpaid'

            const updatedInvoice = await prisma.customerInvoice.update({
                where: { id: Number(id) },
                data: {
                    status: status || newStatus,
                    paidAmount: newPaidAmount,
                    balanceAmount: newBalanceAmount,
                    paymentMethod
                },
                include: {
                    patient: true,
                    items: {
                        include: {
                            product: true
                        }
                    },
                    payments: true
                }
            })

            // Create payment record if payment was made
            if (paidAmount > 0) {
                const paymentNumber = `PAY-${Date.now()}`
                await prisma.payment.create({
                    data: {
                        paymentNumber,
                        paymentType: 'RECEIVED',
                        referenceType: 'CustomerInvoice',
                        referenceId: Number(id),
                        amount: paidAmount,
                        paymentMethod: paymentMethod || 'CASH',
                        notes: `Payment for Invoice ${invoice.invoiceNumber}`
                    }
                })
            }

            return res.status(200).json(updatedInvoice)
        } catch (error) {
            console.error('Error updating invoice:', error)
            return res.status(500).json({ error: 'Failed to update invoice' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query

            await prisma.customerInvoice.delete({
                where: { id: Number(id) }
            })

            return res.status(200).json({ message: 'Invoice deleted successfully' })
        } catch (error) {
            console.error('Error deleting invoice:', error)
            return res.status(500).json({ error: 'Failed to delete invoice' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
