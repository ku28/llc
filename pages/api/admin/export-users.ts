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
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    phone: true,
                    createdAt: true
                }
            })

            const csv = [
                'ID,Name,Email,Role,Phone,Created At',
                ...users.map((u: any) => `${u.id},"${u.name}","${u.email}","${u.role}","${u.phone || ''}","${u.createdAt}"`)
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', `attachment; filename=users-export.csv`)
            return res.status(200).send(csv)
        } catch (error) {
            console.error('Error exporting users:', error)
            return res.status(500).json({ error: 'Failed to export users' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
