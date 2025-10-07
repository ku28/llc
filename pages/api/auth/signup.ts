import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { createSessionToken, setSessionCookie } from '../../../lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { email, name, password, role } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const allowed = ['admin', 'staff', 'user']
    const chosenRole = typeof role === 'string' && allowed.includes(role) ? role : 'staff'
    try {
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.upsert({ where: { email }, update: { name, passwordHash: hash }, create: { email, name, role: chosenRole, passwordHash: hash } })
        const token = createSessionToken({ sub: user.id })
        setSessionCookie(res, token)
        return res.status(201).json({ user })
    } catch (err: any) {
        return res.status(500).json({ error: String(err?.message || err) })
    }
}
