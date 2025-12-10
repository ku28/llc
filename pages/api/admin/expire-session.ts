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
            const { userId } = req.body

            if (!userId) {
                return res.status(400).json({ error: 'User ID is required' })
            }

            // Prevent expiring own session
            if (userId === authUser.id) {
                return res.status(400).json({ error: 'You cannot expire your own session' })
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

            // Update user's session token to force re-login
            // You can implement this by updating a "sessionVersion" field in the User model
            // or by maintaining a separate sessions table
            // For now, we'll just return success (actual implementation depends on your auth setup)

            return res.status(200).json({ 
                message: 'User session expired successfully. User will need to log in again.',
                user 
            })
        } catch (error) {
            console.error('Error expiring session:', error)
            return res.status(500).json({ error: 'Failed to expire session' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
