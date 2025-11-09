import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { products } = req.body

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: 'Invalid products array' })
        }

        console.log(`[Bulk Create Products] Received ${products.length} products to import`)

        try {
            const BATCH_SIZE = 50 // Increased for better performance
            const results: any[] = []
            const errors: any[] = []
            
            const chunks = []
            for (let i = 0; i < products.length; i += BATCH_SIZE) {
                chunks.push(products.slice(i, i + BATCH_SIZE))
            }

            for (const chunk of chunks) {
                const chunkPromises = chunk.map(async (productData: any) => {
                    try {
                        const { name, priceCents, quantity, purchasePriceCents, unit } = productData

                        return await prisma.product.create({
                            data: {
                                name,
                                priceCents: priceCents || 0,
                                quantity: quantity || 0,
                                purchasePriceCents: purchasePriceCents || 0,
                                unit: unit || null,
                            }
                        })
                    } catch (err: any) {
                        console.error(`[Bulk Create Products] Failed:`, err.message)
                        errors.push({
                            product: productData.name,
                            error: err.message
                        })
                        return null
                    }
                })

                const chunkResults = await Promise.all(chunkPromises)
                results.push(...chunkResults.filter(r => r !== null))
            }

            console.log(`[Bulk Create Products] Completed: ${results.length} successful, ${errors.length} errors`)

            return res.status(201).json({ 
                success: true, 
                count: results.length,
                errors: errors.length > 0 ? errors : undefined,
                message: errors.length > 0 
                    ? `Imported ${results.length} products with ${errors.length} errors` 
                    : `Successfully imported ${results.length} products`
            })
        } catch (error: any) {
            console.error('[Bulk Create Products] Error:', error)
            return res.status(500).json({ error: error.message || 'Failed to import products' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}

export default handler
