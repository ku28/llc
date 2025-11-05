import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { visits } = req.body

        if (!Array.isArray(visits) || visits.length === 0) {
            return res.status(400).json({ error: 'Invalid visits array' })
        }

        console.log(`[Bulk Create Visits] Received ${visits.length} visits to import`)

        // Helper function to safely parse dates
        const parseDate = (dateStr: any): Date | null => {
            if (!dateStr) return null
            
            try {
                const date = new Date(dateStr)
                // Check if date is valid
                if (isNaN(date.getTime())) {
                    return null
                }
                return date
            } catch {
                return null
            }
        }

        // Helper function to safely convert to string or null
        const toString = (value: any): string | null => {
            if (value === null || value === undefined || value === '') return null
            if (typeof value === 'string') return value
            // If it's a number or other type, try to convert but if it looks invalid, return null
            try {
                const str = String(value)
                // Check if it looks like a malformed number (e.g., Excel date serial)
                if (typeof value === 'number' && (value > 1000000 || value < -1000000)) {
                    return null
                }
                return str
            } catch {
                return null
            }
        }

        // Helper function to safely parse numbers
        const toNumber = (value: any): number | null => {
            if (value === null || value === undefined || value === '') return null
            const num = Number(value)
            if (isNaN(num)) return null
            return num
        }

        try {
            const BATCH_SIZE = 10
            const results: any[] = []
            const errors: any[] = []
            
            // Find or create dummy treatment once for all imports
            let dummyTreatment = await prisma.treatment.findFirst({
                where: {
                    provDiagnosis: 'IMPORTED',
                    planNumber: '00'
                }
            })
            
            if (!dummyTreatment) {
                dummyTreatment = await prisma.treatment.create({
                    data: {
                        provDiagnosis: 'IMPORTED',
                        planNumber: '00',
                        treatmentPlan: 'IMPORTED PRESCRIPTIONS',
                        notes: 'Auto-created treatment for bulk imported prescriptions'
                    }
                })
            }
            
            const chunks = []
            for (let i = 0; i < visits.length; i += BATCH_SIZE) {
                chunks.push(visits.slice(i, i + BATCH_SIZE))
            }

            for (const chunk of chunks) {
                const chunkPromises = chunk.map(async (visitData: any) => {
                    try {
                        const { 
                            opdNo, 
                            patientName, 
                            phone,
                            date, 
                            prescriptions,
                            discount,
                            payment,
                            procedureAdopted,
                            discussion,
                            extra,
                            ...visitFields 
                        } = visitData

                        // Find or create patient by phone or name
                        let patient = null
                        
                        // Try to find by phone first
                        if (phone) {
                            patient = await prisma.patient.findFirst({
                                where: { phone: phone }
                            })
                        }
                        
                        // If not found and we have patient name, try to find by name
                        if (!patient && patientName) {
                            const nameParts = patientName.trim().split(' ')
                            const firstName = nameParts[0]
                            const lastName = nameParts.slice(1).join(' ')
                            
                            patient = await prisma.patient.findFirst({
                                where: {
                                    AND: [
                                        { firstName: firstName },
                                        lastName ? { lastName: lastName } : {}
                                    ]
                                }
                            })
                        }
                        
                        // If still not found, create new patient
                        if (!patient) {
                            const nameParts = (patientName || 'Unknown Patient').trim().split(' ')
                            const firstName = nameParts[0]
                            const lastName = nameParts.slice(1).join(' ') || null
                            
                            patient = await prisma.patient.create({
                                data: {
                                    firstName: firstName,
                                    lastName: lastName,
                                    phone: phone || null,
                                    address: visitFields.address || null,
                                    fatherHusbandGuardianName: visitFields.fatherHusbandGuardianName || null,
                                    gender: visitFields.gender || null,
                                    dob: parseDate(visitFields.dob),
                                    age: visitFields.age || null
                                }
                            })
                        }

                        // Create the visit
                        const visit = await prisma.visit.create({
                            data: {
                                patientId: patient.id,
                                opdNo: opdNo,
                                date: parseDate(date) || new Date(),
                                visitNumber: toNumber(visitFields.visitNumber),
                                diagnoses: toString(visitFields.diagnoses),
                                temperament: toString(visitFields.temperament),
                                pulseDiagnosis: toString(visitFields.pulseDiagnosis),
                                pulseDiagnosis2: toString(visitFields.pulseDiagnosis2),
                                majorComplaints: toString(visitFields.majorComplaints),
                                historyReports: toString(visitFields.historyReports),
                                investigations: toString(visitFields.investigations),
                                improvements: toString(visitFields.improvements),
                                nextVisit: parseDate(visitFields.nextVisit),
                                amount: toNumber(visitFields.amount),
                                discount: toNumber(discount),
                                payment: toNumber(payment),
                                balance: toNumber(visitFields.balance),
                                followUpCount: toNumber(visitFields.followUpCount),
                                address: toString(visitFields.address),
                                phone: toString(phone),
                                gender: toString(visitFields.gender),
                                dob: parseDate(visitFields.dob),
                                age: toNumber(visitFields.age),
                                weight: toNumber(visitFields.weight),
                                height: toNumber(visitFields.height),
                                procedureAdopted: toString(procedureAdopted),
                                discussion: toString(discussion),
                                extra: toString(extra)
                            }
                        })

                        // Create prescriptions if provided
                        if (prescriptions && Array.isArray(prescriptions) && prescriptions.length > 0) {
                            for (const prData of prescriptions) {
                                if (!prData.productName) continue // Skip empty prescriptions
                                
                                // Try to find the product by name
                                let product = await prisma.product.findFirst({
                                    where: {
                                        name: {
                                            contains: prData.productName,
                                            mode: 'insensitive'
                                        }
                                    }
                                })
                                
                                // If product not found, create it
                                if (!product) {
                                    product = await prisma.product.create({
                                        data: {
                                            name: prData.productName,
                                            priceCents: 0,
                                            quantity: 0
                                        }
                                    })
                                }
                                
                                // Create prescription
                                await prisma.prescription.create({
                                    data: {
                                        visitId: visit.id,
                                        productId: product.id,
                                        treatmentId: dummyTreatment.id,
                                        quantity: toNumber(prData.quantity) || 1,
                                        comp1: toString(prData.comp1),
                                        comp2: toString(prData.comp2),
                                        comp3: toString(prData.comp3),
                                        timing: toString(prData.timing),
                                        dosage: toString(prData.dosage),
                                        additions: toString(prData.additions),
                                        procedure: toString(prData.procedure),
                                        presentation: toString(prData.presentation),
                                        droppersToday: toNumber(prData.droppersToday)
                                    }
                                })
                            }
                        }

                        return visit
                    } catch (err: any) {
                        console.error(`[Bulk Create Visits] Failed:`, err.message)
                        errors.push({
                            opdNo: visitData.opdNo,
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
