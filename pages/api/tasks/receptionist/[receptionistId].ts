import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getSessionUser } from '../../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { receptionistId } = req.query
        const recepId = parseInt(receptionistId as string)

        if (isNaN(recepId)) {
            return res.status(400).json({ error: 'Invalid receptionist ID' })
        }

        // Verify user is authenticated
        const user = await getSessionUser(req)

        if (!user) {
            return res.status(401).json({ error: 'User not found' })
        }

        // Only admin/doctor can view other receptionist's tasks
        if (user.role?.toLowerCase() !== 'admin' && user.role?.toLowerCase() !== 'doctor') {
            return res.status(403).json({ error: 'Forbidden' })
        }

        // Fetch tasks for the specified receptionist
        const tasks = await prisma.task.findMany({
            where: { assignedTo: recepId },
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
    } catch (error) {
        console.error('Error fetching receptionist tasks:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
