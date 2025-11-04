import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req

    try {
        if (method === 'GET') {
            const { date } = req.query
            
            let where: any = {}
            
            // Filter by date if provided
            if (date && typeof date === 'string') {
                const startOfDay = new Date(date)
                startOfDay.setHours(0, 0, 0, 0)
                
                const endOfDay = new Date(date)
                endOfDay.setHours(23, 59, 59, 999)
                
                where.date = {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }

            const tokens = await prisma.token.findMany({
                where,
                include: {
                    patient: true
                },
                orderBy: {
                    tokenNumber: 'asc'
                }
            })

            return res.status(200).json(tokens)
        }

        if (method === 'POST') {
            const { patientId, tokenNumber, status, date } = req.body

            // Validate required fields
            if (!patientId || !tokenNumber || !date) {
                return res.status(400).json({ error: 'Patient ID, token number, and date are required' })
            }

            // Check if patient exists
            const patient = await prisma.patient.findUnique({
                where: { id: Number(patientId) }
            })

            if (!patient) {
                return res.status(404).json({ error: 'Patient not found' })
            }

            // Parse date
            const tokenDate = new Date(date)
            tokenDate.setHours(0, 0, 0, 0)

            // Check if token number already exists for this date
            const existingToken = await prisma.token.findFirst({
                where: {
                    tokenNumber: Number(tokenNumber),
                    date: {
                        gte: tokenDate,
                        lt: new Date(tokenDate.getTime() + 24 * 60 * 60 * 1000)
                    }
                }
            })

            if (existingToken) {
                return res.status(400).json({ error: 'This token number is already assigned for today' })
            }

            // Create token
            const token = await prisma.token.create({
                data: {
                    patientId: Number(patientId),
                    tokenNumber: Number(tokenNumber),
                    status: status || 'waiting',
                    date: tokenDate
                },
                include: {
                    patient: true
                }
            })

            return res.status(201).json(token)
        }

        if (method === 'PUT') {
            const { id, patientId, tokenNumber, status, date } = req.body

            if (!id) {
                return res.status(400).json({ error: 'Token ID is required' })
            }

            // Check if token exists
            const existingToken = await prisma.token.findUnique({
                where: { id: Number(id) }
            })

            if (!existingToken) {
                return res.status(404).json({ error: 'Token not found' })
            }

            // If updating token number, check for duplicates
            if (tokenNumber && Number(tokenNumber) !== existingToken.tokenNumber) {
                const tokenDate = date ? new Date(date) : existingToken.date
                tokenDate.setHours(0, 0, 0, 0)

                const duplicate = await prisma.token.findFirst({
                    where: {
                        tokenNumber: Number(tokenNumber),
                        date: {
                            gte: tokenDate,
                            lt: new Date(tokenDate.getTime() + 24 * 60 * 60 * 1000)
                        },
                        id: {
                            not: Number(id)
                        }
                    }
                })

                if (duplicate) {
                    return res.status(400).json({ error: 'This token number is already assigned for this date' })
                }
            }

            // Update token
            const updateData: any = {}
            if (patientId) updateData.patientId = Number(patientId)
            if (tokenNumber) updateData.tokenNumber = Number(tokenNumber)
            if (status) updateData.status = status
            if (date) {
                const tokenDate = new Date(date)
                tokenDate.setHours(0, 0, 0, 0)
                updateData.date = tokenDate
            }

            const token = await prisma.token.update({
                where: { id: Number(id) },
                data: updateData,
                include: {
                    patient: true
                }
            })

            return res.status(200).json(token)
        }

        if (method === 'DELETE') {
            const { id } = req.body

            if (!id) {
                return res.status(400).json({ error: 'Token ID is required' })
            }

            await prisma.token.delete({
                where: { id: Number(id) }
            })

            return res.status(200).json({ message: 'Token deleted successfully' })
        }

        return res.status(405).json({ error: 'Method not allowed' })
    } catch (error: any) {
        console.error('API Error:', error)
        return res.status(500).json({ error: error.message || 'Internal server error' })
    }
}
