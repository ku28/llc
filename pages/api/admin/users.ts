import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Verify authentication
    const authUser = await getSessionUser(req)

    if (!authUser) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    // Check if user is admin
    if (authUser.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }

    if (req.method === 'GET') {
        try {
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    profileImage: true,
                    createdAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })

            return res.status(200).json({ users })
        } catch (error) {
            console.error('Error fetching users:', error)
            return res.status(500).json({ error: 'Failed to fetch users' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
