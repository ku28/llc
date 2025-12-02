import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getSessionUser } from '../../../lib/auth'
import { getDoctorFilter } from '../../../lib/doctorUtils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await getSessionUser(req)
    if (!user) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    if (req.method === 'GET') {
        try {
            // Fetch suggested tasks that haven't expired yet, filtered by doctor
            const now = new Date()
            const tasks = await prisma.task.findMany({
                where: {
                    isSuggested: true,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gte: now } }
                    ],
                    assignedTo: null, // Not yet assigned
                    ...getDoctorFilter(user, null) // Filter by doctor account
                },
                include: {
                    visit: {
                        include: {
                            patient: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    phone: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })

            return res.status(200).json({ tasks })
        } catch (error) {
            console.error('Failed to fetch suggested tasks:', error)
            return res.status(500).json({ error: 'Failed to fetch suggested tasks' })
        }
    }

    if (req.method === 'PATCH') {
        try {
            const { id, expiresAt } = req.body

            if (!id) {
                return res.status(400).json({ error: 'Task ID is required' })
            }

            // Update expiry time
            const task = await prisma.task.update({
                where: { id: Number(id) },
                data: {
                    expiresAt: expiresAt ? new Date(expiresAt) : null
                }
            })

            return res.status(200).json({ task })
        } catch (error) {
            console.error('Failed to update task expiry:', error)
            return res.status(500).json({ error: 'Failed to update task expiry' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.body

            if (!id) {
                return res.status(400).json({ error: 'Task ID is required' })
            }

            // Delete suggested task
            const deletedTask = await prisma.task.deleteMany({
                where: { 
                    id: Number(id),
                    isSuggested: true // Only allow deleting suggested tasks
                }
            })

            if (deletedTask.count === 0) {
                return res.status(404).json({ error: 'Task not found or already deleted' })
            }

            return res.status(200).json({ success: true })
        } catch (error: any) {
            console.error('Failed to delete suggested task:', error)
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Task not found' })
            }
            return res.status(500).json({ error: 'Failed to delete suggested task' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
