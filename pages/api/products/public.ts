import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            // Get all products with necessary fields for analytics
            const products = await prisma.product.findMany({
                select: {
                    id: true,
                    name: true,
                    quantity: true,
                    priceRupees: true,
                    totalSales: true,
                    unit: true,
                    category: {
                        select: {
                            id: true,
                            name: true,
                            reorderLevel: true
                        }
                    }
                },
                orderBy: {
                    id: 'desc'
                }
            })

            // Calculate total sales from invoice items (approximate sales metric)
            const invoiceItems = await prisma.customerInvoiceItem.groupBy({
                by: ['productId'],
                _sum: {
                    quantity: true
                }
            })

            // Create a map of productId to total sales quantity
            const salesMap = new Map()
            invoiceItems.forEach((item: any) => {
                if (item.productId) {
                    salesMap.set(item.productId, item._sum.quantity || 0)
                }
            })

            // Add totalSales to products
            const productsWithSales = products.map((product: any) => ({
                ...product,
                totalSales: salesMap.get(product.id) || 0
            }))

            return res.status(200).json(productsWithSales)
        } catch (err: any) {
            console.error('Public products error:', err)
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
