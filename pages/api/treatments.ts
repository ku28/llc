import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireAuth } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const items = await prisma.treatment.findMany({ orderBy: { createdAt: 'desc' } })
            return res.status(200).json(items)
        } catch (err: any) {
            // If the table/column doesn't exist yet, return empty list so frontend can load
            if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'POST') {
        const user = await requireAuth(req, res)
        if(!user) return
        const { name, code, dosage, administration } = req.body
        try {
            const t = await prisma.treatment.create({ data: { name, code, dosage, administration } })
            return res.status(201).json(t)
        } catch (err: any) {
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
