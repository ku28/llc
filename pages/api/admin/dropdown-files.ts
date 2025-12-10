import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '../../../lib/auth'
import fs from 'fs'
import path from 'path'

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
            const dataDir = path.join(process.cwd(), 'data')
            const files = fs.readdirSync(dataDir)
                .filter(file => file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    label: file.replace('.json', '').replace(/([A-Z])/g, ' $1').trim()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')
                }))

            return res.status(200).json({ files })
        } catch (error) {
            console.error('Error fetching dropdown files:', error)
            return res.status(500).json({ error: 'Failed to fetch dropdown files' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
