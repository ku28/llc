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
                    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                    if (!isNaN(parsedDate.getTime())) {
                        return parsedDate
                    }
                }

                // Pattern 3: Try standard Date parsing as fallback
                const date = new Date(dateString)
                if (!isNaN(date.getTime())) {
                    return date
                }

                return null
            } catch (error) {
                return null
            }
        }

        // Helper function to safely convert to string or null
        const toString = (value: any): string | null => {
            if (value === null || value === undefined || value === '') return null
            if (typeof value === 'string') {
                const trimmed = value.trim()
                // Treat "0" as empty
                if (trimmed === '0' || trimmed === '') return null
                return trimmed
            }
            // If it's a number or other type, try to convert but if it looks invalid, return null
            try {
                const str = String(value).trim()
                // Treat "0" as empty
                if (str === '0' || str === '') return null
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

        // Helper to normalize phone numbers (remove spaces, dashes, parentheses, etc.)
        const normalizePhone = (phone: any): string | null => {
            if (!phone) return null
            const phoneStr = String(phone).trim()
            if (!phoneStr) return null
            // Remove all non-digit characters
            const normalized = phoneStr.replace(/\D/g, '')
            return normalized.length > 0 ? normalized : null
        }

        try {
            const BATCH_SIZE = 100 // Increased from 50 for better performance
            const results: any[] = []
            const errors: any[] = []

            // ============ STEP 1: Sort all visits by visit number globally ============
            // Sort ALL visits by visit number to ensure visit #1 comes first
            visits.sort((a: any, b: any) => {
                const aNum = toNumber(a.visitNumber) || 999
                const bNum = toNumber(b.visitNumber) || 999
                return aNum - bNum
            })

            // ============ STEP 2: Group visits by patient ============

            // Normalize patient name for consistent matching
            const normalizePatientName = (name: string): string => {
                return name
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, ' ')
                    .replace(/[^\w\s]/g, '')
            }

            // Group visits by normalized patient identifier (phone or name)
            const patientGroups = new Map<string, any[]>()

            visits.forEach((visit: any) => {
                const normalizedPhone = normalizePhone(visit.phone)
                const normalizedName = visit.patientName ? normalizePatientName(visit.patientName) : null

                // Use phone as primary key, fallback to name
                const patientKey = normalizedPhone || normalizedName || `unknown_${visit.opdNo}`

                if (!patientGroups.has(patientKey)) {
                    patientGroups.set(patientKey, [])
                }
                patientGroups.get(patientKey)!.push(visit)
            })

            console.log(`[Bulk Import] Processing ${visits.length} visits in ${patientGroups.size} patient groups`)

            // ============ STEP 3: Pre-fetch all data ============

            const productNames = [...new Set(
                visits.flatMap((v: any) => (v.prescriptions || []).map((p: any) => p.productName).filter(Boolean))
            )]

            // Fetch all existing patients (for this doctor only)
            const existingPatientsByPhone = await prisma.patient.findMany({
                where: {
                    doctorId: doctorId
                }
            })

            // Build maps with normalized phone numbers
            const patientPhoneMap = new Map(
                existingPatientsByPhone
                    .filter((p: any) => p.phone)
                    .map((p: any) => [normalizePhone(p.phone), p])
            )

            // Build name map: normalize full name consistently
            const patientNameMap = new Map()
            existingPatientsByPhone.forEach((p: any) => {
                const fullName = `${p.firstName} ${p.lastName || ''}`
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, ' ')
                    .replace(/[^\w\s]/g, '')
                if (fullName) {
                    patientNameMap.set(fullName, p)
                }
            })

            // Fetch all existing products in one query (for this doctor only)
            const existingProducts = await prisma.product.findMany({
                where: {
                    doctorId: doctorId,
                    name: { in: productNames }
                }
            })

            const productNameMap = new Map(existingProducts.map((p: any) => [
                p.name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, ''),
                p
            ]))

            // Fetch all existing visits by opdNo in one query
            const opdNos = visits.map((v: any) => v.opdNo).filter(Boolean)
            const existingVisits = await prisma.visit.findMany({
                where: { opdNo: { in: opdNos } }
            })
            const visitOpdMap = new Map(existingVisits.map((v: any) => [v.opdNo, v]))

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

            // ============ STEP 3: Process each patient group ============
            // Process groups in batches to avoid overwhelming the system
            const patientGroupArray = Array.from(patientGroups.entries())

            for (const [patientKey, visitsForPatient] of patientGroupArray) {
                // Find or create patient from visit #1
                let patient = null
                const firstVisit = visitsForPatient[0] // Already sorted by visit number
                const firstVisitNumber = toNumber(firstVisit.visitNumber) || 1

                const normalizedPhone = normalizePhone(firstVisit.phone)
                const normalizedName = firstVisit.patientName ? normalizePatientName(firstVisit.patientName) : null

                // Try to find existing patient
                if (normalizedPhone && patientPhoneMap.has(normalizedPhone)) {
                    patient = patientPhoneMap.get(normalizedPhone)
                } else if (normalizedName && patientNameMap.has(normalizedName)) {
                    patient = patientNameMap.get(normalizedName)
                }

                // If patient doesn't exist, we need to find visit #1 to create them
                if (!patient) {
                    const visit1 = visitsForPatient.find((v: any) => (toNumber(v.visitNumber) || 1) === 1)

                    if (!visit1) {
                        // No visit #1 found - skip this patient group
                        visitsForPatient.forEach((v: any) => {
                            errors.push({
                                opdNo: v.opdNo,
                                error: `Visit #1 required to create patient "${v.patientName}". Please include visit #1 in the import file.`
                            })
                        })
                        continue // Skip this patient group
                    }

                    // Create patient from visit #1 data
                    const nameParts = (visit1.patientName || 'Unknown Patient').trim().split(/\s+/)
                    const firstName = nameParts[0]
                    const lastName = nameParts.slice(1).join(' ') || null

                    let finalDob: Date | null = parseDate(visit1.dob)
                    let finalAge: number | null = parseAge(visit1.age)

                    if (finalDob) {
                        finalAge = calculateAgeFromDob(finalDob)
                    } else if (finalAge && finalAge > 0) {
                        finalDob = calculateDobFromAge(finalAge)
                    }

                    const visitDate = parseDate(visit1.date) || new Date()

                    patient = await prisma.patient.create({
                        data: {
                            firstName: firstName,
                            lastName: lastName,
                            phone: visit1.phone || null,
                            address: visit1.address || null,
                            fatherHusbandGuardianName: visit1.fatherHusbandGuardianName || null,
                            gender: visit1.gender || null,
                            dob: finalDob,
                            age: finalAge,
                            doctorId: doctorId,
                            date: visitDate
                        }
                    })

                    // Add to maps for future lookups
                    if (normalizedPhone) {
                        patientPhoneMap.set(normalizedPhone, patient)
                    }
                    if (normalizedName) {
                        patientNameMap.set(normalizedName, patient)
                    }
                }

                // Now process all visits for this patient
                for (const visitData of visitsForPatient) {
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

                        // Check if visit with this opdNo already exists
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

                                // Normalize product name: trim, lowercase, remove extra spaces and special chars
                                const normalizedProductName = prData.productName
                                    .trim()
                                    .toLowerCase()
                                    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                                    .replace(/[^\w\s]/g, '') // Remove special characters

                                // Try to find the product using pre-fetched map with normalized name
                                let product: any = productNameMap.get(normalizedProductName)

                                // If product not found, create it with "Imported" category and doctorId
                                if (!product) {
                                    product = await prisma.product.create({
                                        data: {
                                            name: prData.productName.trim(), // Use original name but trimmed
                                            priceRupees: 0,
                                            quantity: 0,
                                            totalPurchased: 100, // Default total purchased for imported products
                                            categoryId: importedCategory.id,
                                            doctorId: doctorId
                                        }
                                    })

                                    // Add to map with normalized name for subsequent lookups
                                    productNameMap.set(normalizedProductName, product)
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
                                    presentation: toString(prData.presentation)
                                })
                            }

                            // Batch create all prescriptions at once
                            if (prescriptionData.length > 0) {
                                await prisma.prescription.createMany({
                                    data: prescriptionData
                                })
                            }
                        }

                        results.push({ success: true, opdNo, visitId: visit.id })
                    } catch (err: any) {
                        console.error(`[Visit ${visitData.opdNo}] Failed:`, err.message)
                        errors.push({
                            opdNo: visitData.opdNo,
                            error: err.message
                        })
                    }
                }
            }

            console.log(`[Bulk Import] Completed: ${results.length} successful, ${errors.length} errors`)

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
