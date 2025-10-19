import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { sendEmail } from '../../../lib/email'

// Generate 4-digit OTP
function generateOTP(): string {
    return Math.floor(1000 + Math.random() * 9000).toString()
}

// Generate OTP email HTML
function generateOTPEmail(name: string, otp: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-box { background: white; border: 2px solid #22c55e; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; }
                .otp-code { font-size: 36px; font-weight: bold; color: #22c55e; letter-spacing: 10px; }
                .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🍃 Last Leaf Care</h1>
                    <p>Your OTP Verification Code</p>
                </div>
                <div class="content">
                    <p>Hello ${name},</p>
                    <p>Thank you for signing up with Last Leaf Care! To complete your registration, please use the following One-Time Password (OTP):</p>
                    
                    <div class="otp-box">
                        <div class="otp-code">${otp}</div>
                    </div>
                    
                    <p><strong>This OTP will expire in 10 minutes.</strong></p>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong><br>
                        Never share this OTP with anyone. Last Leaf Care will never ask you for this code via phone or email.
                    </div>
                    
                    <p>If you didn't request this OTP, please ignore this email or contact our support team.</p>
                    
                    <p>Best regards,<br><strong>Last Leaf Care Team</strong></p>
                </div>
                <div class="footer">
                    <p>Last Leaf Care - Electrohomeopathy Treatment Centre</p>
                    <p>S-5, Royal Heights Royal City, Chahal Road, Faridkot 151203</p>
                    <p>Phone: +91-9915066777 | Email: lastleafcare@gmail.com</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Send OTP via email
async function sendOTPEmail(email: string, otp: string, name: string) {
    try {
        await sendEmail({
            to: email,
            subject: `🔐 Your Last Leaf Care OTP: ${otp}`,
            html: generateOTPEmail(name, otp)
        });
        console.log(`📧 OTP email sent successfully to ${email}`);
    } catch (error) {
        console.error(`❌ Failed to send OTP email to ${email}:`, error);
        throw new Error('Failed to send OTP email. Please check your email address and try again.');
    }
}

// Send OTP via SMS using Twilio
async function sendOTPSMS(phone: string, otp: string, name: string) {
    try {
        // Check if Twilio credentials are configured
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
            console.error('❌ Twilio configuration missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env');
            throw new Error('SMS service not configured. Please use email instead or contact support.');
        }

        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        const message = await client.messages.create({
            body: `Hello ${name},\n\nYour Last Leaf Care OTP is: ${otp}\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.\n\n- Last Leaf Care`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${phone}` // Format for Indian numbers
        });

        console.log(`📱 OTP SMS sent successfully to ${phone}. Message SID: ${message.sid}`);
    } catch (error: any) {
        console.error(`❌ Failed to send OTP SMS to ${phone}:`, error);
        throw new Error(`Failed to send OTP SMS: ${error.message || 'Unknown error'}. Please use email instead or contact support.`);
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    
    const { emailOrPhone, name } = req.body
    
    if (!emailOrPhone || !name) {
        return res.status(400).json({ error: 'Email/phone and name are required' })
    }
    
    try {
        // Determine if input is email or phone
        const isEmail = emailOrPhone.includes('@')
        const isPhone = /^\d{10}$/.test(emailOrPhone)
        
        if (!isEmail && !isPhone) {
            return res.status(400).json({ error: 'Please enter a valid email address or 10-digit phone number' })
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: isEmail 
                ? { email: emailOrPhone }
                : { phone: emailOrPhone }
        })
        
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email/phone' })
        }

        // Generate OTP
        const otp = generateOTP()
        
        // Store OTP with 10 minute expiration
        const expiresAt = new Date()
        expiresAt.setMinutes(expiresAt.getMinutes() + 10)
        
        // Delete any existing OTP for this identifier
        await prisma.oTP.deleteMany({
            where: { identifier: emailOrPhone }
        })
        
        // Create new OTP in database
        const createdOTP = await prisma.oTP.create({
            data: {
                identifier: emailOrPhone,
                otp,
                name,
                expiresAt
            }
        })

        console.log(`✅ OTP stored in database for ${emailOrPhone}: ${otp}, expires at ${expiresAt.toLocaleTimeString()}`);
        
        // Verify it was stored immediately
        console.log(`🔍 Immediate verification - Created OTP ID: ${createdOTP.id}, OTP: ${createdOTP.otp}`);

        // Send OTP
        if (isEmail) {
            await sendOTPEmail(emailOrPhone, otp, name)
        } else {
            await sendOTPSMS(emailOrPhone, otp, name)
        }

        return res.status(200).json({ 
            message: `OTP sent successfully to ${isEmail ? 'email' : 'phone number'}`,
            expiresIn: 600 // seconds
        })
    } catch (err: any) {
        console.error('Send OTP error:', err)
        return res.status(500).json({ error: String(err?.message || err) })
    }
}
