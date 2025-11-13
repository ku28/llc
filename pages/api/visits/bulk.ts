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
            
            // Handle weight history format like "69/70/71" - take the last value
            if (typeof value === 'string' && value.includes('/')) {
                const values = value.split('/').map(v => v.trim()).filter(v => v)
                if (values.length > 0) {
                    const lastValue = values[values.length - 1]
                    const num = Number(lastValue)
                    return isNaN(num) ? null : num
                }
                return null
            }
            
            const num = Number(value)
            if (isNaN(num)) return null
            return num
        }
        
        // Helper to extract weight history as string
        const parseWeightHistory = (value: any): string | null => {
            if (value === null || value === undefined || value === '') return null
            const str = String(value).trim()
            // If it contains "/" it's a history, otherwise just return the value
            return str || null
        }

        try {
            const BATCH_SIZE = 100 // Increased from 50 for better performance
            const results: any[] = []
            const errors: any[] = []
            
            // ============ PERFORMANCE OPTIMIZATION: Pre-fetch all data ============
            console.log('[Bulk Create Visits] Pre-fetching patients and products...')
            
            // Get all phones and names from visits data for batch lookup
            const phones = [...new Set(visits.map((v: any) => v.phone).filter(Boolean))]
            const productNames = [...new Set(
                visits.flatMap((v: any) => (v.prescriptions || []).map((p: any) => p.productName).filter(Boolean))
            )]
            
            // Fetch all existing patients by phone in one query
            const existingPatientsByPhone = await prisma.patient.findMany({
                where: { phone: { in: phones } }
            })
            const patientPhoneMap = new Map(existingPatientsByPhone.map((p: any) => [p.phone, p]))
            
            // Fetch all existing products in one query
            const existingProducts = await prisma.product.findMany({
                where: {
                    name: { in: productNames }
                }
            })
            const productNameMap = new Map(existingProducts.map((p: any) => [p.name.toLowerCase(), p]))
            
            // Fetch all existing visits by opdNo in one query
            const opdNos = visits.map((v: any) => v.opdNo).filter(Boolean)
            const existingVisits = await prisma.visit.findMany({
                where: { opdNo: { in: opdNos } }
            })
            const visitOpdMap = new Map(existingVisits.map((v: any) => [v.opdNo, v]))
            
            console.log(`[Bulk Create Visits] Found ${existingPatientsByPhone.length} existing patients, ${existingProducts.length} products, ${existingVisits.length} visits`)
            
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
            
            // ============ END PRE-FETCH ============
            
            const chunks = []
            for (let i = 0; i < visits.length; i += BATCH_SIZE) {
                chunks.push(visits.slice(i, i + BATCH_SIZE))
            }

            console.log(`[Bulk Create Visits] Processing ${visits.length} visits in ${chunks.length} batches of up to ${BATCH_SIZE}`)

            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex]
                console.log(`[Bulk Create Visits] Batch ${chunkIndex + 1}/${chunks.length}: Processing ${chunk.length} visits`)
                
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

                        // Find or create patient using pre-fetched data
                        let patient = null
                        
                        // Try to find by phone first using map
                        if (phone && patientPhoneMap.has(phone)) {
                            patient = patientPhoneMap.get(phone)
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
                            // Add to map for subsequent lookups
                            if (phone) patientPhoneMap.set(phone, patient)
                        }

                        // Check if visit with this opdNo already exists using pre-fetched map
                        const existingVisit: any = visitOpdMap.get(opdNo)

                        let visit
                        if (existingVisit) {
                            // Update existing visit
                            visit = await prisma.visit.update({
                                where: { id: existingVisit.id },
                                data: {
                                    patient: {
                                        connect: { id: patient.id }
                                    },
                                    opdNo: opdNo,
                                    date: parseDate(date) || new Date(),
                                    visitNumber: toNumber(visitFields.visitNumber),
                                    provisionalDiagnosis: toString(visitFields.provDiagnosis),
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
                                    extra: (() => {
                                        const weightHistory = parseWeightHistory(visitFields.weight)
                                        if (weightHistory && weightHistory.includes('/')) {
                                            // Store weight history in extra as JSON
                                            try {
                                                const existingExtra = extra ? JSON.parse(extra) : {}
                                                existingExtra.weightHistory = weightHistory
                                                return JSON.stringify(existingExtra)
                                            } catch {
                                                return JSON.stringify({ weightHistory })
                                            }
                                        }
                                        return toString(extra)
                                    })()
                                }
                            })
                            
                            // Delete existing prescriptions for this visit before creating new ones
                            await prisma.prescription.deleteMany({
                                where: { visitId: visit.id }
                            })
                        } else {
                            // Create new visit
                            visit = await prisma.visit.create({
                                data: {
                                patient: {
                                    connect: { id: patient.id }
                                },
                                opdNo: opdNo,
                                date: parseDate(date) || new Date(),
                                visitNumber: toNumber(visitFields.visitNumber),
                                provisionalDiagnosis: toString(visitFields.provDiagnosis),
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
                                extra: (() => {
                                    const weightHistory = parseWeightHistory(visitFields.weight)
                                    if (weightHistory && weightHistory.includes('/')) {
                                        // Store weight history in extra as JSON
                                        try {
                                            const existingExtra = extra ? JSON.parse(extra) : {}
                                            existingExtra.weightHistory = weightHistory
                                            return JSON.stringify(existingExtra)
                                        } catch {
                                            return JSON.stringify({ weightHistory })
                                        }
                                    }
                                    return toString(extra)
                                })()
                            }
                        })
                        }

                        // Create prescriptions if provided - use batch creation for better performance
                        if (prescriptions && Array.isArray(prescriptions) && prescriptions.length > 0) {
                            const prescriptionData = []
                            
                            for (const prData of prescriptions) {
                                if (!prData.productName) continue // Skip empty prescriptions
                                
                                // Try to find the product using pre-fetched map
                                let product: any = productNameMap.get(prData.productName.toLowerCase())
                                
                                // If product not found, create it
                                if (!product) {
                                    product = await prisma.product.create({
                                        data: {
                                            name: prData.productName,
                                            priceRupees: 0,
                                            quantity: 0
                                        }
                                    })
                                    // Add to map for subsequent lookups
                                    productNameMap.set(prData.productName.toLowerCase(), product)
                                }
                                
                                // Add to batch
                                prescriptionData.push({
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
                                })
                            }
                            
                            // Batch create all prescriptions at once
                            if (prescriptionData.length > 0) {
                                await prisma.prescription.createMany({
                                    data: prescriptionData
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
