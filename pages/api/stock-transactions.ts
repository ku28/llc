import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireStaffOrAbove } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Stock transactions restricted to staff and above
    const user = await requireStaffOrAbove(req, res)
    if (!user) return
    
    if (req.method === 'GET') {
        try {
            const { productId, type, limit } = req.query

            const where: any = {}
            if (productId) where.productId = Number(productId)
            if (type) where.transactionType = type

            const transactions = await prisma.stockTransaction.findMany({
                where,
                orderBy: { transactionDate: 'desc' },
                take: limit ? Number(limit) : undefined,
                include: {
                    product: {
                        include: {
                            category: true
                        }
                    }
                }
            })
            
            return res.status(200).json(transactions)
        } catch (error) {
            console.error('Error fetching stock transactions:', error)
            return res.status(500).json({ error: 'Failed to fetch stock transactions' })
        }
    }

    if (req.method === 'POST') {
        try {
            const {
                productId,
                transactionType,
                quantity,
                unitPrice,
                notes,
                performedBy
            } = req.body

            // Get current product quantity
            const product = await prisma.product.findUnique({
                where: { id: Number(productId) }
            })

            if (!product) {
                return res.status(404).json({ error: 'Product not found' })
            }

            // Calculate new quantity based on transaction type
            let newQuantity = product.quantity
            if (transactionType === 'IN' || transactionType === 'RETURN') {
                newQuantity += Number(quantity)
            } else if (transactionType === 'OUT' || transactionType === 'ADJUSTMENT') {
                newQuantity -= Number(quantity)
            }

            // Ensure quantity doesn't go negative
            newQuantity = Math.max(0, newQuantity)

            // Create stock transaction
            const transaction = await prisma.stockTransaction.create({
                data: {
                    productId: Number(productId),
                    transactionType,
                    quantity: Number(quantity),
                    unitPrice: Number(unitPrice || 0),
                    totalValue: Number(quantity) * Number(unitPrice || 0),
                    balanceQuantity: newQuantity,
                    notes,
                    performedBy
                },
                include: {
                    product: true
                }
            })

            // Update product quantity
            await prisma.product.update({
                where: { id: Number(productId) },
                data: {
                    quantity: newQuantity,
                    latestUpdate: new Date()
                }
            })

            return res.status(201).json(transaction)
        } catch (error) {
            console.error('Error creating stock transaction:', error)
            return res.status(500).json({ error: 'Failed to create stock transaction' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
