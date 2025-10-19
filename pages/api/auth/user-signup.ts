import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { emailOrPhone, name, password, otp } = req.body
    
    if (!emailOrPhone || !password || !name || !otp) {
        return res.status(400).json({ error: 'All fields including OTP are required' })
    }
    
    try {
        // Determine if input is email or phone
        const isEmail = emailOrPhone.includes('@')
        const isPhone = /^\d{10}$/.test(emailOrPhone)
        
        if (!isEmail && !isPhone) {
            return res.status(400).json({ error: 'Please enter a valid email address or 10-digit phone number' })
        }

        // Verify OTP from database
        const storedOTP = await prisma.oTP.findUnique({
            where: { identifier: emailOrPhone }
        })
        
        console.log(`🔍 Verifying OTP for ${emailOrPhone}`);
        console.log(`📦 Stored OTP from DB:`, storedOTP);
        console.log(`📝 Entered OTP:`, otp);
        
        if (!storedOTP) {
            return res.status(400).json({ error: 'OTP not found or expired. Please request a new OTP.' })
        }

        const now = new Date();
        console.log(`⏰ Current time: ${now.toLocaleTimeString()}`);
        console.log(`⏰ OTP expires at: ${storedOTP.expiresAt.toLocaleTimeString()}`);
        console.log(`⏰ Is expired? ${now > storedOTP.expiresAt}`);

        if (now > storedOTP.expiresAt) {
            // Delete expired OTP
            await prisma.oTP.delete({
                where: { identifier: emailOrPhone }
            })
            return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' })
        }

        if (storedOTP.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Please try again.' })
        }

        console.log(`✅ OTP verified successfully for ${emailOrPhone}`);

        // OTP verified, delete it from database
        await prisma.oTP.delete({
            where: { identifier: emailOrPhone }
        })

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: isEmail 
                ? { email: emailOrPhone }
                : { phone: emailOrPhone }
        })
        
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email/phone' })
        }

        // Hash password
        const hash = await bcrypt.hash(password, 10)

        // Create user directly (no verification needed)
        const user = await prisma.user.create({
            data: {
                ...(isEmail ? { email: emailOrPhone } : { phone: emailOrPhone }),
                name,
                passwordHash: hash,
                role: 'user', // Patient role for public signups
                verified: true // Auto-verify user signups
            }
        })

        return res.status(201).json({ 
            message: 'Account created successfully! You can now login.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        })
    } catch (err: any) {
        console.error('User signup error:', err)
        return res.status(500).json({ error: String(err?.message || err) })
    }
}
