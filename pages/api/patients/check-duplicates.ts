import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Expect array of { email, phone, index }
        const { patients } = req.body as { patients: Array<{ email?: string, phone?: string, index: number }> }

        if (!patients || !Array.isArray(patients)) {
            return res.status(400).json({ error: 'Invalid request body' })
        }

        // Filter out patients with no email or phone
        const validPatients = patients.filter(p => p.email || p.phone)

        if (validPatients.length === 0) {
            return res.status(200).json({
                duplicateIndices: [],
                uniqueIndices: patients.map(p => p.index)
            })
        }

        // Extract emails and phones for batch query
        const emails = validPatients.filter(p => p.email).map(p => p.email!)
        const phones = validPatients.filter(p => p.phone).map(p => p.phone!)

        // Single batch query to check for duplicates
        const existingPatients = await prisma.patient.findMany({
            where: {
                OR: [
                    emails.length > 0 ? { email: { in: emails } } : {},
                    phones.length > 0 ? { phone: { in: phones } } : {}
                ].filter(obj => Object.keys(obj).length > 0)
            },
            select: {
                email: true,
                phone: true
            }
        })

        // Create sets for O(1) lookup
        const existingEmails = new Set(existingPatients.map((p: any) => p.email).filter(Boolean))
        const existingPhones = new Set(existingPatients.map((p: any) => p.phone).filter(Boolean))

        // Check each patient against existing records
        const duplicateIndices: number[] = []
        const uniqueIndices: number[] = []

        patients.forEach(patient => {
            const isDuplicate = 
                (patient.email && existingEmails.has(patient.email)) ||
                (patient.phone && existingPhones.has(patient.phone))

            if (isDuplicate) {
                duplicateIndices.push(patient.index)
            } else {
                uniqueIndices.push(patient.index)
            }
        })

        return res.status(200).json({
            duplicateIndices,
            uniqueIndices
        })
    } catch (error: any) {
        console.error('Error checking patient duplicates:', error)
        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
