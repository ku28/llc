import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

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
            const BATCH_SIZE = 50 // Increased for better performance
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
                            firstName, lastName, phone, email, date, dob, age, 
                            address, gender, fatherHusbandGuardianName 
                        } = patientData

                        // Helper function to validate and parse dates
                        // Handles DD-MM-YYYY, MM/DD/YYYY, ISO formats
                        const parseValidDate = (dateValue: any) => {
                            if (!dateValue) return null
                            
                            const dateStr = String(dateValue).trim()
                            if (!dateStr) return null
                            
                            // Try DD-MM-YYYY format first (common in forms)
                            if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
                                const [day, month, year] = dateStr.split('-').map(Number)
                                const parsed = new Date(year, month - 1, day)
                                return isNaN(parsed.getTime()) ? null : parsed
                            }
                            
                            // Try DD/MM/YYYY format
                            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                                const [day, month, year] = dateStr.split('/').map(Number)
                                const parsed = new Date(year, month - 1, day)
                                return isNaN(parsed.getTime()) ? null : parsed
                            }
                            
                            // Try standard Date parsing for ISO formats
                            const parsed = new Date(dateValue)
                            return isNaN(parsed.getTime()) ? null : parsed
                        }

                        // Parse dates safely
                        const parsedDate = parseValidDate(date)
                        const parsedDob = parseValidDate(dob)

                        // Check if patient already exists by phone or email
                        let existingPatient = null
                        if (phone) {
                            existingPatient = await prisma.patient.findFirst({
                                where: { phone }
                            })
                        }
                        if (!existingPatient && email) {
                            existingPatient = await prisma.patient.findFirst({
                                where: { email }
                            })
                        }

                        if (existingPatient) {
                            // Update existing patient
                            return await prisma.patient.update({
                                where: { id: existingPatient.id },
                                data: {
                                    firstName,
                                    lastName,
                                    phone: phone || existingPatient.phone,
                                    email: email || existingPatient.email,
                                    date: parsedDate || existingPatient.date,
                                    dob: parsedDob || existingPatient.dob,
                                    age: age || existingPatient.age,
                                    address: address || existingPatient.address,
                                    gender: gender || existingPatient.gender,
                                    fatherHusbandGuardianName: fatherHusbandGuardianName || existingPatient.fatherHusbandGuardianName,
                                }
                            })
                        } else {
                            // Create new patient
                            return await prisma.patient.create({
                                data: {
                                    firstName,
                                    lastName,
                                    phone: phone || null,
                                    email: email || null,
                                    date: parsedDate,
                                    dob: parsedDob,
                                    age: age || null,
                                    address: address || null,
                                    gender: gender || null,
                                    fatherHusbandGuardianName: fatherHusbandGuardianName || null,
                                }
                            })
                        }
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
