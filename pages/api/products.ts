import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireStaffOrAbove } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Products restricted to staff and above (not reception)
    const user = await requireStaffOrAbove(req, res)
    if (!user) return
    
    if (req.method === 'GET') {
        try {
            const items = await prisma.product.findMany({
                include: {
                    category: true
                }
            })
            return res.status(200).json(items)
        } catch (err: any) {
            if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'POST') {
        const { name, categoryId, unit, priceRupees, purchasePriceRupees, totalPurchased, totalSales, quantity, actualInventory } = req.body
        try {
            const ratePerUnit = Number(priceRupees || 0)
            const purchase = Number(totalPurchased || quantity || 0)
            const sales = Number(totalSales || 0)
            const inventory = Number(quantity || 0)
            
            // INV/VAL = RATE/U × INVENTORY
            const inventoryValue = ratePerUnit * inventory
            
            // PUR/VAL = RATE/U × PURCHASE
            const purchaseValue = ratePerUnit * purchase
            
            // SALE/VAL = IF((RATE/U × SALES) = 0, "", RATE/U × SALES)
            const salesValue = (ratePerUnit * sales) === 0 ? 0 : (ratePerUnit * sales)
            
            const p = await prisma.product.create({ 
                data: { 
                    name,
                    categoryId: categoryId ? Number(categoryId) : null,
                    unit,
                    priceRupees: ratePerUnit,
                    purchasePriceRupees: Number(purchasePriceRupees || 0),
                    quantity: inventory,
                    actualInventory: actualInventory ? Number(actualInventory) : null,
                    inventoryValue: inventoryValue || null,
                    totalPurchased: purchase,
                    purchaseValue: purchaseValue || null,
                    totalSales: sales,
                    salesValue: salesValue || null
                },
                include: {
                    category: true
                }
            })
            return res.status(201).json(p)
        } catch (err: any) {
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'PUT') {
        const { id, name, categoryId, unit, priceRupees, purchasePriceRupees, totalPurchased, totalSales, quantity, actualInventory } = req.body
        try {
            const ratePerUnit = Number(priceRupees || 0)
            const purchase = Number(totalPurchased || 0)
            const sales = Number(totalSales || 0)
            const inventory = Number(quantity || 0)
            
            // INV/VAL = RATE/U × INVENTORY
            const inventoryValue = ratePerUnit * inventory
            
            // PUR/VAL = RATE/U × PURCHASE
            const purchaseValue = ratePerUnit * purchase
            
            // SALE/VAL = IF((RATE/U × SALES) = 0, "", RATE/U × SALES)
            const salesValue = (ratePerUnit * sales) === 0 ? 0 : (ratePerUnit * sales)
            
            const p = await prisma.product.update({
                where: { id: Number(id) },
                data: {
                    name,
                    categoryId: categoryId ? Number(categoryId) : null,
                    unit,
                    priceRupees: ratePerUnit,
                    purchasePriceRupees: Number(purchasePriceRupees || 0),
                    totalPurchased: purchase,
                    totalSales: sales,
                    quantity: inventory,
                    actualInventory: actualInventory ? Number(actualInventory) : null,
                    inventoryValue: inventoryValue || null,
                    purchaseValue: purchaseValue || null,
                    salesValue: salesValue || null
                },
                include: {
                    category: true
                }
            })
            return res.status(200).json(p)
        } catch (err: any) {
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'DELETE') {
        const { id, ids } = req.body
        try {
            if (ids && Array.isArray(ids)) {
                // Bulk delete
                await prisma.product.deleteMany({
                    where: {
                        id: { in: ids.map((id: any) => Number(id)) }
                    }
                })
                return res.status(200).json({ success: true, count: ids.length })
            } else if (id) {
                // Single delete
                await prisma.product.delete({
                    where: { id: Number(id) }
                })
                return res.status(200).json({ success: true })
            } else {
                return res.status(400).json({ error: 'Missing id or ids' })
            }
        } catch (err: any) {
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}

