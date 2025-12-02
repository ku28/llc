import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getSessionUser } from '../../../lib/auth'
import { getDoctorFilter, getDoctorIdForCreate } from '../../../lib/doctorUtils'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Verify user is authenticated
        const user = await getSessionUser(req)

        if (!user) {
            return res.status(401).json({ error: 'User not found' })
        }

        if (req.method === 'GET') {
            // Fetch tasks for the logged-in user (if receptionist) or filtered by doctor account
            const isReceptionist = user.role?.toLowerCase() === 'receptionist'
            
            const tasks = await prisma.task.findMany({
                where: {
                    ...(isReceptionist ? { assignedTo: user.id } : {}),
                    ...getDoctorFilter(user, null) // Filter by doctor account
                },
                include: {
                    assignedByUser: {
                        select: { name: true, email: true }
                    },
                    assignedToUser: {
                        select: { name: true, email: true }
                    }
                },
                orderBy: [
                    { status: 'asc' },
                    { createdAt: 'desc' }
                ]
            })

            const formattedTasks = tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                type: task.type,
                status: task.status,
                assignedTo: task.assignedTo,
                assignedBy: task.assignedBy,
                assignedByName: task.assignedByUser?.name || task.assignedByUser?.email || 'Unknown',
                assignedToName: task.assignedToUser?.name || task.assignedToUser?.email || 'Unknown',
                attachmentUrl: task.attachmentUrl,
                isSuggested: task.isSuggested,
                expiresAt: task.expiresAt?.toISOString(),
                visitId: task.visitId,
                createdAt: task.createdAt.toISOString(),
                completedAt: task.completedAt?.toISOString()
            }))

            return res.status(200).json({ tasks: formattedTasks })
        }

        if (req.method === 'POST') {
            // Only admin/doctor can create tasks
            if (user.role?.toLowerCase() !== 'admin' && user.role?.toLowerCase() !== 'doctor') {
                return res.status(403).json({ error: 'Only admin or doctor can assign tasks' })
            }

            const { title, description, assignedTo, type, attachmentUrl } = req.body

            if (!title || !assignedTo) {
                return res.status(400).json({ error: 'Title and assignedTo are required' })
            }

            // Verify the assignedTo user exists and is a receptionist
            const receptionist = await prisma.user.findUnique({
                where: { id: assignedTo }
            })

            if (!receptionist || receptionist.role?.toLowerCase() !== 'receptionist') {
                return res.status(400).json({ error: 'Invalid receptionist' })
            }

            // Get doctor ID for the task
            const doctorId = getDoctorIdForCreate(user, null)

            const task = await prisma.task.create({
                data: {
                    title,
                    description: description || null,
                    type: type || 'task',
                    assignedTo,
                    assignedBy: user.id,
                    doctorId,
                    attachmentUrl: attachmentUrl || null,
                    status: 'pending'
                },
                include: {
                    assignedByUser: {
                        select: { name: true, email: true }
                    }
                }
            })

            return res.status(201).json({ 
                task: {
                    ...task,
                    assignedByName: task.assignedByUser?.name || task.assignedByUser?.email || 'Unknown'
                }
            })
        }

        return res.status(405).json({ error: 'Method not allowed' })
    } catch (error) {
        console.error('Error in tasks API:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
