import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        // Bulk create patients
        const { patients } = req.body

        if (!Array.isArray(patients) || patients.length === 0) {
            return res.status(400).json({ error: 'Invalid patients array' })
        }

        console.log(`[Bulk Create Patients] Received ${patients.length} patients to import`)

        try {
            // Process in parallel batches
            const BATCH_SIZE = 10
            const results: any[] = []
            const errors: any[] = []
            
            const chunks = []
            for (let i = 0; i < patients.length; i += BATCH_SIZE) {
                chunks.push(patients.slice(i, i + BATCH_SIZE))
            }

            for (const chunk of chunks) {
                const chunkPromises = chunk.map(async (patientData: any) => {
                    try {
                        const { 
                            firstName, lastName, phone, email, opdNo, date, dob, age, 
                            address, gender, occupation, pendingPaymentCents, height, 
                            weight, fatherHusbandGuardianName 
                        } = patientData

                        return await prisma.patient.create({
                            data: {
                                firstName,
                                lastName,
                                phone: phone || null,
                                email: email || null,
                                opdNo: opdNo || null,
                                date: date ? new Date(date) : null,
                                dob: dob ? new Date(dob) : null,
                                age: age || null,
                                address: address || null,
                                gender: gender || null,
                                occupation: occupation || null,
                                pendingPaymentCents: pendingPaymentCents || 0,
                                height: height || null,
                                weight: weight || null,
                                fatherHusbandGuardianName: fatherHusbandGuardianName || null,
                            }
                        })
                    } catch (err: any) {
                        console.error(`[Bulk Create Patients] Failed:`, err.message)
                        errors.push({
                            patient: `${patientData.firstName} ${patientData.lastName}`,
                            error: err.message
                        })
                        return null
                    }
                })

                const chunkResults = await Promise.all(chunkPromises)
                results.push(...chunkResults.filter(r => r !== null))
            }

            console.log(`[Bulk Create Patients] Completed: ${results.length} successful, ${errors.length} errors`)

            return res.status(201).json({ 
                success: true, 
                count: results.length,
                errors: errors.length > 0 ? errors : undefined,
                message: errors.length > 0 
                    ? `Imported ${results.length} patients with ${errors.length} errors` 
                    : `Successfully imported ${results.length} patients`
            })
        } catch (error: any) {
            console.error('[Bulk Create Patients] Error:', error)
            return res.status(500).json({ error: error.message || 'Failed to import patients' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}

export default handler
