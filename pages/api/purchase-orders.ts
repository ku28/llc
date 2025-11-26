import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireStaffOrAbove } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Purchase orders restricted to staff and above
    const user = await requireStaffOrAbove(req, res)
    if (!user) return
    
    if (req.method === 'GET') {
        try {
            const purchaseOrders = await prisma.purchaseOrder.findMany({
                orderBy: { orderDate: 'desc' },
                include: {
                    supplier: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            })
            return res.status(200).json(purchaseOrders)
        } catch (error) {
            console.error('Error fetching purchase orders:', error)
            return res.status(500).json({ error: 'Failed to fetch purchase orders' })
        }
    }

    if (req.method === 'POST') {
        try {
            const {
                supplierId,
                orderDate,
                expectedDate,
                items,
                notes,
                shippingCost,
                discount
            } = req.body

            // Generate PO Number
            const lastPO = await prisma.purchaseOrder.findFirst({
                orderBy: { id: 'desc' }
            })
            const poNumber = `PO-${String((lastPO?.id || 0) + 1).padStart(6, '0')}`

            // Calculate totals
            let subtotal = 0
            let taxAmount = 0

            const orderItems = items.map((item: any) => {
                const itemTotal = item.quantity * item.unitPrice
                const itemTax = itemTotal * (item.taxRate || 0) / 100
                const itemDiscount = item.discount || 0
                
                subtotal += itemTotal
                taxAmount += itemTax

                return {
                    productId: Number(item.productId),
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    taxRate: Number(item.taxRate || 0),
                    discount: Number(itemDiscount),
                    totalAmount: Math.round(itemTotal + itemTax - itemDiscount)
                }
            })

            const totalAmount = Math.round(subtotal + taxAmount + (shippingCost || 0) - (discount || 0))

            const purchaseOrder = await prisma.purchaseOrder.create({
                data: {
                    poNumber,
                    supplierId: Number(supplierId),
                    orderDate: orderDate ? new Date(orderDate) : new Date(),
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    subtotal: Math.round(subtotal),
                    taxAmount: Math.round(taxAmount),
                    discount: Math.round(discount || 0),
                    shippingCost: Math.round(shippingCost || 0),
                    totalAmount,
                    notes,
                    items: {
                        create: orderItems
                    }
                },
                include: {
                    supplier: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            })

            return res.status(201).json(purchaseOrder)
        } catch (error) {
            console.error('Error creating purchase order:', error)
            return res.status(500).json({ error: 'Failed to create purchase order' })
        }
    }

    if (req.method === 'PUT') {
        try {
            const { id, status, receivedDate, items, billUrl } = req.body

            // If receiving goods, update stock
            if (status === 'received' && items) {
                for (const item of items) {
                    if (item.receivedQuantity > 0 && item.productId) {
                        // Update product quantity
                        const product = await prisma.product.findUnique({
                            where: { id: Number(item.productId) }
                        })

                        if (product) {
                            const newQuantity = product.quantity + item.receivedQuantity
                            await prisma.product.update({
                                where: { id: Number(item.productId) },
                                data: {
                                    quantity: newQuantity,
                                    totalPurchased: product.totalPurchased + item.receivedQuantity
                                }
                            })

                            // Create stock transaction
                            await prisma.stockTransaction.create({
                                data: {
                                    productId: Number(item.productId),
                                    transactionType: 'IN',
                                    quantity: item.receivedQuantity,
                                    unitPrice: item.unitPrice,
                                    totalValue: item.receivedQuantity * item.unitPrice,
                                    balanceQuantity: newQuantity,
                                    referenceType: 'PurchaseOrder',
                                    referenceId: Number(id),
                                    notes: `Received from PO #${id}`
                                }
                            })
                        }

                        // Update purchase order item
                        await prisma.purchaseOrderItem.update({
                            where: { id: item.id },
                            data: { receivedQuantity: item.receivedQuantity }
                        })
                    }
                }
            }

            const updateData: any = {}
            if (status !== undefined) updateData.status = status
            if (receivedDate !== undefined) updateData.receivedDate = receivedDate ? new Date(receivedDate) : null
            if (billUrl !== undefined) updateData.billUrl = billUrl

            const purchaseOrder = await prisma.purchaseOrder.update({
                where: { id: Number(id) },
                data: updateData,
                include: {
                    supplier: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            })

            return res.status(200).json(purchaseOrder)
        } catch (error) {
            console.error('Error updating purchase order:', error)
            return res.status(500).json({ error: 'Failed to update purchase order' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query

            await prisma.purchaseOrder.delete({
                where: { id: Number(id) }
            })

            return res.status(200).json({ message: 'Purchase order deleted successfully' })
        } catch (error) {
            console.error('Error deleting purchase order:', error)
            return res.status(500).json({ error: 'Failed to delete purchase order' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
