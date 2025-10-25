import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { visits } = req.body

        if (!Array.isArray(visits) || visits.length === 0) {
            return res.status(400).json({ error: 'Invalid visits array' })
        }

        console.log(`[Bulk Create Visits] Received ${visits.length} visits to import`)

        try {
            const BATCH_SIZE = 10
            const results: any[] = []
            const errors: any[] = []
            
            const chunks = []
            for (let i = 0; i < visits.length; i += BATCH_SIZE) {
                chunks.push(visits.slice(i, i + BATCH_SIZE))
            }

            for (const chunk of chunks) {
                const chunkPromises = chunk.map(async (visitData: any) => {
                    try {
                        const { patientIdentifier, opdNo, date, ...visitFields } = visitData

                        // Find patient by opdNo, email, or phone
                        const patient = await prisma.patient.findFirst({
                            where: {
                                OR: [
                                    { opdNo: patientIdentifier },
                                    { email: patientIdentifier },
                                    { phone: patientIdentifier }
                                ]
                            }
                        })

                        if (!patient) {
                            throw new Error(`Patient not found: ${patientIdentifier}`)
                        }

                        return await prisma.visit.create({
                            data: {
                                patientId: patient.id,
                                opdNo: opdNo,
                                date: date ? new Date(date) : new Date(),
                                diagnoses: visitFields.diagnoses || null,
                                temperament: visitFields.temperament || null,
                                pulseDiagnosis: visitFields.pulseDiagnosis || null,
                                pulseDiagnosis2: visitFields.pulseDiagnosis2 || null,
                                majorComplaints: visitFields.majorComplaints || null,
                                historyReports: visitFields.historyReports || null,
                                investigations: visitFields.investigations || null,
                                provisionalDiagnosis: visitFields.provisionalDiagnosis || null,
                                improvements: visitFields.improvements || null,
                                specialNote: visitFields.specialNote || null,
                                initials: visitFields.initials || null,
                                nextVisit: visitFields.nextVisit ? new Date(visitFields.nextVisit) : null,
                                procedureAdopted: visitFields.procedureAdopted || null,
                                precautions: visitFields.precautions || null,
                                discussion: visitFields.discussion || null,
                                extra: visitFields.extra || null,
                                amount: visitFields.amount || null,
                                discount: visitFields.discount || null,
                                payment: visitFields.payment || null,
                                balance: visitFields.balance || null,
                                helper: visitFields.helper || null,
                            }
                        })
                    } catch (err: any) {
                        console.error(`[Bulk Create Visits] Failed:`, err.message)
                        errors.push({
                            patientIdentifier: visitData.patientIdentifier,
                            error: err.message
                        })
                        return null
                    }
                })

                const chunkResults = await Promise.all(chunkPromises)
                results.push(...chunkResults.filter(r => r !== null))
            }

            console.log(`[Bulk Create Visits] Completed: ${results.length} successful, ${errors.length} errors`)

            return res.status(201).json({ 
                success: true, 
                count: results.length,
                errors: errors.length > 0 ? errors : undefined,
                message: errors.length > 0 
                    ? `Imported ${results.length} visits with ${errors.length} errors` 
                    : `Successfully imported ${results.length} visits`
            })
        } catch (error: any) {
            console.error('[Bulk Create Visits] Error:', error)
            return res.status(500).json({ error: error.message || 'Failed to import visits' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}

export default handler
