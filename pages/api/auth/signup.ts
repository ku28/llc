import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendEmail, generateVerificationEmail } from '../../../lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { email, name, password, role } = req.body
    if (!email || !password || !role) return res.status(400).json({ error: 'Email, password, and role are required' })
    
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' })
        }

        // Check if there's already a pending registration
        const existingPending = await prisma.pendingUser.findUnique({ where: { email } })
        if (existingPending) {
            return res.status(400).json({ error: 'A verification request is already pending for this email' })
        }

        // Hash password
        const hash = await bcrypt.hash(password, 10)
        
        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex')
        
        // Calculate expiration (24 hours from now)
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        // Create pending user
        await prisma.pendingUser.create({
            data: {
                email,
                name,
                passwordHash: hash,
                role,
                verificationToken,
                expiresAt
            }
        })

        // Send verification email to admin
        const adminEmail = process.env.ADMIN_EMAIL || 'kushagrajuneja7@gmail.com'
        const emailHtml = generateVerificationEmail(name || 'Unknown', email, role, verificationToken)
        
        try {
            await sendEmail({
                to: adminEmail,
                subject: `🔔 New User Registration: ${name} (${role})`,
                html: emailHtml
            })
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError)
            // Delete the pending user if email fails
            await prisma.pendingUser.delete({ where: { email } })
            return res.status(500).json({ error: 'Failed to send verification email. Please try again later.' })
        }

        return res.status(201).json({ 
            message: 'Signup request submitted successfully. Your account will be activated once the administrator approves it.',
            pendingVerification: true
        })
    } catch (err: any) {
        console.error('Signup error:', err)
        return res.status(500).json({ error: String(err?.message || err) })
    }
}
