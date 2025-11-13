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
                // Preload existing products for this chunk by name (case-insensitive)
                const namesInChunk = chunk.map((p: any) => (p.name || '').trim()).filter((n: string) => n)
                const existingProducts = await prisma.product.findMany({
                    where: {
                        name: {
                            in: namesInChunk,
                            mode: 'insensitive'
                        }
                    }
                })

                // Map existing products by lowercased name for quick lookup
                const existingByName: Record<string, any> = {}
                existingProducts.forEach((ep: any) => {
                    if (ep && ep.name) existingByName[String(ep.name).toLowerCase()] = ep
                })

                const chunkPromises = chunk.map(async (productData: any) => {
                    try {
                                const { name, priceRupees, quantity, purchasePriceRupees, unit, category,
                                    actualInventory, inventoryValue, latestUpdate,
                                    purchaseValue, salesValue, totalPurchased, totalSales } = productData

                                // Ensure unit is a string or null (Prisma expects String | Null)
                                const unitValue = unit === undefined || unit === null || unit === '' ? null : String(unit)

                                // Handle category - find or create by name
                                let categoryId: number | null = null
                                if (category && String(category).trim()) {
                                    const categoryName = String(category).trim()
                                    let existingCategory = await prisma.category.findFirst({
                                        where: {
                                            name: {
                                                equals: categoryName,
                                                mode: 'insensitive'
                                            }
                                        }
                                    })
                                    if (!existingCategory) {
                                        existingCategory = await prisma.category.create({
                                            data: { name: categoryName }
                                        })
                                    }
                                    categoryId = existingCategory.id
                                }

                                // Parse/normalize numeric fields
                                const priceRupeesValue = Number(priceRupees) || 0
                                const quantityValue = Number(quantity) || 0
                                const purchasePriceRupeesValue = Number(purchasePriceRupees) || 0
                                const actualInventoryValue = actualInventory !== undefined && actualInventory !== null ? Number(actualInventory) : undefined
                                const inventoryValueFloat = inventoryValue !== undefined && inventoryValue !== null ? Number(inventoryValue) : undefined
                                const purchaseValueFloat = purchaseValue !== undefined && purchaseValue !== null ? Number(purchaseValue) : undefined
                                const salesValueFloat = salesValue !== undefined && salesValue !== null ? Number(salesValue) : undefined
                                const totalPurchasedValue = totalPurchased !== undefined && totalPurchased !== null ? Number(totalPurchased) : undefined
                                const totalSalesValue = totalSales !== undefined && totalSales !== null ? Number(totalSales) : undefined

                                // Parse latestUpdate to Date if provided
                                let latestUpdateValue: Date | undefined = undefined
                                if (latestUpdate !== undefined && latestUpdate !== null && String(latestUpdate).trim() !== '') {
                                    const d = new Date(String(latestUpdate))
                                    if (!isNaN(d.getTime())) latestUpdateValue = d
                                }

                                const lowerName = String(name || '').trim().toLowerCase()
                                const existing = existingByName[lowerName]

                                const data = {
                                    name,
                                    priceRupees: priceRupeesValue,
                                    quantity: quantityValue,
                                    purchasePriceRupees: purchasePriceRupeesValue,
                                    unit: unitValue,
                                    categoryId,
                                    actualInventory: actualInventoryValue,
                                    inventoryValue: inventoryValueFloat,
                                    latestUpdate: latestUpdateValue,
                                    purchaseValue: purchaseValueFloat,
                                    salesValue: salesValueFloat,
                                    totalPurchased: totalPurchasedValue,
                                    totalSales: totalSalesValue
                                }

                                if (existing) {
                                    // Update existing product (overwrite with incoming data)
                                    return await prisma.product.update({
                                        where: { id: existing.id },
                                        data
                                    })
                                } else {
                                    // Create new product
                                    return await prisma.product.create({ data })
                                }
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
