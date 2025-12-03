import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'
import { getDoctorIdForCreate } from '../../../lib/doctorUtils'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const user = await requireAuth(req, res)
        if (!user) return
        
        const { visits, doctorId: requestDoctorId } = req.body

        if (!Array.isArray(visits) || visits.length === 0) {
            return res.status(400).json({ error: 'Invalid visits array' })
        }

        // Get the effective doctorId (doctor's own ID, or admin's selected doctor)
        const doctorId = getDoctorIdForCreate(user, requestDoctorId)

        console.log(`[Bulk Create Visits] Received ${visits.length} visits to import for doctor ID ${doctorId}`)

        // Helper function to safely parse dates
        const parseDate = (dateStr: any): Date | null => {
            if (!dateStr) return null
            
            try {
                let dateString = String(dateStr).trim()
                
                // Try date string patterns - DD-MM-YYYY format
                let match = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
                if (match) {
                    const [, day, month, year] = match
                    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                    if (!isNaN(parsedDate.getTime())) {
                        return parsedDate
                    }
                }
                
                // If it's a pure number (Excel serial), return null
                const numValue = parseFloat(dateString)
                if (!isNaN(numValue) && !/[\/-]/.test(dateString)) {
                    return null
                }
                
                // Pattern 2: MM/DD/YYYY
                match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
                if (match) {
                    const [, month, day, year] = match
                    console.log(`[parseDate] Matched MM/DD/YYYY: month=${month}, day=${day}, year=${year}`)
                    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                    if (!isNaN(parsedDate.getTime())) {
                        console.log(`[parseDate] ✓ Successfully created date: ${parsedDate.toISOString()}`)
                        return parsedDate
                    }
                }
                
                // Pattern 3: Try standard Date parsing as fallback
                const date = new Date(dateString)
                if (!isNaN(date.getTime())) {
                    console.log(`[parseDate] ✓ Parsed using standard Date: ${date.toISOString()}`)
                    return date
                }
                
                console.log(`[parseDate] ✗ Failed to parse date: "${dateString}"`)
                return null
            } catch (error) {
                console.log(`[parseDate] ✗ Error parsing date:`, error)
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
            if (value === null || value === undefined || value === '' || value === 0) return null
            
            // Handle weight history format like "69/70/71" - take the last value
            if (typeof value === 'string' && value.includes('/')) {
                const values = value.split('/').map(v => v.trim()).filter(v => v && v !== '0')
                if (values.length > 0) {
                    const lastValue = values[values.length - 1]
                    const num = Number(lastValue)
                    return isNaN(num) || num === 0 ? null : num
                }
                return null
            }
            
            const num = Number(value)
            if (isNaN(num) || num === 0) return null
            return num
        }
        
        // Helper to parse weight with history (e.g., "95/94/94/94/95/94/92/93/91/94")
        const parseWeight = (value: any): number | null => {
            if (value === null || value === undefined || value === '' || value === 0) return null
            
            const str = String(value).trim()
            if (!str || str === '0') return null
            
            // Handle weight history format like "95/94/94/94/95/94/92/93/91/94" - take the last value
            if (str.includes('/')) {
                const values = str.split('/').map(v => v.trim()).filter(v => v && v !== '0')
                if (values.length > 0) {
                    const lastValue = values[values.length - 1]
                    const num = Number(lastValue)
                    return isNaN(num) || num === 0 ? null : num
                }
                return null
            }
            
            const num = Number(str)
            return isNaN(num) || num === 0 ? null : num
        }
        
        // Helper to extract weight history as string
        const parseWeightHistory = (value: any): string | null => {
            if (value === null || value === undefined || value === '' || value === 0) return null
            const str = String(value).trim()
            if (!str || str === '0') return null
            // If it contains "/" it's a history, otherwise just return the value
            return str || null
        }
        
        // Helper to parse height in format like "3' 9"" or "5'10"" to inches
        const parseHeight = (value: any): number | null => {
            if (value === null || value === undefined || value === '' || value === 0) return null
            
            const str = String(value).trim()
            if (!str || str === '0') return null
            
            // Try to parse format like "3' 9"" or "5'10""
            const heightMatch = str.match(/(\d+)'?\s*(\d+)?/)
            if (heightMatch) {
                const feet = parseInt(heightMatch[1]) || 0
                const inches = parseInt(heightMatch[2]) || 0
                const totalInches = (feet * 12) + inches
                return totalInches > 0 ? totalInches : null
            }
            
            // Try direct number
            const num = Number(str)
            return isNaN(num) || num === 0 ? null : num
        }
        
        // Helper to parse age from formats like "30 YR", "25YR", "5 MONTHS", etc.
        const parseAge = (value: any): number | null => {
            if (value === null || value === undefined || value === '' || value === 0) return null
            
            const str = String(value).trim().toUpperCase()
            if (!str || str === '0' || str === 'YR' || str === 'YEARS' || str === 'Y') return null
            
            // Match patterns like "30 YR", "25YR", "5 MONTHS", "2 M", etc.
            const ageMatch = str.match(/(\d+)\s*(YR|YEARS?|Y|M|MONTHS?)?/)
            if (ageMatch) {
                const num = parseInt(ageMatch[1])
                const unit = ageMatch[2]
                
                // If unit is months or M, convert to years (but return null if less than 1 year for DOB calculation)
                if (unit && (unit.startsWith('M') || unit === 'MONTHS')) {
                    // Store months as decimal years for accuracy
                    return num / 12
                }
                
                return num > 0 ? num : null
            }
            
            // Try direct number
            const num = Number(str)
            return isNaN(num) || num === 0 ? null : num
        }
        
        // Helper to calculate DOB from age
        const calculateDobFromAge = (age: number): Date => {
            const today = new Date()
            const birthYear = today.getFullYear() - Math.floor(age)
            return new Date(birthYear, today.getMonth(), today.getDate())
        }
        
        // Helper to calculate age from DOB
        const calculateAgeFromDob = (dob: Date): number => {
            const today = new Date()
            let age = today.getFullYear() - dob.getFullYear()
            const monthDiff = today.getMonth() - dob.getMonth()
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--
            }
            
            return age
        }

        try {
            const BATCH_SIZE = 100 // Increased from 50 for better performance
            const results: any[] = []
            const errors: any[] = []
            
            // ============ PERFORMANCE OPTIMIZATION: Pre-fetch all data ============
            console.log('[Bulk Create Visits] Pre-fetching patients and products...')
            
            // Get all phones and names from visits data for batch lookup
            const phones = [...new Set(visits.map((v: any) => v.phone).filter(Boolean))]
            const patientNames = [...new Set(visits.map((v: any) => v.patientName).filter(Boolean))]
            const productNames = [...new Set(
                visits.flatMap((v: any) => (v.prescriptions || []).map((p: any) => p.productName).filter(Boolean))
            )]
            
            // Fetch all existing patients by phone AND name in one query
            const existingPatientsByPhone = await prisma.patient.findMany({
                where: {
                    OR: [
                        { phone: { in: phones } },
                        { 
                            OR: patientNames.map(name => {
                                const nameParts = name.trim().split(' ')
                                return {
                                    firstName: nameParts[0],
                                    lastName: nameParts.slice(1).join(' ') || null
                                }
                            })
                        }
                    ]
                }
            })
            const patientPhoneMap = new Map(existingPatientsByPhone.map((p: any) => [p.phone, p]))
            const patientNameMap = new Map(existingPatientsByPhone.map((p: any) => 
                [`${p.firstName} ${p.lastName || ''}`.trim().toLowerCase(), p]
            ))
            
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
                        
                        // Try to find by phone first (most reliable)
                        if (phone && patientPhoneMap.has(phone)) {
                            patient = patientPhoneMap.get(phone)
                            console.log(`[Visit ${opdNo}] Found existing patient by phone: ${phone}`)
                        }
                        
                        // If not found by phone, try by name (normalized)
                        if (!patient && patientName) {
                            // Normalize: trim, lowercase, remove extra spaces, remove special chars
                            const normalizedName = patientName
                                .trim()
                                .toLowerCase()
                                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                                .replace(/[^\w\s]/g, '') // Remove special characters
                            
                            if (patientNameMap.has(normalizedName)) {
                                patient = patientNameMap.get(normalizedName)
                                console.log(`[Visit ${opdNo}] Found existing patient by name: ${normalizedName}`)
                            }
                        }
                        
                        // If still not found, create new patient
                        if (!patient) {
                            const nameParts = (patientName || 'Unknown Patient').trim().split(/\s+/) // Split by any whitespace
                            const firstName = nameParts[0]
                            const lastName = nameParts.slice(1).join(' ') || null
                            
                            console.log(`[Visit ${opdNo}] Creating new patient: ${firstName} ${lastName || ''} (Phone: ${phone || 'N/A'})`)
                            
                            // Parse DOB and age with priority: DOB first, then calculate age from it
                            let finalDob: Date | null = parseDate(visitFields.dob)
                            let finalAge: number | null = parseAge(visitFields.age)
                            
                            // If DOB is provided, prioritize it and calculate age from it
                            if (finalDob) {
                                finalAge = calculateAgeFromDob(finalDob)
                            } 
                            // If no DOB but age is provided, calculate DOB from age
                            else if (finalAge && finalAge > 0) {
                                finalDob = calculateDobFromAge(finalAge)
                            }
                            
                            patient = await prisma.patient.create({
                                data: {
                                    firstName: firstName,
                                    lastName: lastName,
                                    phone: phone || null,
                                    address: visitFields.address || null,
                                    fatherHusbandGuardianName: visitFields.fatherHusbandGuardianName || null,
                                    gender: visitFields.gender || null,
                                    dob: finalDob,
                                    age: finalAge,
                                    doctorId: doctorId
                                }
                            })
                            
                            // Add to both maps for subsequent lookups in this batch
                            if (phone) {
                                patientPhoneMap.set(phone, patient)
                                console.log(`[Visit ${opdNo}] Added patient to phone map: ${phone}`)
                            }
                            
                            // Normalize name the same way for map storage
                            const normalizedName = `${firstName} ${lastName || ''}`
                                .trim()
                                .toLowerCase()
                                .replace(/\s+/g, ' ')
                                .replace(/[^\w\s]/g, '')
                            
                            patientNameMap.set(normalizedName, patient)
                            console.log(`[Visit ${opdNo}] Added patient to name map: ${normalizedName}`)
                        }

                        // Check if visit with this opdNo already exists using pre-fetched map
                        const existingVisit: any = visitOpdMap.get(opdNo)

                        let visit
                        if (existingVisit) {
                            // Parse DOB and age with priority: DOB first, then calculate age from it
                            let finalDob: Date | null = parseDate(visitFields.dob)
                            let finalAge: number | null = parseAge(visitFields.age)
                            
                            if (finalDob) {
                                finalAge = calculateAgeFromDob(finalDob)
                            } else if (finalAge && finalAge > 0) {
                                finalDob = calculateDobFromAge(finalAge)
                            }
                            
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
                                    dob: finalDob,
                                    age: finalAge,
                                    weight: parseWeight(visitFields.weight),
                                    height: parseHeight(visitFields.height),
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
                            // Parse DOB and age with priority: DOB first, then calculate age from it
                            let finalDob: Date | null = parseDate(visitFields.dob)
                            let finalAge: number | null = parseAge(visitFields.age)
                            
                            if (finalDob) {
                                finalAge = calculateAgeFromDob(finalDob)
                            } else if (finalAge && finalAge > 0) {
                                finalDob = calculateDobFromAge(finalAge)
                            }
                            
                            // Create new visit
                            visit = await prisma.visit.create({
                                data: {
                                patient: {
                                    connect: { id: patient.id }
                                },
                                doctor: doctorId ? {
                                    connect: { id: doctorId }
                                } : undefined,
                                opdNo: opdNo,
                                date: parseDate(date) || new Date(),
                                isImported: true, // Mark as imported to skip PDF generation
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
                                dob: finalDob,
                                age: finalAge,
                                weight: parseWeight(visitFields.weight),
                                height: parseHeight(visitFields.height),
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
                            
                            // Get or create "Imported" category for auto-created products with matching doctorId
                            let importedCategory = await prisma.category.findFirst({
                                where: {
                                    name: 'Imported',
                                    doctorId: doctorId
                                }
                            })
                            
                            if (!importedCategory) {
                                importedCategory = await prisma.category.create({
                                    data: {
                                        name: 'Imported',
                                        code: 'IMPORTED',
                                        reorderLevel: 0,
                                        doctorId: doctorId
                                    }
                                })
                            }
                            
                            for (const prData of prescriptions) {
                                if (!prData.productName) continue // Skip empty prescriptions
                                
                                // Try to find the product using pre-fetched map
                                let product: any = productNameMap.get(prData.productName.toLowerCase())
                                
                                // If product not found, create it with "Imported" category and doctorId
                                if (!product) {
                                    product = await prisma.product.create({
                                        data: {
                                            name: prData.productName,
                                            priceRupees: 0,
                                            quantity: 0,
                                            categoryId: importedCategory.id,
                                            doctorId: doctorId
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
                                    spy1: toString(prData.spy1),
                                    spy2: toString(prData.spy2),
                                    spy3: toString(prData.spy3),
                                    timing: toString(prData.timing),
                                    dosage: toString(prData.dosage),
                                    addition1: toString(prData.addition1),
                                    addition2: toString(prData.addition2),
                                    addition3: toString(prData.addition3),
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
