import crypto from 'crypto'
import { NextApiRequest, NextApiResponse } from 'next'
import prisma from './prisma'

const SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me'

function base64url(input: Buffer) {
    return input.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function sign(payload: string) {
    return crypto.createHmac('sha256', SECRET).update(payload).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function createSessionToken(data: Record<string, any>) {
    const header = base64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
    const payload = base64url(Buffer.from(JSON.stringify({ ...data, iat: Math.floor(Date.now() / 1000) })))
    const signature = sign(`${header}.${payload}`)
    return `${header}.${payload}.${signature}`
}

export function verifySessionToken(token: string) {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null
        const [header, payload, signature] = parts
        const expected = sign(`${header}.${payload}`)
            // timing-safe string compare
            if (expected.length !== signature.length) return null
            let diff = 0
            for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
            if (diff !== 0) return null
        // payload is base64url (no padding, - and _). Convert to standard base64 before decoding.
        let b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        const pad = b64.length % 4
        if (pad === 2) b64 += '=='
        else if (pad === 3) b64 += '='
        else if (pad !== 0) { /* pad === 1 is invalid */ return null }
        const data = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
        return data
    } catch (e) { return null }
}

export function setSessionCookie(res: NextApiResponse, token: string) {
    const cookie = `session=${token}; Path=/; HttpOnly; SameSite=Lax` + (process.env.NODE_ENV === 'production' ? '; Secure' : '')
    res.setHeader('Set-Cookie', cookie)
}

export function clearSessionCookie(res: NextApiResponse) {
    res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0')
}

export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
    const raw = req.headers.cookie || ''
    const match = raw.split(';').map(s => s.trim()).find(s => s.startsWith('session='))
    if (!match) { res.status(401).json({ error: 'Not authenticated' }); return null }
    const token = match.split('=')[1]
    const data = verifySessionToken(token)
    if (!data) { res.status(401).json({ error: 'Invalid session' }); return null }
    // attach fresh user
    const user = await prisma.user.findUnique({ where: { id: Number(data.sub) } }).catch(() => null)
    if (!user) { res.status(401).json({ error: 'User not found' }); return null }
    return user
}

export async function getSessionUser(req: NextApiRequest) {
    const raw = req.headers.cookie || ''
    const match = raw.split(';').map(s => s.trim()).find(s => s.startsWith('session='))
    if (!match) return null
    const token = match.split('=')[1]
    const data = verifySessionToken(token)
    if (!data) return null
    const user = await prisma.user.findUnique({ where: { id: Number(data.sub) } }).catch(() => null)
    return user
}
