import { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Authenticate user
    const user = await requireAuth(req, res)
    if (!user) return

    // Only for receptionists
    const isReceptionist = user.role === 'receptionist'
    if (!isReceptionist) {
        return res.status(403).json({ error: 'Access denied' })
    }

    try {
        if (req.method === 'GET') {
            // Get unacknowledged tasks assigned to this receptionist
            const unacknowledgedTasks = await prisma.task.findMany({
                where: {
                    assignedTo: user.id,
                    status: 'pending',
                    acknowledged: false // We'll add this field
                },
                include: {
                    assignedByUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 1 // Get only the latest unacknowledged task
            })

            if (unacknowledgedTasks.length > 0) {
                const task = unacknowledgedTasks[0]
                console.log(`📬 New notification: Task ${task.id} for user ${user.id}`)
                return res.status(200).json({
                    hasNew: true,
                    task: {
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        assignedBy: task.assignedByUser?.name || task.assignedByUser?.email || 'Unknown',
                        createdAt: task.createdAt
                    }
                })
            }

            return res.status(200).json({ hasNew: false })
        }

        if (req.method === 'POST') {
            // Acknowledge a task
            const { taskId } = req.body

            if (!taskId) {
                return res.status(400).json({ error: 'Task ID required' })
            }

            // Verify task belongs to this user
            const task = await prisma.task.findUnique({
                where: { id: taskId }
            })

            if (!task || task.assignedTo !== user.id) {
                return res.status(404).json({ error: 'Task not found' })
            }

            // Mark as acknowledged
            await prisma.task.update({
                where: { id: taskId },
                data: { acknowledged: true }
            })

            console.log(`✅ Task ${taskId} acknowledged by user ${user.id}`)
            return res.status(200).json({ success: true, acknowledged: true })
        }
    } catch (error) {
        console.error('Error in task notifications:', error)
        return res.status(500).json({ error: 'Failed to process task notifications' })
    }
}
