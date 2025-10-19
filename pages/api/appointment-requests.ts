import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireAuth } from '../../lib/auth'
import { sendEmail, generateNewAppointmentRequestEmail, generateAppointmentApprovedEmail, generateAppointmentDeclinedEmail } from '../../lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // Get all appointment requests
        const user = await requireAuth(req, res)
        if (!user) return

        try {
            const userRole = user.role?.toLowerCase()

            if (userRole === 'user') {
                // Users can only see their own requests
                const requests = await prisma.appointmentRequest.findMany({
                    where: { userId: user.id },
                    orderBy: { createdAt: 'desc' }
                })
                return res.status(200).json(requests)
            } else if (['admin', 'doctor', 'staff', 'reception'].includes(userRole)) {
                // Staff can see all requests
                const requests = await prisma.appointmentRequest.findMany({
                    orderBy: { createdAt: 'desc' }
                })
                return res.status(200).json(requests)
            } else {
                return res.status(403).json({ error: 'Unauthorized' })
            }
        } catch (error) {
            console.error('Error fetching appointment requests:', error)
            return res.status(500).json({ error: 'Failed to fetch appointment requests' })
        }
    }

    if (req.method === 'POST') {
        // Create a new appointment request
        const user = await requireAuth(req, res)
        if (!user) return

        const { message } = req.body

        if (!user.name || !user.email) {
            return res.status(400).json({ error: 'User profile incomplete' })
        }

        // Prevent multiple active requests: if the user already has a pending or approved request
        // without an appointment assigned, disallow creating another until it's completed.
        try {
            const existingActive = await prisma.appointmentRequest.findFirst({
                where: {
                    userId: user.id,
                    AND: [
                        { status: { in: ['pending', 'approved'] } },
                        { appointmentId: null }
                    ]
                }
            })

            if (existingActive) {
                return res.status(400).json({ error: 'You already have an active appointment request. Please wait until that appointment is completed before creating another request.' })
            }
        } catch (err) {
            console.error('Error checking existing requests:', err)
            // proceed; don't block creation on check failure, but log it
        }

        try {
            const request = await prisma.appointmentRequest.create({
                data: {
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email,
                    userPhone: user.phone || '',
                    message: message || '',
                    status: 'pending'
                }
            })

            // Send email notifications to admin and reception
            try {
                // Get all admin and reception users
                const adminAndReceptionUsers = await prisma.user.findMany({
                    where: {
                        role: {
                            in: ['admin', 'reception']
                        }
                    },
                    select: {
                        email: true,
                        role: true
                    }
                })

                // Send email to each admin/reception user
                const emailPromises = adminAndReceptionUsers.map(async (recipient: { email: string | null, role: string }) => {
                    if (recipient.email) {
                        try {
                            await sendEmail({
                                to: recipient.email,
                                subject: `🔔 New Appointment Request from ${user.name}`,
                                html: generateNewAppointmentRequestEmail({
                                    userName: user.name,
                                    userEmail: user.email,
                                    userPhone: user.phone || '',
                                    message: message || '',
                                    requestId: request.id
                                })
                            })
                            console.log(`✓ Email sent to ${recipient.role}: ${recipient.email}`)
                        } catch (emailError) {
                            console.error(`Failed to send email to ${recipient.email}:`, emailError)
                        }
                    }
                })

                await Promise.allSettled(emailPromises)
            } catch (emailError) {
                console.error('Error sending notification emails:', emailError)
                // Don't fail the request if emails fail
            }

            return res.status(201).json(request)
        } catch (error) {
            console.error('Error creating appointment request:', error)
            return res.status(500).json({ error: 'Failed to create appointment request' })
        }
    }

    if (req.method === 'PUT') {
        // Update appointment request status
        const user = await requireAuth(req, res)
        if (!user) return

        const userRole = user.role?.toLowerCase()
        if (!['admin', 'doctor', 'staff', 'reception'].includes(userRole)) {
            return res.status(403).json({ error: 'Unauthorized' })
        }

        const { id, status, patientId, appointmentId, userName, userEmail, userPhone, message } = req.body

        if (!id) {
            return res.status(400).json({ error: 'Request ID is required' })
        }

        try {
            // Build update data object dynamically
            const updateData: any = {}
            if (status) updateData.status = status
            if (patientId !== undefined) updateData.patientId = patientId
            if (appointmentId !== undefined) updateData.appointmentId = appointmentId
            if (userName) updateData.userName = userName
            if (userEmail) updateData.userEmail = userEmail
            if (userPhone) updateData.userPhone = userPhone
            if (message !== undefined) updateData.message = message

            const request = await prisma.appointmentRequest.update({
                where: { id },
                data: updateData
            })

            // Send email notification to the patient when status changes
            try {
                if (status === 'approved') {
                    await sendEmail({
                        to: request.userEmail,
                        subject: '✅ Your Appointment Request Has Been Approved',
                        html: generateAppointmentApprovedEmail({
                            userName: request.userName,
                            userEmail: request.userEmail,
                            requestId: request.id
                        })
                    })
                    console.log(`✓ Approval email sent to patient: ${request.userEmail}`)
                } else if (status === 'declined') {
                    await sendEmail({
                        to: request.userEmail,
                        subject: '❌ Appointment Request Status Update',
                        html: generateAppointmentDeclinedEmail({
                            userName: request.userName,
                            userEmail: request.userEmail,
                            requestId: request.id
                        })
                    })
                    console.log(`✓ Decline email sent to patient: ${request.userEmail}`)
                }
            } catch (emailError) {
                console.error('Error sending status update email:', emailError)
                // Don't fail the request if email fails
            }

            return res.status(200).json(request)
        } catch (error) {
            console.error('Error updating appointment request:', error)
            return res.status(500).json({ error: 'Failed to update appointment request' })
        }
    }

    if (req.method === 'DELETE') {
        const user = await requireAuth(req, res)
        if (!user) return

        const { id } = req.body
        if (!id) {
            return res.status(400).json({ error: 'Request ID is required' })
        }
        try {
            await prisma.appointmentRequest.delete({ where: { id } })
            return res.status(200).json({ success: true })
        } catch (error) {
            console.error('Error deleting appointment request:', error)
            return res.status(500).json({ error: 'Failed to delete appointment request' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
