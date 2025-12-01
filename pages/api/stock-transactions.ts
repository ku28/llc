import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireStaffOrAbove } from '../../lib/auth'
import { getDoctorFilter } from '../../lib/doctorUtils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Stock transactions restricted to staff and above
    const user = await requireStaffOrAbove(req, res)
    if (!user) return
    
    if (req.method === 'GET') {
        try {
            const { productId, type, limit, doctorId } = req.query

            const where: any = {}
            if (productId) where.productId = Number(productId)
            if (type) where.transactionType = type
            
            // Filter by doctor through product relationship
            if (doctorId || user.role === 'doctor') {
                const selectedDoctorId = doctorId ? Number(doctorId) : undefined
                const doctorFilter = getDoctorFilter(user, selectedDoctorId)
                where.product = doctorFilter
            }

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

    if (req.method === 'DELETE') {
        try {
            const { id, ids } = req.body
            
            if (ids && Array.isArray(ids)) {
                // Bulk delete
                await prisma.stockTransaction.deleteMany({
                    where: {
                        id: { in: ids.map((i: any) => Number(i)) }
                    }
                })
                return res.status(200).json({ message: `Deleted ${ids.length} transactions` })
            } else if (id) {
                // Single delete
                await prisma.stockTransaction.delete({
                    where: { id: Number(id) }
                })
                return res.status(200).json({ message: 'Transaction deleted successfully' })
            } else {
                return res.status(400).json({ error: 'Missing id or ids parameter' })
            }
        } catch (error) {
            console.error('Error deleting stock transaction:', error)
            return res.status(500).json({ error: 'Failed to delete stock transaction' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
