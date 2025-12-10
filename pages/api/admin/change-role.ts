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

    if (req.method === 'POST') {
        try {
            const { userId, role } = req.body

            if (!userId || !role) {
                return res.status(400).json({ error: 'User ID and role are required' })
            }

            // Prevent changing own role
            if (userId === authUser.id) {
                return res.status(400).json({ error: 'You cannot change your own role' })
            }

            // Validate role
            const validRoles = ['admin', 'doctor', 'receptionist', 'staff', 'user']
            if (!validRoles.includes(role)) {
                return res.status(400).json({ error: 'Invalid role' })
            }

            const user = await prisma.user.update({
                where: { id: userId },
                data: { role },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                }
            })

            return res.status(200).json({ 
                message: `Role changed successfully to ${role}`,
                user 
            })
        } catch (error) {
            console.error('Error changing role:', error)
            return res.status(500).json({ error: 'Failed to change role' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
