import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { createSessionToken, setSessionCookie } from '../../../lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { emailOrPhone, password, email: legacyEmail } = req.body
    
    // Support both old 'email' and new 'emailOrPhone' parameter for backwards compatibility
    const identifier = emailOrPhone || legacyEmail
    
    if (!identifier || !password) return res.status(400).json({ error: 'Email/phone and password required' })
    
    // Determine if input is email or phone
    const isEmail = identifier.includes('@')
    const isPhone = /^\d{10}$/.test(identifier)
    
    // Find user by email or phone
    const user = await prisma.user.findFirst({
        where: isEmail 
            ? { email: identifier }
            : isPhone 
                ? { phone: identifier }
                : { email: identifier } // Fallback to email for backwards compatibility
    })
    
    if (!user) return res.status(401).json({ error: 'User not found' })
    if (!user.passwordHash) return res.status(401).json({ error: 'User has no password set' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = createSessionToken({ sub: user.id })
    setSessionCookie(res, token)
    return res.status(200).json({ ok: true })
}
