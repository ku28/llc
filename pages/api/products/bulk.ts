import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'
import { getDoctorIdForCreate } from '../../../lib/doctorUtils'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const user = await requireAuth(req, res)
        if (!user) return
        
        const { products, doctorId: requestDoctorId } = req.body

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: 'Invalid products array' })
        }

        // Get the effective doctorId (doctor's own ID, or admin's selected doctor)
        const doctorId = getDoctorIdForCreate(user, requestDoctorId)

        console.log(`[Bulk Create Products] Received ${products.length} products to import for doctor ID ${doctorId}`)

        try {
            // Step 1: Collect all unique category names
            const uniqueCategoryNames = new Set<string>()
            products.forEach((p: any) => {
                if (p.category && String(p.category).trim()) {
                    uniqueCategoryNames.add(String(p.category).trim())
                }
            })

            // Step 2: Bulk upsert all categories first
            const categoryMap = new Map<string, number>()
            if (uniqueCategoryNames.size > 0) {
                console.log(`[Bulk Create Products] Upserting ${uniqueCategoryNames.size} unique categories`)
                
                for (const categoryName of uniqueCategoryNames) {
                    const existingCategory = await prisma.category.upsert({
                        where: { 
                            name_doctorId: {
                                name: categoryName,
                                doctorId: doctorId
                            }
                        },
                        create: { 
                            name: categoryName,
                            doctorId: doctorId
                        },
                        update: {}
                    })
                    categoryMap.set(categoryName, existingCategory.id)
                }
            }

            // Step 3: Preload all existing products by name
            const allProductNames = products.map((p: any) => (p.name || '').trim()).filter((n: string) => n)
            const existingProducts = await prisma.product.findMany({
                where: {
                    name: {
                        in: allProductNames,
                        mode: 'insensitive'
                    }
                }
            })

            const existingByName: Record<string, any> = {}
            existingProducts.forEach((ep: any) => {
                if (ep && ep.name) existingByName[String(ep.name).toLowerCase()] = ep
            })

            console.log(`[Bulk Create Products] Found ${existingProducts.length} existing products`)

            // Step 4: Process products in larger batches
            const BATCH_SIZE = 100
            const results: any[] = []
            const errors: any[] = []
            
            const chunks = []
            for (let i = 0; i < products.length; i += BATCH_SIZE) {
                chunks.push(products.slice(i, i + BATCH_SIZE))
            }

            for (const chunk of chunks) {
                const chunkPromises = chunk.map(async (productData: any) => {
                    try {
                                const { name, priceRupees, quantity, purchasePriceRupees, unit, category,
                                    actualInventory, inventoryValue, latestUpdate,
                                    purchaseValue, salesValue, totalPurchased, totalSales } = productData

                                // Ensure unit is a string or null (Prisma expects String | Null)
                                const unitValue = unit === undefined || unit === null || unit === '' ? null : String(unit)

                                // Get categoryId from preloaded map
                                let categoryId: number | null = null
                                if (category && String(category).trim()) {
                                    categoryId = categoryMap.get(String(category).trim()) || null
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
                                    totalSales: totalSalesValue,
                                    doctorId: doctorId
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
