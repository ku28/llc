import nodemailer from 'nodemailer'

export interface EmailOptions {
    to: string
    subject: string
    html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.error('Email configuration missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env')
        throw new Error('Email configuration missing')
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    })

    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
    })

    return info
}

export function generateVerificationEmail(name: string, email: string, role: string, verificationToken: string) {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/verify?token=${verificationToken}`
    
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 30px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .info-box { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 LLC ERP - New User Registration</h1>
        </div>
        <div class="content">
            <h2>New User Signup Request</h2>
            <p>A new user has requested to sign up for LLC ERP system.</p>
            
            <div class="info-box">
                <strong>User Details:</strong><br>
                👤 <strong>Name:</strong> ${name}<br>
                📧 <strong>Email:</strong> ${email}<br>
                🎭 <strong>Role:</strong> ${role.toUpperCase()}
            </div>

            <p>Click the button below to <strong>approve and create</strong> this user account:</p>
            
            <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">✅ Verify & Create Account</a>
            </div>

            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <code style="background-color: #e5e7eb; padding: 5px; display: block; margin-top: 5px; word-break: break-all;">${verificationUrl}</code>
            </p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
                ⚠️ <strong>Note:</strong> This verification link will expire in 24 hours. If you did not expect this request, you can safely ignore this email.
            </p>
        </div>
        <div class="footer">
            <p>LLC ERP System - Automated Email</p>
            <p>This is an automated notification for admin approval.</p>
        </div>
    </div>
</body>
</html>
    `
}

export function generateWelcomeEmail(name: string) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to LLC ERP!</h1>
        </div>
        <div class="content">
            <h2>Hello ${name},</h2>
            <p>Great news! Your account has been <strong>approved</strong> by the administrator.</p>
            <p>You can now log in to the LLC ERP system and start using all the features available to your role.</p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <strong>Next Steps:</strong><br>
                1. Visit the login page<br>
                2. Use your registered email and password<br>
                3. Start managing your work efficiently!
            </div>

            <p>If you have any questions or need assistance, please contact your system administrator.</p>
        </div>
        <div class="footer">
            <p>LLC ERP System</p>
        </div>
    </div>
</body>
</html>
    `
}
