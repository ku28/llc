import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await getSessionUser(req)
    if (!user) return res.status(200).json({ user: null })
    return res.status(200).json({ user })
}
