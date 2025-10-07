import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireAuth } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const items = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
            return res.status(200).json(items)
        } catch (err: any) {
            if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'POST') {
        const { email, name, role } = req.body
        try {
            const u = await prisma.user.upsert({ where: { email }, update: { name, role }, create: { email, name, role } })
            return res.status(201).json(u)
        } catch (err: any) {
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'PUT') {
        const authUser = await requireAuth(req, res)
        if (!authUser) return
        if (authUser.role !== 'admin') return res.status(403).json({ error: 'Admin required' })
        const { id, role } = req.body
        try {
            const u = await prisma.user.update({ where: { id: Number(id) }, data: { role } })
            return res.status(200).json(u)
        } catch (err: any) {
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
