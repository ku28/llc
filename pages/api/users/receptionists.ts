import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getSessionUser } from '../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Verify user is authenticated
        const user = await getSessionUser(req)

        if (!user || (user.role?.toLowerCase() !== 'admin' && user.role?.toLowerCase() !== 'doctor')) {
            return res.status(403).json({ error: 'Forbidden' })
        }

        // Fetch all receptionists
        const receptionists = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'receptionist' },
                    { role: 'Receptionist' }
                ]
            },
            select: {
                id: true,
                name: true,
                email: true,
                profileImage: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        return res.status(200).json({ receptionists })
    } catch (error) {
        console.error('Error fetching receptionists:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
