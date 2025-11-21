import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query

    if (req.method === 'PUT') {
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
                notes,
                termsAndConditions
            } = req.body

            // Get existing invoice
            const existingInvoice = await prisma.customerInvoice.findUnique({
                where: { id: Number(id) },
                include: { items: true }
            })

            if (!existingInvoice) {
                return res.status(404).json({ error: 'Invoice not found' })
            }

            // Restore stock for old items before deleting them
            for (const oldItem of existingInvoice.items) {
                if (oldItem.productId) {
                    const product = await prisma.product.findUnique({
                        where: { id: oldItem.productId }
                    })

                    if (product) {
                        await prisma.product.update({
                            where: { id: oldItem.productId },
                            data: {
                                quantity: product.quantity + oldItem.quantity,
                                totalSales: Math.max(0, product.totalSales - oldItem.quantity)
                            }
                        })
                    }
                }
            }

            // Delete old items
            await prisma.customerInvoiceItem.deleteMany({
                where: { customerInvoiceId: Number(id) }
            })

            // Delete old stock transactions
            await prisma.stockTransaction.deleteMany({
                where: {
                    referenceType: 'CustomerInvoice',
                    referenceId: Number(id)
                }
            })

            // Calculate new totals
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
            const balanceAmount = totalAmount - existingInvoice.paidAmount

            // Update invoice
            const invoice = await prisma.customerInvoice.update({
                where: { id: Number(id) },
                data: {
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

            // Update product stock for new items
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

                        // Create new stock transaction
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
                                notes: `Sold via Invoice ${existingInvoice.invoiceNumber} (Updated)`
                            }
                        })
                    }
                }
            }

            return res.status(200).json(invoice)
        } catch (error) {
            console.error('Error updating invoice:', error)
            return res.status(500).json({ error: 'Failed to update invoice' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            // Get invoice with items to restore stock
            const invoice = await prisma.customerInvoice.findUnique({
                where: { id: Number(id) },
                include: { items: true }
            })

            if (!invoice) {
                return res.status(404).json({ error: 'Invoice not found' })
            }

            // Restore stock for deleted items
            for (const item of invoice.items) {
                if (item.productId) {
                    const product = await prisma.product.findUnique({
                        where: { id: item.productId }
                    })

                    if (product) {
                        await prisma.product.update({
                            where: { id: item.productId },
                            data: {
                                quantity: product.quantity + item.quantity,
                                totalSales: Math.max(0, product.totalSales - item.quantity)
                            }
                        })
                    }
                }
            }

            // Delete stock transactions
            await prisma.stockTransaction.deleteMany({
                where: {
                    referenceType: 'CustomerInvoice',
                    referenceId: Number(id)
                }
            })

            // Delete invoice (cascade will delete items)
            try {
                await prisma.customerInvoice.delete({
                    where: { id: Number(id) }
                })
            } catch (deleteError: any) {
                // If invoice was already deleted or doesn't exist, that's fine
                if (deleteError.code === 'P2025') {
                    console.log('Invoice already deleted or does not exist')
                } else {
                    throw deleteError
                }
            }

            return res.status(200).json({ message: 'Invoice deleted successfully' })
        } catch (error: any) {
            console.error('Error deleting invoice:', error)
            // If the error is that the record doesn't exist, return 404
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Invoice not found' })
            }
            return res.status(500).json({ error: 'Failed to delete invoice' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
