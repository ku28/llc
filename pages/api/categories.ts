import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireAuth } from '../../lib/auth'
import { getDoctorFilter, getDoctorIdForCreate } from '../../lib/doctorUtils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const user = await requireAuth(req, res)
        if (!user) return
        
        try {
            const selectedDoctorId = req.query.doctorId ? Number(req.query.doctorId) : null
            
            const categories = await prisma.category.findMany({
                where: getDoctorFilter(user, selectedDoctorId),
                orderBy: { name: 'asc' }
            })
            return res.status(200).json(categories)
        } catch (err: any) {
            if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    if (req.method === 'POST') {
        const user = await requireAuth(req, res)
        if (!user) return
        
        const { name, code, doctorId: providedDoctorId } = req.body
        const doctorId = getDoctorIdForCreate(user, providedDoctorId)
        
        try {
            const category = await prisma.category.create({ 
                data: { name, code, doctorId } 
            })
            return res.status(201).json(category)
        } catch (err: any) {
            return res.status(500).json({ error: String(err?.message || err) })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
