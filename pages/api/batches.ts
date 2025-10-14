import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireStaffOrAbove } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Product batches restricted to staff and above
    const user = await requireStaffOrAbove(req, res)
    if (!user) return
    
    if (req.method === 'GET') {
        try {
            const items = await prisma.productBatch.findMany({ orderBy: { createdAt: 'desc' } })
            return res.status(200).json(items)
        } catch (err: any) {
            if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'POST') {
        const { productId, sku, quantity, purchasePriceCents, salePriceCents, expiry } = req.body
        try {
            const b = await prisma.productBatch.create({ data: { productId: Number(productId), sku, quantity: Number(quantity), purchasePriceCents: Number(purchasePriceCents), salePriceCents: Number(salePriceCents), expiry: expiry ? new Date(expiry) : null } })
            return res.status(201).json(b)
        } catch (err: any) {
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
