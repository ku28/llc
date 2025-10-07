import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const items = await prisma.product.findMany()
            return res.status(200).json(items)
        } catch (err: any) {
            if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'POST') {
        const { name, sku, priceCents, quantity } = req.body
        try {
            const p = await prisma.product.create({ data: { name, sku, priceCents: Number(priceCents || 0), quantity: Number(quantity || 0) } })
            return res.status(201).json(p)
        } catch (err: any) {
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
