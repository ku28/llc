import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '../../../lib/auth'
import formidable from 'formidable'
import fs from 'fs'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'

export const config = {
    api: {
        bodyParser: false
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const authUser = await getSessionUser(req)

    if (!authUser) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    if (authUser.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }

    if (req.method === 'POST') {
        try {
            const form = formidable({})
            const [fields, files] = await form.parse(req)

            const file = files.file?.[0]
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' })
            }

            const content = fs.readFileSync(file.filepath, 'utf-8')
            const lines = content.split('\n').filter(line => line.trim())
            
            // Skip header
            const dataLines = lines.slice(1)
            let imported = 0

            for (const line of dataLines) {
                const [name, email, role, phone] = line.split(',').map(s => s.trim().replace(/"/g, ''))
                
                if (!email) continue

                const defaultPassword = await bcrypt.hash('Welcome123!', 10)

                try {
                    await prisma.user.upsert({
                        where: { email },
                        update: { name, role, phone },
                        create: { 
                            email, 
                            name, 
                            role: role || 'staff', 
                            phone,
                            passwordHash: defaultPassword
                        }
                    })
                    imported++
                } catch (err) {
                    console.error(`Failed to import user ${email}:`, err)
                }
            }

            return res.status(200).json({ 
                message: `Successfully imported ${imported} users`,
                count: imported
            })
        } catch (error) {
            console.error('Error importing users:', error)
            return res.status(500).json({ error: 'Failed to import users' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
