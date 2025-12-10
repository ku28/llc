import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const authUser = await getSessionUser(req)

    if (!authUser) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    if (authUser.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }

    if (req.method === 'GET') {
        try {
            // Mock backup list - implement actual backup system as needed
            const backups: Array<{ id: string; filename: string; size: string; createdAt: string }> = []

            return res.status(200).json({ backups })
        } catch (error) {
            console.error('Error fetching backups:', error)
            return res.status(500).json({ error: 'Failed to fetch backups' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
