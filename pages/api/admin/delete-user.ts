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

    if (req.method === 'DELETE') {
        try {
            const { userId } = req.body

            if (!userId) {
                return res.status(400).json({ error: 'User ID is required' })
            }

            // Prevent deleting own account
            if (userId === authUser.id) {
                return res.status(400).json({ error: 'You cannot delete your own account' })
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            })

            if (!user) {
                return res.status(404).json({ error: 'User not found' })
            }

            // Delete user
            await prisma.user.delete({
                where: { id: userId }
            })

            return res.status(200).json({ 
                message: `User ${user.name} (${user.email}) deleted successfully`,
                user 
            })
        } catch (error) {
            console.error('Error deleting user:', error)
            return res.status(500).json({ error: 'Failed to delete user' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
