import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getSessionUser } from '../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PATCH') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { id } = req.query
        const taskId = parseInt(id as string)

        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Invalid task ID' })
        }

        // Verify user is authenticated
        const user = await getSessionUser(req)

        if (!user) {
            return res.status(401).json({ error: 'User not found' })
        }

        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        })

        if (!task) {
            return res.status(404).json({ error: 'Task not found' })
        }

        // Only the assigned receptionist or the admin/doctor who assigned it can update
        const isAssignedTo = task.assignedTo === user.id
        const isAssignedBy = task.assignedBy === user.id
        const isAdmin = user.role?.toLowerCase() === 'admin'
        const isDoctor = user.role?.toLowerCase() === 'doctor'

        if (!isAssignedTo && !isAssignedBy && !isAdmin && !isDoctor) {
            return res.status(403).json({ error: 'Forbidden' })
        }

        const { status } = req.body

        if (status && !['pending', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' })
        }

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                status,
                completedAt: status === 'completed' ? new Date() : null
            },
            include: {
                assignedByUser: {
                    select: { name: true, email: true }
                },
                assignedToUser: {
                    select: { name: true, email: true }
                }
            }
        })

        return res.status(200).json({ 
            task: {
                ...updatedTask,
                assignedByName: updatedTask.assignedByUser?.name || updatedTask.assignedByUser?.email || 'Unknown',
                assignedToName: updatedTask.assignedToUser?.name || updatedTask.assignedToUser?.email || 'Unknown'
            }
        })
    } catch (error) {
        console.error('Error updating task:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
