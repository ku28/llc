import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Expect array of { name, index }
        const { products } = req.body as { products: Array<{ name: string, index: number }> }

        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ error: 'Invalid request body' })
        }

        // Filter out products with no name
        const validProducts = products.filter(p => p.name && p.name.trim())

        if (validProducts.length === 0) {
            return res.status(200).json({
                duplicateIndices: [],
                uniqueIndices: products.map(p => p.index)
            })
        }

        // Extract names for batch query (case-insensitive)
        const names = validProducts.map(p => p.name.trim())

        // Single batch query to check for duplicates
        const existingProducts = await prisma.product.findMany({
            where: {
                name: {
                    in: names,
                    mode: 'insensitive'
                }
            },
            select: {
                name: true
            }
        })

        // Create set for O(1) lookup (lowercase for case-insensitive comparison)
        const existingNames = new Set(existingProducts.map((p: any) => p.name.toLowerCase()))

        // Check each product against existing records
        const duplicateIndices: number[] = []
        const uniqueIndices: number[] = []

        products.forEach(product => {
            if (!product.name || !product.name.trim()) {
                uniqueIndices.push(product.index)
                return
            }

            const isDuplicate = existingNames.has(product.name.toLowerCase())

            if (isDuplicate) {
                duplicateIndices.push(product.index)
            } else {
                uniqueIndices.push(product.index)
            }
        })

        return res.status(200).json({
            duplicateIndices,
            uniqueIndices
        })
    } catch (error: any) {
        console.error('Error checking product duplicates:', error)
        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
