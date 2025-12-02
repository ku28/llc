import { NextApiRequest, NextApiResponse } from 'next'
import { verifySessionToken, setSessionCookie } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { sessionToken } = req.body

        if (!sessionToken) {
            return res.status(400).json({ error: 'Session token required' })
        }

        console.log('Switch session requested')
        console.log('Token length:', sessionToken.length)
        console.log('Token preview:', sessionToken.substring(0, 50) + '...')

        // Verify the token
        const data = verifySessionToken(sessionToken)
        console.log('Token verification result:', !!data)
        console.log('Token data:', data)

        if (!data) {
            console.error('Token verification failed - invalid signature or structure')
            return res.status(401).json({ error: 'Invalid session token' })
        }

        // Check if user still exists
        const user = await prisma.user.findUnique({
            where: { id: Number(data.sub) }
        })

        if (!user) {
            return res.status(401).json({ error: 'User not found' })
        }

        console.log('User found:', user.email)

        // Set the session cookie with the provided token
        setSessionCookie(res, sessionToken)

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage
            }
        })
    } catch (error) {
        console.error('Session switch error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
