import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Expect array of { provDiagnosis, planNumber, index }
        const { treatments } = req.body as { treatments: Array<{ provDiagnosis?: string, planNumber?: string, index: number }> }

        if (!treatments || !Array.isArray(treatments)) {
            return res.status(400).json({ error: 'Invalid request body' })
        }

        // Filter out treatments with no provDiagnosis or planNumber
        const validTreatments = treatments.filter(t => t.provDiagnosis && t.planNumber)

        if (validTreatments.length === 0) {
            return res.status(200).json({
                duplicateIndices: [],
                uniqueIndices: treatments.map(t => t.index)
            })
        }

        // Build OR conditions for batch query
        const orConditions = validTreatments.map(t => ({
            AND: [
                { provDiagnosis: t.provDiagnosis },
                { planNumber: t.planNumber }
            ]
        }))

        // Single batch query to check for duplicates
        const existingTreatments = await prisma.treatment.findMany({
            where: {
                OR: orConditions
            },
            select: {
                provDiagnosis: true,
                planNumber: true
            }
        })

        // Create set for O(1) lookup using composite key
        const existingKeys = new Set(
            existingTreatments.map((t: any) => `${t.provDiagnosis}|${t.planNumber}`)
        )

        // Check each treatment against existing records
        const duplicateIndices: number[] = []
        const uniqueIndices: number[] = []

        treatments.forEach(treatment => {
            if (!treatment.provDiagnosis || !treatment.planNumber) {
                uniqueIndices.push(treatment.index)
                return
            }

            const key = `${treatment.provDiagnosis}|${treatment.planNumber}`
            const isDuplicate = existingKeys.has(key)

            if (isDuplicate) {
                duplicateIndices.push(treatment.index)
            } else {
                uniqueIndices.push(treatment.index)
            }
        })

        return res.status(200).json({
            duplicateIndices,
            uniqueIndices
        })
    } catch (error: any) {
        console.error('Error checking treatment duplicates:', error)
        return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
