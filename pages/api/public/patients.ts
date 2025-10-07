import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { firstName, lastName, phone } = req.body
    if (!firstName || !lastName) return res.status(400).json({ error: 'Missing fields' })
    try {
        const p = await prisma.patient.create({ data: { firstName, lastName, phone } })
        return res.status(201).json(p)
    } catch (err: any) { return res.status(500).json({ error: String(err?.message || err) }) }
}
