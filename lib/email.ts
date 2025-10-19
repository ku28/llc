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

export function generateNewAppointmentRequestEmail(requestDetails: {
    userName: string
    userEmail: string
    userPhone: string
    message: string
    requestId: number
}) {
    const { userName, userEmail, userPhone, message, requestId } = requestDetails
    const requestUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/requests`
    
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 30px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .info-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .detail-box { background-color: white; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 New Appointment Request</h1>
        </div>
        <div class="content">
            <h2>New Patient Appointment Request</h2>
            <p>A new appointment request has been submitted and requires your attention.</p>
            
            <div class="info-box">
                <strong>⚠️ Action Required:</strong> Please review and approve/decline this request.
            </div>

            <div class="detail-box">
                <h3 style="margin-top: 0; color: #2563eb;">Patient Details:</h3>
                <p style="margin: 8px 0;">
                    <strong>👤 Name:</strong> ${userName}<br>
                    <strong>📧 Email:</strong> ${userEmail}<br>
                    <strong>📞 Phone:</strong> ${userPhone || 'Not provided'}<br>
                    <strong>🔢 Request ID:</strong> #${requestId}
                </p>
                ${message ? `
                <div style="background-color: #f3f4f6; padding: 12px; border-radius: 5px; margin-top: 15px;">
                    <strong>💬 Message:</strong><br>
                    <em>"${message}"</em>
                </div>
                ` : ''}
            </div>

            <div style="text-align: center;">
                <a href="${requestUrl}" class="button">🔍 View & Manage Request</a>
            </div>

            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                Please log in to the LLC ERP system to approve or decline this request.
            </p>
        </div>
        <div class="footer">
            <p>LLC ERP - Last Leaf Care</p>
            <p>📍 Jalandhar, Punjab | 📞 +91-9915066777 | 📧 lastleafcare@gmail.com</p>
            <p style="margin-top: 10px;">This is an automated notification. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `
}

export function generateAppointmentApprovedEmail(patientDetails: {
    userName: string
    userEmail: string
    requestId: number
}) {
    const { userName, requestId } = patientDetails
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my-requests`
    
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .success-box { background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
        .info-box { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Appointment Request Approved!</h1>
        </div>
        <div class="content">
            <h2>Great News, ${userName}!</h2>
            <p>Your appointment request has been <strong>approved</strong> by our team.</p>
            
            <div class="success-box">
                <strong>✓ Request ID #${requestId} - APPROVED</strong><br>
                Your appointment is currently being scheduled by our staff.
            </div>

            <div class="info-box">
                <strong>📋 Next Steps:</strong><br>
                1. Our staff will register you as a patient (if not already registered)<br>
                2. Your appointment will be scheduled shortly<br>
                3. You will receive confirmation once the appointment is set<br>
                4. You can track your request status in your dashboard
            </div>

            <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">📊 View My Requests</a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>Need assistance?</strong><br>
                Feel free to contact us at:<br>
                📞 Phone: +91-9915066777<br>
                📧 Email: lastleafcare@gmail.com
            </p>
        </div>
        <div class="footer">
            <p>LLC ERP - Last Leaf Care</p>
            <p>📍 Jalandhar, Punjab</p>
            <p style="margin-top: 10px;">Thank you for choosing Last Leaf Care for your healthcare needs.</p>
        </div>
    </div>
</body>
</html>
    `
}

export function generateAppointmentDeclinedEmail(patientDetails: {
    userName: string
    userEmail: string
    requestId: number
}) {
    const { userName, requestId } = patientDetails
    const contactUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my-requests`
    
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .warning-box { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .info-box { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Appointment Request Status</h1>
        </div>
        <div class="content">
            <h2>Dear ${userName},</h2>
            <p>We regret to inform you that your appointment request could not be approved at this time.</p>
            
            <div class="warning-box">
                <strong>Request ID #${requestId} - NOT APPROVED</strong>
            </div>

            <div class="info-box">
                <strong>What can you do next?</strong><br>
                • Contact us directly to discuss your requirements<br>
                • Submit a new request with additional information<br>
                • Call us to speak with our staff about scheduling options
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>Contact Information:</strong><br>
                📞 Phone: +91-9915066777<br>
                📧 Email: lastleafcare@gmail.com<br>
                🕒 Hours: Monday - Saturday, 9 AM - 6 PM
            </p>

            <div style="text-align: center;">
                <a href="${contactUrl}" class="button">View Request Status</a>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                We apologize for any inconvenience and look forward to serving you in the future.
            </p>
        </div>
        <div class="footer">
            <p>LLC ERP - Last Leaf Care</p>
            <p>📍 Jalandhar, Punjab</p>
        </div>
    </div>
</body>
</html>
    `
}
