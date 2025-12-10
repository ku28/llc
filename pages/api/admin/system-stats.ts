import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

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
            const [totalUsers, totalPatients, totalProducts, totalVisits] = await Promise.all([
                prisma.user.count(),
                prisma.patient.count(),
                prisma.product.count(),
                prisma.visit.count()
            ])

            const stats = {
                totalUsers,
                totalPatients,
                totalProducts,
                totalVisits,
                databaseSize: 'N/A', // Can be calculated if needed
                activeSessions: totalUsers // Simplified
            }

            return res.status(200).json({ stats })
        } catch (error) {
            console.error('Error fetching system stats:', error)
            return res.status(500).json({ error: 'Failed to fetch system stats' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
