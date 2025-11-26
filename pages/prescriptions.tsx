import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import CustomSelect from '../components/CustomSelect'
import DateInput from '../components/DateInput'
import LoadingModal from '../components/LoadingModal'
import CameraModal from '../components/CameraModal'
import ConfirmModal from '../components/ConfirmModal'
import genderOptions from '../data/gender.json'
import temperamentOptions from '../data/temperament.json'
import pulseDiagnosisOptions from '../data/pulseDiagnosis.json'
import pulseDiagnosis2Options from '../data/pulseDiagnosis2.json'
import components from '../data/components.json'
import timing from '../data/timing.json'
import dosage from '../data/dosage.json'
import doseQuantity from '../data/doseQuantity.json'
import doseTiming from '../data/doseTiming.json'
import dilution from '../data/dilution.json'
import additions from '../data/additions.json'
import procedure from '../data/procedure.json'
import presentation from '../data/presentation.json'
import administration from '../data/administration.json'
import bottlePricing from '../data/bottlePricing.json'
import { useToast } from '../hooks/useToast'

// Prescriptions Page - Create and manage patient visits with prescriptions
export default function PrescriptionsPage() {
    const router = useRouter()
    const { visitId, edit } = router.query
    const isEditMode = edit === 'true' && visitId
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()

    const [user, setUser] = useState<any>(null)
    const [patients, setPatients] = useState<any[]>([])
    const [treatments, setTreatments] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [selectedMedicines, setSelectedMedicines] = useState<string[]>([])
    const [attachments, setAttachments] = useState<Array<{ url: string, name: string, type: string }>>([])
    const [reportsAttachments, setReportsAttachments] = useState<Array<{ url: string, name: string, type: string }>>([])
    const [uploadingAttachment, setUploadingAttachment] = useState(false)
    const [uploadingReports, setUploadingReports] = useState(false)
    const [showCamera, setShowCamera] = useState(false)
    const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment')
    const videoRef = useRef<HTMLVideoElement>(null)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})

    // Refs to track which field user is editing (prevent circular updates)
    const isUpdatingHeightFromFeet = useRef(false)
    const isUpdatingFeetFromHeight = useRef(false)
    const isUpdatingDateFromCount = useRef(false)
    const isUpdatingCountFromDate = useRef(false)

    const [form, setForm] = useState<any>({
        patientId: '', opdNo: '', date: new Date().toISOString().split('T')[0], temperament: '', pulseDiagnosis: '', pulseDiagnosis2: '',
        majorComplaints: '', historyReports: '', investigations: '', reports: '', provisionalDiagnosis: '',
        improvements: '', specialNote: '', dob: '', age: '', address: '', gender: '', phone: '',
        nextVisitDate: '', nextVisitTime: '', occupation: '', pendingPaymentCents: '',
        height: '', heightFeet: '', heightInches: '', weight: '', fatherHusbandGuardianName: '', imageUrl: '',
        // New financial fields
        amount: '', discount: '', payment: '', balance: '',
        // New tracking fields
        visitNumber: '', followUpCount: ''
    })
    const [prescriptions, setPrescriptions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [dataLoading, setDataLoading] = useState(true)
    const [lastCreatedVisitId, setLastCreatedVisitId] = useState<number | null>(null)
    const [lastCreatedVisit, setLastCreatedVisit] = useState<any | null>(null)
    const [previousWeight, setPreviousWeight] = useState<string>('')
    const previewRef = useRef<HTMLDivElement | null>(null)
    const isPatient = user?.role?.toLowerCase() === 'user'

    // Generate OPD number preview
    async function generateOpdNoPreview(patientId: string) {
        try {
            // Get visit count for patient
            const visitsRes = await fetch(`/api/visits?patientId=${patientId}`)
            const visits = await visitsRes.json()
            const visitCount = visits.length + 1 // Next visit number

            // Get token for today (or calculate next token)
            const today = new Date()
            const yy = today.getFullYear().toString().slice(-2)
            const mm = (today.getMonth() + 1).toString().padStart(2, '0')
            const dd = today.getDate().toString().padStart(2, '0')

            // Get tokens for today to determine next token number
            const tokensRes = await fetch('/api/tokens')
            const tokens = await tokensRes.json()

            const todayStart = new Date(today)
            todayStart.setHours(0, 0, 0, 0)
            const todayEnd = new Date(today)
            todayEnd.setHours(23, 59, 59, 999)

            const todayTokens = tokens.filter((t: any) => {
                const tokenDate = new Date(t.date)
                return tokenDate >= todayStart && tokenDate <= todayEnd
            })

            // Find token for this patient or estimate next token
            let tokenNumber = 1
            const patientToken = todayTokens.find((t: any) => t.patientId === Number(patientId))
            if (patientToken) {
                tokenNumber = patientToken.tokenNumber
            } else {
                // Estimate next token number
                const maxToken = todayTokens.reduce((max: number, t: any) =>
                    Math.max(max, t.tokenNumber), 0)
                tokenNumber = maxToken + 1
            }

            const token = tokenNumber.toString().padStart(2, '0')
            const visit = visitCount.toString().padStart(2, '0')

            return `${yy}${mm}${dd} ${token} ${visit}`
        } catch (error) {
            console.error('Error generating OPD preview:', error)
            return ''
        }
    }

    // Track treatment plan modifications
    const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null)
    const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState<any>(null)
    const [originalTreatmentData, setOriginalTreatmentData] = useState<any[]>([])
    const [showSaveModal, setShowSaveModal] = useState(false)
    const [pendingSubmit, setPendingSubmit] = useState<any>(null)
    const [showNavigationModal, setShowNavigationModal] = useState(false)
    const [createdTreatmentId, setCreatedTreatmentId] = useState<string | null>(null)
    const [savedVisitIdForNav, setSavedVisitIdForNav] = useState<string | null>(null)
    const [creatingTreatment, setCreatingTreatment] = useState(false)
    const [treatmentModalMessage, setTreatmentModalMessage] = useState('Creating Treatment Plan and Saving Prescription...')
    const [generatedOpdNo, setGeneratedOpdNo] = useState<string>('')
    const [hasDraft, setHasDraft] = useState(false)
    const [showRestoreDraftModal, setShowRestoreDraftModal] = useState(false)
    const [draftData, setDraftData] = useState<any>(null)
    const [currentStep, setCurrentStep] = useState(1)
    const [isPatientSelectOpen, setIsPatientSelectOpen] = useState(false)
    const [isGenderOpen, setIsGenderOpen] = useState(false)
    const [isTemperamentOpen, setIsTemperamentOpen] = useState(false)
    const [isPulseDiagnosisOpen, setIsPulseDiagnosisOpen] = useState(false)
    const [isPulseDiagnosis2Open, setIsPulseDiagnosis2Open] = useState(false)
    const [isTreatmentSelectOpen, setIsTreatmentSelectOpen] = useState(false)
    const [isMedicineSelectOpen, setIsMedicineSelectOpen] = useState(false)
    const [isPrescriptionDropdownOpen, setIsPrescriptionDropdownOpen] = useState<{ [key: number]: { [field: string]: boolean } }>({})

    // Step configuration
    const steps = [
        { number: 1, title: 'Patient Info', description: 'Patient details' },
        { number: 2, title: 'Clinical', description: 'Clinical information' },
        { number: 3, title: 'Next Visit', description: 'Visit tracking' },
        { number: 4, title: 'Medicines', description: 'Select medicines' },
        { number: 5, title: 'Prescriptions', description: 'Medicine details' },
        { number: 6, title: 'Payment', description: 'Financial info' },
    ]

    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    // Fetch all required data eagerly on mount
    useEffect(() => {
        const fetchData = async () => {
            setDataLoading(true)
            try {
                const [patientsRes, treatmentsRes, productsRes] = await Promise.all([
                    fetch('/api/patients'),
                    fetch('/api/treatments'),
                    fetch('/api/products')
                ])

                const patientsData = await patientsRes.json()
                const treatmentsData = await treatmentsRes.json()
                const productsData = await productsRes.json()

                console.log('Patients fetched:', patientsData)
                setPatients(Array.isArray(patientsData) ? patientsData : [])
                setTreatments(treatmentsData)
                setProducts(productsData)
            } catch (err) {
                console.error('Error fetching data:', err)
                setPatients([])
            } finally {
                setDataLoading(false)
            }
        }
        fetchData()
    }, [])

    // Set patientId and visitNumber from URL query parameters
    useEffect(() => {
        const { patientId, visitNumber } = router.query
        if (patientId && !isEditMode && patients.length > 0) {
            const found = patients.find(p => String(p.id) === String(patientId))
            if (found) {
                // Fetch the most recent visit for this patient to get opdNo
                fetch(`/api/visits?patientId=${patientId}`)
                    .then(r => r.json())
                    .then(async (patientVisits: any[]) => {
                        const latestVisit = patientVisits.length > 0 ? patientVisits[0] : null

                        // Generate preview for new visits
                        let previewOpdNo = ''
                        if (!latestVisit?.opdNo) {
                            previewOpdNo = await generateOpdNoPreview(String(patientId))
                            setGeneratedOpdNo(previewOpdNo)
                        }

                        setForm((prev: any) => ({
                            ...prev,
                            patientId: String(patientId),
                            opdNo: latestVisit?.opdNo || previewOpdNo,
                            visitNumber: visitNumber ? String(visitNumber) : prev.visitNumber,
                            dob: formatDateForInput(found.dob),
                            age: found.age ?? '',
                            address: found.address || '',
                            gender: found.gender || '',
                            phone: found.phone || '',
                            occupation: found.occupation || '',
                            pendingPaymentCents: found.pendingPaymentCents ?? '',
                            height: found.height ?? '',
                            weight: found.weight ?? '',
                            fatherHusbandGuardianName: found.fatherHusbandGuardianName || '',
                            // Load clinical information from patient record
                            temperament: found.temperament || '',
                            pulseDiagnosis: found.pulseDiagnosis || '',
                            pulseDiagnosis2: found.pulseDiagnosis2 || '',
                            majorComplaints: found.majorComplaints || '',
                            historyReports: found.historyReports || '',
                            investigations: found.investigations || '',
                            provisionalDiagnosis: found.provisionalDiagnosis || '',
                            improvements: found.improvements || ''
                        }))
                    })
                    .catch(() => {
                        // If fetch fails, just set patient data without opdNo
                        setForm((prev: any) => ({
                            ...prev,
                            patientId: String(patientId),
                            opdNo: '',
                            visitNumber: visitNumber ? String(visitNumber) : prev.visitNumber,
                            dob: formatDateForInput(found.dob),
                            age: found.age ?? '',
                            address: found.address || '',
                            gender: found.gender || '',
                            phone: found.phone || '',
                            occupation: found.occupation || '',
                            pendingPaymentCents: found.pendingPaymentCents ?? '',
                            height: found.height ?? '',
                            weight: found.weight ?? '',
                            fatherHusbandGuardianName: found.fatherHusbandGuardianName || '',
                            // Load clinical information from patient record
                            temperament: found.temperament || '',
                            pulseDiagnosis: found.pulseDiagnosis || '',
                            pulseDiagnosis2: found.pulseDiagnosis2 || '',
                            majorComplaints: found.majorComplaints || '',
                            historyReports: found.historyReports || '',
                            investigations: found.investigations || '',
                            provisionalDiagnosis: found.provisionalDiagnosis || '',
                            improvements: found.improvements || ''
                        }))
                    })
            } else {
                setForm((prev: any) => ({
                    ...prev,
                    patientId: String(patientId),
                    visitNumber: visitNumber ? String(visitNumber) : prev.visitNumber
                }))
            }
        }
    }, [router.query.patientId, router.query.visitNumber, isEditMode, patients])

    // Fetch previous weight when patient is selected
    useEffect(() => {
        if (form.patientId && !isEditMode) {
            fetch(`/api/visits?patientId=${form.patientId}`)
                .then(r => r.json())
                .then(visits => {
                    if (visits && visits.length > 0) {
                        // Sort by date descending and get the most recent visit
                        const sortedVisits = visits.sort((a: any, b: any) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        )
                        const lastVisit = sortedVisits[0]
                        if (lastVisit.patient?.weight) {
                            setPreviousWeight(lastVisit.patient.weight)
                        }
                    }
                })
                .catch(err => console.error('Error fetching previous weight:', err))
        }
    }, [form.patientId, isEditMode])

    // Auto-calculate amount from prescriptions
    useEffect(() => {
        if (prescriptions.length === 0 || products.length === 0) return

        let totalAmount = 0
        let spyBottleAdded = false
        let additionsBottleAdded = false

        prescriptions.forEach(pr => {
            const product = products.find(p => String(p.id) === String(pr.productId))
            if (product && product.priceRupees !== undefined) {
                const quantity = parseInt(pr.quantity) || 1
                // priceRupees is in rupees per unit
                totalAmount += (Number(product.priceRupees) * quantity)
            }

            // Add spy bottle price only once if any spy4-spy6 are filled
            if (!spyBottleAdded && (pr.spy4 || pr.spy5 || pr.spy6) && pr.spyBottleSize) {
                const bottlePrice = bottlePricing.find(b => b.value === pr.spyBottleSize)
                if (bottlePrice) {
                    totalAmount += bottlePrice.price
                    spyBottleAdded = true
                }
            }

            // Add additions bottle price only once if any addition1-addition3 are filled
            if (!additionsBottleAdded && (pr.addition1 || pr.addition2 || pr.addition3) && pr.additionsBottleSize) {
                const bottlePrice = bottlePricing.find(b => b.value === pr.additionsBottleSize)
                if (bottlePrice) {
                    totalAmount += bottlePrice.price
                    additionsBottleAdded = true
                }
            }
        })

        const amountInRupees = totalAmount.toFixed(2)
        setForm((prev: any) => ({ ...prev, amount: amountInRupees }))
    }, [prescriptions, products])

    // Auto-calculate balance when amount, discount, or payment changes
    useEffect(() => {
        const amount = parseFloat(form.amount) || 0
        const discount = parseFloat(form.discount) || 0
        const payment = parseFloat(form.payment) || 0
        const balance = (amount - discount - payment).toFixed(2)

        setForm((prev: any) => ({ ...prev, balance }))
    }, [form.amount, form.discount, form.payment])

    // Auto-convert height: cm to feet-inches
    useEffect(() => {
        if (isUpdatingHeightFromFeet.current) {
            isUpdatingHeightFromFeet.current = false
            return
        }

        if (form.height && form.height !== '') {
            const cm = parseFloat(form.height)
            if (!isNaN(cm) && cm > 0) {
                const totalInches = cm / 2.54
                const feet = Math.floor(totalInches / 12)
                const inches = Math.round(totalInches % 12)
                const calculatedFeet = feet.toString()
                const calculatedInches = inches.toString()
                if (form.heightFeet !== calculatedFeet || form.heightInches !== calculatedInches) {
                    isUpdatingFeetFromHeight.current = true
                    setForm((prev: any) => ({ ...prev, heightFeet: calculatedFeet, heightInches: calculatedInches }))
                }
            }
        }
    }, [form.height])

    // Auto-convert height: feet-inches to cm
    useEffect(() => {
        if (isUpdatingFeetFromHeight.current) {
            isUpdatingFeetFromHeight.current = false
            return
        }

        if ((form.heightFeet !== '' || form.heightInches !== '') && form.heightFeet !== undefined && form.heightInches !== undefined) {
            const feet = parseFloat(form.heightFeet) || 0
            const inches = parseFloat(form.heightInches) || 0
            if (feet > 0 || inches > 0) {
                const totalInches = (feet * 12) + inches
                const cm = Math.round(totalInches * 2.54)
                const calculatedHeight = cm.toString()
                if (form.height !== calculatedHeight) {
                    isUpdatingHeightFromFeet.current = true
                    setForm((prev: any) => ({ ...prev, height: calculatedHeight }))
                }
            }
        }
    }, [form.heightFeet, form.heightInches])

    // Auto-save form data to localStorage (with debounce)
    useEffect(() => {
        if (isEditMode) return // Don't auto-save in edit mode

        const timeoutId = setTimeout(() => {
            try {
                const draftData = {
                    form,
                    prescriptions,
                    timestamp: Date.now()
                }
                localStorage.setItem('prescriptionDraft', JSON.stringify(draftData))
                setHasDraft(true)
                console.log('Draft auto-saved')
            } catch (err) {
                console.error('Failed to save draft:', err)
            }
        }, 2000) // Save 2 seconds after user stops typing

        return () => clearTimeout(timeoutId)
    }, [form, prescriptions, isEditMode])

    // Restore draft on mount
    useEffect(() => {
        if (isEditMode) return // Don't restore in edit mode
        if (router.query.patientId) return // Don't restore if patient is pre-selected from URL

        try {
            const savedDraft = localStorage.getItem('prescriptionDraft')
            if (savedDraft) {
                const draftData = JSON.parse(savedDraft)
                const age = Date.now() - draftData.timestamp
                const maxAge = 24 * 60 * 60 * 1000 // 24 hours

                // Only restore if draft is less than 24 hours old
                if (age < maxAge) {
                    setHasDraft(true)
                    setDraftData(draftData)
                    setShowRestoreDraftModal(true)
                } else {
                    // Draft is too old, remove it
                    localStorage.removeItem('prescriptionDraft')
                    setHasDraft(false)
                }
            }
        } catch (err) {
            console.error('Failed to restore draft:', err)
        }
    }, []) // Only run once on mount

    // Auto-calculate age from DOB
    useEffect(() => {
        if (form.dob && form.dob !== '') {
            const birthDate = new Date(form.dob)
            const today = new Date()
            let age = today.getFullYear() - birthDate.getFullYear()
            const monthDiff = today.getMonth() - birthDate.getMonth()
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--
            }
            if (age >= 0) {
                setForm((prev: any) => ({ ...prev, age: age.toString() }))
            }
        }
    }, [form.dob])

    // Auto-calculate approximate DOB from age (but don't override if DOB was just calculated from itself)
    useEffect(() => {
        if (form.age && form.age !== '') {
            const age = parseInt(form.age)
            if (!isNaN(age) && age >= 0) {
                const today = new Date()
                const birthYear = today.getFullYear() - age
                const approxDob = new Date(birthYear, today.getMonth(), today.getDate())
                const newDob = approxDob.toISOString().split('T')[0]

                // Only update if the calculated DOB would be different
                if (form.dob !== newDob) {
                    setForm((prev: any) => ({ ...prev, dob: newDob }))
                }
            }
        }
    }, [form.age])

    // Load existing visit data when in edit mode
    useEffect(() => {
        if (isEditMode && visitId) {
            setLoading(true)
            // Fetch all treatments including deleted ones for edit mode
            fetch('/api/treatments?includeDeleted=true')
                .then(r => r.json())
                .then(allTreatments => setTreatments(allTreatments))
                .catch(err => console.error('Error loading treatments:', err))

            fetch(`/api/visits?id=${visitId}`)
                .then(r => r.json())
                .then(visit => {
                    if (!visit) {
                        showError('Visit not found')
                        router.push('/visits')
                        return
                    }

                    // Split nextVisit into date and time
                    let nextVisitDate = ''
                    let nextVisitTime = ''
                    if (visit.nextVisit) {
                        const dt = new Date(visit.nextVisit).toISOString()
                        nextVisitDate = dt.slice(0, 10)
                        nextVisitTime = dt.slice(11, 16)
                    }

                    // Pre-fill form with existing data
                    setForm({
                        patientId: String(visit.patientId),
                        opdNo: visit.opdNo || '',
                        date: formatDateForInput(visit.date),
                        temperament: visit.temperament || '',
                        pulseDiagnosis: visit.pulseDiagnosis || '',
                        pulseDiagnosis2: visit.pulseDiagnosis2 || '',
                        majorComplaints: visit.majorComplaints || '',
                        historyReports: visit.historyReports || '',
                        investigations: visit.investigations || '',
                        reports: visit.reports || '',
                        provisionalDiagnosis: visit.provisionalDiagnosis || '',
                        improvements: visit.improvements || '',
                        specialNote: visit.specialNote || '',
                        dob: formatDateForInput(visit.patient?.dob),
                        age: visit.patient?.age ?? '',
                        address: visit.patient?.address || '',
                        gender: visit.patient?.gender || '',
                        phone: visit.patient?.phone || '',
                        nextVisitDate,
                        nextVisitTime,
                        occupation: visit.patient?.occupation || '',
                        pendingPaymentCents: visit.patient?.pendingPaymentCents ?? '',
                        height: visit.height ?? visit.patient?.height ?? '',
                        weight: visit.weight ?? visit.patient?.weight ?? '',
                        fatherHusbandGuardianName: visit.patient?.fatherHusbandGuardianName || '',
                        imageUrl: visit.patient?.imageUrl || '',
                        amount: visit.amount ?? '',
                        discount: visit.discount ?? '',
                        payment: visit.payment ?? '',
                        balance: visit.balance ?? '',
                        visitNumber: visit.visitNumber ?? '',
                        followUpCount: visit.followUpCount ?? ''
                    })

                    // Load reports attachments if they exist
                    if (visit.reportsAttachments) {
                        try {
                            const parsed = JSON.parse(visit.reportsAttachments)
                            if (Array.isArray(parsed)) {
                                setReportsAttachments(parsed)
                            }
                        } catch (e) {
                            console.error('Failed to parse reportsAttachments:', e)
                            setReportsAttachments([])
                        }
                    }

                    // Pre-fill prescriptions
                    if (visit.prescriptions && visit.prescriptions.length > 0) {
                        const loadedPrescriptions = visit.prescriptions.map((p: any) => ({
                            treatmentId: p.treatmentId ? String(p.treatmentId) : '',
                            productId: String(p.productId),
                            spy1: p.spy1 || '',
                            spy2: p.spy2 || '',
                            spy3: p.spy3 || '',
                            spy4: p.spy4 || '',
                            spy5: p.spy5 || '',
                            spy6: p.spy6 || '',
                            quantity: p.quantity || 1,
                            timing: p.timing || '',
                            dosage: p.dosage || '',
                            addition1: p.addition1 || '',
                            addition2: p.addition2 || '',
                            addition3: p.addition3 || '',
                            procedure: p.procedure || '',
                            presentation: p.presentation || '',
                            droppersToday: p.droppersToday?.toString() || '',
                            medicineQuantity: p.medicineQuantity?.toString() || '',
                            administration: p.administration || '',
                            patientHasMedicine: p.patientHasMedicine || false
                        }))

                        setPrescriptions(loadedPrescriptions)

                        // Check if prescriptions have a treatment plan attached
                        const firstTreatmentId = visit.prescriptions[0]?.treatmentId
                        if (firstTreatmentId) {
                            // Set the selected treatment ID
                            setSelectedTreatmentId(String(firstTreatmentId))
                            // Fetch and store the full treatment plan object (including deleted ones)
                            fetch(`/api/treatments?includeDeleted=true`)
                                .then(r => r.json())
                                .then(allTreatments => {
                                    const treatment = allTreatments.find((t: any) => String(t.id) === String(firstTreatmentId))
                                    if (treatment) {
                                        setSelectedTreatmentPlan(treatment)
                                    }
                                })
                                .catch(err => console.error('Error fetching treatment plan:', err))
                            // Store original treatment data for comparison
                            setOriginalTreatmentData(JSON.parse(JSON.stringify(loadedPrescriptions)))
                        }
                    }

                    setLoading(false)
                })
                .catch(err => {
                    console.error(err)
                    showError('Failed to load visit data')
                    setLoading(false)
                })
        }
    }, [isEditMode, visitId, router])

    // Handle copying data from previous visit
    useEffect(() => {
        const { copyFromVisitId } = router.query
        if (copyFromVisitId && !isEditMode) {
            setLoading(true)
            fetch(`/api/visits?id=${copyFromVisitId}`)
                .then(r => r.json())
                .then(visit => {
                    if (!visit) {
                        showError('Previous visit not found')
                        setLoading(false)
                        return
                    }

                    // Pre-fill form with previous visit data (but keep patientId if already set)
                    setForm((prevForm: any) => ({
                        ...prevForm,
                        temperament: visit.temperament || '',
                        pulseDiagnosis: visit.pulseDiagnosis || '',
                        pulseDiagnosis2: visit.pulseDiagnosis2 || '',
                        majorComplaints: visit.majorComplaints || '',
                        historyReports: visit.historyReports || '',
                        investigations: visit.investigations || '',
                        reports: visit.reports || '',
                        provisionalDiagnosis: visit.provisionalDiagnosis || '',
                        improvements: visit.improvements || '',
                        specialNote: visit.specialNote || ''
                    }))

                    // Pre-fill prescriptions from previous visit
                    if (visit.prescriptions && visit.prescriptions.length > 0) {
                        const copiedPrescriptions = visit.prescriptions.map((p: any) => ({
                            treatmentId: p.treatmentId ? String(p.treatmentId) : '',
                            productId: String(p.productId),
                            spy1: p.spy1 || '',
                            spy2: p.spy2 || '',
                            spy3: p.spy3 || '',
                            spy4: p.spy4 || '',
                            spy5: p.spy5 || '',
                            spy6: p.spy6 || '',
                            quantity: p.quantity || 1,
                            timing: p.timing || '',
                            dosage: p.dosage || '',
                            addition1: p.addition1 || '',
                            addition2: p.addition2 || '',
                            addition3: p.addition3 || '',
                            procedure: p.procedure || '',
                            presentation: p.presentation || '',
                            droppersToday: p.droppersToday?.toString() || '',
                            medicineQuantity: p.medicineQuantity?.toString() || '',
                            administration: p.administration || '',
                            patientHasMedicine: false // Reset for new visit
                        }))

                        setPrescriptions(copiedPrescriptions)

                        // Check if prescriptions have a treatment plan attached
                        const firstTreatmentId = visit.prescriptions[0]?.treatmentId
                        if (firstTreatmentId) {
                            setSelectedTreatmentId(String(firstTreatmentId))
                            fetch(`/api/treatments?includeDeleted=true`)
                                .then(r => r.json())
                                .then(allTreatments => {
                                    const treatment = allTreatments.find((t: any) => String(t.id) === String(firstTreatmentId))
                                    if (treatment) {
                                        setSelectedTreatmentPlan(treatment)
                                    }
                                })
                                .catch(err => console.error('Error fetching treatment plan:', err))
                        }
                    }

                    // Show success toast only once after all data is loaded
                    showSuccess('Previous visit data loaded successfully')
                    setLoading(false)
                })
                .catch(err => {
                    console.error(err)
                    showError('Failed to load previous visit data')
                    setLoading(false)
                })
        }
    }, [router.query.copyFromVisitId, isEditMode])

    // Auto-calculate followUpCount based on nextVisitDate
    useEffect(() => {
        if (isUpdatingDateFromCount.current) {
            isUpdatingDateFromCount.current = false
            return
        }

        if (form.nextVisitDate) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const nextVisit = new Date(form.nextVisitDate)
            nextVisit.setHours(0, 0, 0, 0)

            const diffTime = nextVisit.getTime() - today.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (diffDays >= 0 && form.followUpCount !== diffDays.toString()) {
                isUpdatingCountFromDate.current = true
                setForm((prev: any) => ({ ...prev, followUpCount: diffDays.toString() }))
            }
        }
    }, [form.nextVisitDate])

    // Auto-calculate nextVisitDate based on followUpCount
    useEffect(() => {
        if (isUpdatingCountFromDate.current) {
            isUpdatingCountFromDate.current = false
            return
        }

        if (form.followUpCount && form.followUpCount !== '' && !isNaN(Number(form.followUpCount))) {
            const today = new Date()
            const daysToAdd = parseInt(form.followUpCount, 10)

            if (daysToAdd >= 0) {
                const nextDate = new Date(today)
                nextDate.setDate(today.getDate() + daysToAdd)

                const formattedDate = nextDate.toISOString().split('T')[0]

                if (form.nextVisitDate !== formattedDate) {
                    isUpdatingDateFromCount.current = true
                    setForm((prev: any) => ({ ...prev, nextVisitDate: formattedDate }))
                }
            }
        }
    }, [form.followUpCount])

    async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files || files.length === 0) return

        // Check total file count
        if (attachments.length + files.length > 10) {
            showError('You can upload a maximum of 10 files')
            return
        }

        setUploadingAttachment(true)
        try {
            const uploadedFiles: Array<{ url: string, name: string, type: string }> = []

            // Get patient name for folder organization
            const selectedPatient = patients.find(p => String(p.id) === String(form.patientId))
            const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Unknown Patient'

            for (let i = 0; i < files.length; i++) {
                const file = files[i]

                // Validate file size (max 10MB per file)
                if (file.size > 10 * 1024 * 1024) {
                    showError(`File "${file.name}" is too large. Maximum size is 10MB.`)
                    continue
                }

                // Convert to base64
                const reader = new FileReader()
                const base64 = await new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })

                // Upload to Google Drive with patient name in folder path
                const res = await fetch('/api/upload-to-drive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file: base64,
                        fileName: file.name,
                        mimeType: file.type,
                        patientName: patientName
                    })
                })

                const data = await res.json()
                if (res.ok) {
                    uploadedFiles.push({
                        url: data.webViewLink,
                        name: file.name,
                        type: file.type
                    })
                } else {
                    throw new Error(data.error || `Failed to upload ${file.name}`)
                }
            }

            setAttachments([...attachments, ...uploadedFiles])
        } catch (error: any) {
            console.error('Attachment upload error:', error)
            showError(`Failed to upload attachments: ${error.message || 'Unknown error'}`)
        } finally {
            setUploadingAttachment(false)
            // Reset input
            e.target.value = ''
        }
    }

    function removeAttachment(index: number) {
        setAttachments(attachments.filter((_, i) => i !== index))
    }

    async function handleReportsAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files || files.length === 0) return

        if (!form.patientId) {
            showError('Please select a patient first')
            e.target.value = ''
            return
        }

        if (reportsAttachments.length + files.length > 10) {
            showError('You can upload a maximum of 10 files')
            return
        }

        setUploadingReports(true)
        try {
            const uploadedFiles: Array<{ url: string, name: string, type: string }> = []
            const selectedPatient = patients.find(p => String(p.id) === String(form.patientId))
            const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Unknown Patient'

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                if (file.size > 10 * 1024 * 1024) {
                    showError(`File "${file.name}" is too large. Maximum size is 10MB.`)
                    continue
                }

                const reader = new FileReader()
                const base64 = await new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })

                const res = await fetch('/api/upload-to-drive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file: base64,
                        fileName: file.name,
                        mimeType: file.type,
                        patientName: `${patientName}/reports`
                    })
                })

                const data = await res.json()
                if (res.ok) {
                    uploadedFiles.push({
                        url: data.webViewLink,
                        name: file.name,
                        type: file.type
                    })
                } else {
                    throw new Error(data.error || `Failed to upload ${file.name}`)
                }
            }

            setReportsAttachments([...reportsAttachments, ...uploadedFiles])
        } catch (error: any) {
            console.error('Reports attachment upload error:', error)
            showError(`Failed to upload attachments: ${error.message || 'Unknown error'}`)
        } finally {
            setUploadingReports(false)
            e.target.value = ''
        }
    }

    // Handle captured image from camera modal
    async function handleCameraCapture(imageData: string) {
        if (!form.patientId) {
            showError('Please select a patient first')
            return
        }

        if (reportsAttachments.length >= 10) {
            showError('You can upload a maximum of 10 files')
            return
        }

        setUploadingReports(true)
        try {
            const selectedPatient = patients.find(p => String(p.id) === String(form.patientId))
            const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Unknown Patient'
            const fileName = `document_${Date.now()}.jpg`

            const res = await fetch('/api/upload-to-drive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: imageData,
                    fileName: fileName,
                    mimeType: 'image/jpeg',
                    patientName: `${patientName}/reports`
                })
            })

            const data = await res.json()
            if (res.ok) {
                setReportsAttachments([...reportsAttachments, {
                    url: data.webViewLink,
                    name: fileName,
                    type: 'image/jpeg'
                }])
            } else {
                throw new Error(data.error || 'Failed to upload captured image')
            }
        } catch (error: any) {
            console.error('Camera capture upload error:', error)
            showError(`Failed to upload image: ${error.message || 'Unknown error'}`)
        } finally {
            setUploadingReports(false)
        }
    }

    function removeReportsAttachment(index: number) {
        setReportsAttachments(reportsAttachments.filter((_, i) => i !== index))
    }

    // Camera functions
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraFacingMode }
            })
            setCameraStream(stream)
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
            setShowCamera(true)
        } catch (error) {
            console.error('Camera access error:', error)
            showError('Unable to access camera. Please check permissions.')
        }
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop())
            setCameraStream(null)
        }
        setShowCamera(false)
    }

    function toggleCameraFacing() {
        const newFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user'
        setCameraFacingMode(newFacingMode)
        if (cameraStream) {
            stopCamera()
            setTimeout(() => startCamera(), 100)
        }
    }

    async function capturePhoto() {
        if (!videoRef.current || !form.patientId) {
            showError('Please select a patient first')
            return
        }

        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(videoRef.current, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

        setUploadingReports(true)
        try {
            const selectedPatient = patients.find(p => String(p.id) === String(form.patientId))
            const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Unknown Patient'
            const fileName = `capture_${Date.now()}.jpg`

            const res = await fetch('/api/upload-to-drive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: dataUrl,
                    fileName: fileName,
                    mimeType: 'image/jpeg',
                    patientName: `${patientName}/reports`
                })
            })

            const data = await res.json()
            if (res.ok) {
                setReportsAttachments([...reportsAttachments, {
                    url: data.webViewLink,
                    name: fileName,
                    type: 'image/jpeg'
                }])
                stopCamera()
                showSuccess('Photo captured and uploaded successfully!')
            } else {
                throw new Error(data.error || 'Upload failed')
            }
        } catch (error: any) {
            console.error('Photo capture error:', error)
            showError(`Failed to upload photo: ${error.message || 'Unknown error'}`)
        } finally {
            setUploadingReports(false)
        }
    }

    // Helper functions for component and dosage parsing
    function parseComponent(compValue: string): { name: string; volume: string } {
        if (!compValue) return { name: '', volume: '' }
        const parts = compValue.split('|')
        return { name: parts[0] || '', volume: parts[1] || '' }
    }

    function formatComponent(name: string, volume: string): string {
        if (!name && !volume) return ''
        return `${name}|${volume}`
    }

    function parseDosage(dosageValue: string): { quantity: string; timing: string; dilution: string } {
        if (!dosageValue) return { quantity: '', timing: '', dilution: '' }
        const parts = dosageValue.split('|')
        if (parts.length >= 3) {
            return { quantity: parts[0] || '', timing: parts[1] || '', dilution: parts[2] || '' }
        }
        // Try to parse old format (e.g., "10/DRP/TDS/WTR")
        const oldParts = dosageValue.split('/')
        if (oldParts.length >= 3) {
            return {
                quantity: oldParts[0] || '',
                timing: oldParts[2] || '',
                dilution: oldParts[3] || ''
            }
        }
        return { quantity: '', timing: '', dilution: '' }
    }

    function formatDosage(quantity: string, timing: string, dilution: string): string {
        if (!quantity && !timing && !dilution) return ''
        return `${quantity}|${timing}|${dilution}`
    }

    function addSelectedProductToPrescription() {
        if (!selectedProductId) return showError('Select a medicine first')
        const prod = products.find(p => String(p.id) === String(selectedProductId))
        if (!prod) return showError('Selected product not found')

        // Clear treatment plan tracking when adding individual medicine
        setSelectedTreatmentId(null)
        setSelectedTreatmentPlan(null)
        setOriginalTreatmentData([])

        setPrescriptions([...prescriptions, {
            treatmentId: '', productId: String(prod.id),
            spy1: '', spy2: '', spy3: '', spy4: '', spy5: '', spy6: '',
            quantity: 1, timing: '', dosage: '',
            addition1: '', addition2: '', addition3: '',
            procedure: '', presentation: '',
            droppersToday: '', medicineQuantity: '',
            administration: '', patientHasMedicine: false,
            spyBottleSize: '', additionsBottleSize: ''
        }])
    }

    function addToSelectedMedicines() {
        if (!selectedProductId) return showError('Select a medicine first')

        // Check if already in the list
        if (selectedMedicines.includes(selectedProductId)) {
            return showInfo('This medicine is already in your selection')
        }

        setSelectedMedicines([...selectedMedicines, selectedProductId])
        setSelectedProductId('') // Clear the dropdown
    }

    function removeFromSelectedMedicines(productId: string) {
        setSelectedMedicines(selectedMedicines.filter(id => id !== productId))
    }

    function removeAllSelectedMedicines() {
        setSelectedMedicines([])
    }

    function addAllSelectedMedicinesToPrescription() {
        if (selectedMedicines.length === 0) return showError('No medicines selected')

        const newPrescriptions = selectedMedicines.map(productId => ({
            treatmentId: selectedTreatmentId || '', // Use selected treatment plan if any
            productId: productId,
            spy1: '', spy2: '', spy3: '', spy4: '', spy5: '', spy6: '',
            quantity: 1, timing: '', dosage: '',
            addition1: '', addition2: '', addition3: '',
            procedure: '', presentation: '',
            droppersToday: '', medicineQuantity: '',
            administration: '', patientHasMedicine: false,
            spyBottleSize: '', additionsBottleSize: ''
        }))

        setPrescriptions([...prescriptions, ...newPrescriptions])
        setSelectedMedicines([]) // Clear the selected medicines
        showSuccess('Medicines added to prescription successfully')
    }

    function handleRestoreDraft() {
        if (draftData) {
            setForm(draftData.form)
            setPrescriptions(draftData.prescriptions)
            showSuccess('Draft restored successfully!')
        }
        setShowRestoreDraftModal(false)
    }

    function handleDiscardDraft() {
        localStorage.removeItem('prescriptionDraft')
        setHasDraft(false)
        setShowRestoreDraftModal(false)
    }

    // Helpers to format dates for inputs
    function formatDateForInput(dateStr?: string | null) {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return ''
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
    }

    function formatDateTimeLocal(dateStr?: string | null) {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return ''
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const min = String(d.getMinutes()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`
    }

    // When a patient is selected, populate the patient-related fields from the loaded patient record
    function handlePatientChange(e: any) {
        const id = e.target.value
        setForm((prev: any) => ({ ...prev, patientId: id }))
        const found = patients.find(p => String(p.id) === String(id))
        if (!found) return

        // Split nextVisit into date and time
        let nextVisitDate = ''
        let nextVisitTime = ''
        if (found.nextVisit) {
            const dt = new Date(found.nextVisit).toISOString()
            nextVisitDate = dt.slice(0, 10)
            nextVisitTime = dt.slice(11, 16)
        }

        // Fetch the most recent visit for this patient to get opdNo
        fetch(`/api/visits?patientId=${id}`)
            .then(r => r.json())
            .then(async (patientVisits: any[]) => {
                const latestVisit = patientVisits.length > 0 ? patientVisits[0] : null

                // Generate preview for new visits
                let previewOpdNo = ''
                if (!latestVisit?.opdNo) {
                    previewOpdNo = await generateOpdNoPreview(id)
                    setGeneratedOpdNo(previewOpdNo)
                }

                setForm((prev: any) => ({
                    ...prev,
                    patientId: String(found.id),
                    opdNo: latestVisit?.opdNo || previewOpdNo,
                    dob: formatDateForInput(found.dob),
                    age: found.age ?? '',
                    address: found.address || '',
                    gender: found.gender || '',
                    phone: found.phone || '',
                    nextVisitDate,
                    nextVisitTime,
                    occupation: found.occupation || '',
                    pendingPaymentCents: found.pendingPaymentCents ?? '',
                    height: found.height ?? '',
                    weight: found.weight ?? '',
                    // Load clinical information from patient record
                    temperament: found.temperament || '',
                    pulseDiagnosis: found.pulseDiagnosis || '',
                    pulseDiagnosis2: found.pulseDiagnosis2 || '',
                    majorComplaints: found.majorComplaints || '',
                    historyReports: found.historyReports || '',
                    investigations: found.investigations || '',
                    provisionalDiagnosis: found.provisionalDiagnosis || '',
                    improvements: found.improvements || ''
                }))
            })
            .catch(() => {
                // If fetch fails, just set patient data without opdNo
                setForm((prev: any) => ({
                    ...prev,
                    patientId: String(found.id),
                    opdNo: '',
                    dob: formatDateForInput(found.dob),
                    age: found.age ?? '',
                    address: found.address || '',
                    gender: found.gender || '',
                    phone: found.phone || '',
                    nextVisitDate,
                    nextVisitTime,
                    occupation: found.occupation || '',
                    pendingPaymentCents: found.pendingPaymentCents ?? '',
                    height: found.height ?? '',
                    weight: found.weight ?? '',
                    // Load clinical information from patient record
                    temperament: found.temperament || '',
                    pulseDiagnosis: found.pulseDiagnosis || '',
                    pulseDiagnosis2: found.pulseDiagnosis2 || '',
                    majorComplaints: found.majorComplaints || '',
                    historyReports: found.historyReports || '',
                    investigations: found.investigations || '',
                    provisionalDiagnosis: found.provisionalDiagnosis || '',
                    improvements: found.improvements || ''
                }))
            })
    }

    function addEmptyPrescription() {
        // Clear treatment plan tracking when adding empty row
        setSelectedTreatmentId(null)
        setSelectedTreatmentPlan(null)
        setOriginalTreatmentData([])

        setPrescriptions([...prescriptions, {
            treatmentId: '', productId: '',
            spy1: '', spy2: '', spy3: '', spy4: '', spy5: '', spy6: '',
            quantity: 1, timing: '', dosage: '',
            addition1: '', addition2: '', addition3: '',
            procedure: '', presentation: '',
            droppersToday: '', medicineQuantity: '',
            administration: '', patientHasMedicine: false,
            spyBottleSize: '', additionsBottleSize: ''
        }])
    }

    function updatePrescription(i: number, patch: any) {
        const copy = [...prescriptions]

        // If treatmentId is being updated, auto-fill all related fields
        if (patch.treatmentId !== undefined) {
            const treatment = treatments.find(t => String(t.id) === String(patch.treatmentId))
            if (treatment && treatment.treatmentProducts && treatment.treatmentProducts.length > 0) {
                // Get the first product from the treatment (or you could create multiple prescriptions)
                const firstProduct = treatment.treatmentProducts[0]

                // Auto-fill all fields from treatment and its first product
                copy[i] = {
                    ...copy[i],
                    treatmentId: patch.treatmentId,
                    productId: String(firstProduct.productId),
                    spy1: firstProduct.spy1 || '',
                    spy2: firstProduct.spy2 || '',
                    spy3: firstProduct.spy3 || '',
                    spy4: firstProduct.spy4 || '',
                    spy5: firstProduct.spy5 || '',
                    spy6: firstProduct.spy6 || '',
                    quantity: firstProduct.quantity || treatment.quantity || 1,
                    timing: firstProduct.timing || '',
                    dosage: firstProduct.dosage || treatment.dosage || '',
                    additions: firstProduct.additions || '',
                    addition1: firstProduct.addition1 || '',
                    addition2: firstProduct.addition2 || '',
                    addition3: firstProduct.addition3 || '',
                    procedure: firstProduct.procedure || treatment.procedure || '',
                    presentation: firstProduct.presentation || '',
                    droppersToday: firstProduct.droppersToday?.toString() || '',
                    medicineQuantity: firstProduct.medicineQuantity?.toString() || '',
                    administration: treatment.administration || ''
                }
                setPrescriptions(copy)
                return
            }
        }

        copy[i] = { ...copy[i], ...patch }
        setPrescriptions(copy)
    }

    // Step navigation functions
    const nextStep = () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const goToStep = (stepNumber: number) => {
        if (stepNumber >= 1 && stepNumber <= steps.length) {
            setCurrentStep(stepNumber)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    async function submit(e: any) {
        e.preventDefault()

        // Clear previous errors
        setFieldErrors({})

        // Validate required fields
        const errors: { [key: string]: string } = {}

        if (!form.patientId) {
            errors.patientId = 'Patient is required'
        }

        // If there are validation errors, show them and scroll to first error
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
            showError('Please select a patient before creating a visit')

            // Scroll to Patient Information card
            const patientCard = document.querySelector('.card')
            if (patientCard) {
                patientCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            return
        }

        // Check if treatment plan was modified
        if (selectedTreatmentId && hasModifiedTreatmentData()) {
            // Store the event and show modal
            setPendingSubmit(e)
            setShowSaveModal(true)
            return
        }

        // Proceed with normal save
        await performSubmit()
    }

    function hasModifiedTreatmentData() {
        if (!selectedTreatmentId || originalTreatmentData.length === 0) return false

        // Compare current prescriptions with original
        if (prescriptions.length !== originalTreatmentData.length) return true

        for (let i = 0; i < prescriptions.length; i++) {
            const current = prescriptions[i]
            const original = originalTreatmentData[i]

            // Check if any field was modified
            const fields = ['productId', 'spy1', 'spy2', 'spy3', 'spy4', 'spy5', 'spy6',
                'quantity', 'timing', 'dosage', 'additions', 'addition1', 'addition2', 'addition3', 'procedure',
                'presentation', 'droppersToday', 'medicineQuantity', 'administration']

            for (const field of fields) {
                if (String(current[field] || '') !== String(original[field] || '')) {
                    return true
                }
            }
        }

        return false
    }

    async function performSubmit() {
        setLoading(true)
        try {
            const payload = { ...form, prescriptions, autoGenerateInvoice: true }

            // Always add reports attachments as JSON string (even if empty to clear old data)
            payload.reportsAttachments = reportsAttachments.length > 0 
                ? JSON.stringify(reportsAttachments)
                : null

            // Combine date and time for nextVisit
            if (form.nextVisitDate && form.nextVisitTime) {
                payload.nextVisit = `${form.nextVisitDate}T${form.nextVisitTime}`
            }

            // If editing, include the visit ID
            if (isEditMode && visitId) {
                payload.id = visitId
            }

            const res = await fetch('/api/visits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (!res.ok) {
                const b = await res.json().catch(() => ({ error: res.statusText }))
                showError(`${isEditMode ? 'Update' : 'Save'} failed: ` + (b?.error || res.statusText))
                setLoading(false)
                return
            }
            const data = await res.json()
            setLastCreatedVisitId(data.id)
            setLastCreatedVisit(data)

            showSuccess(`Visit ${isEditMode ? 'updated' : 'created'} successfully!${data.invoiceCreated ? ' Invoice generated.' : ''}`)

            // Clear the auto-saved draft after successful submission
            if (!isEditMode) {
                try {
                    localStorage.removeItem('prescriptionDraft')
                    setHasDraft(false)
                    console.log('Draft cleared after successful submission')
                } catch (err) {
                    console.error('Failed to clear draft:', err)
                }
            }

            // Redirect to visit details page
            setTimeout(() => {
                router.push(`/visits/${data.id}`)
            }, 1000)
        } catch (err) {
            console.error(err)
            showError(`${isEditMode ? 'Update' : 'Save'} failed. Please try again.`)
        }
        setLoading(false)
    }

    // Show loading state while fetching initial data
    if (dataLoading || (patients.length === 0 && products.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                <p className="text-muted">Loading patients and medicines...</p>
            </div>
        )
    }

    return (
        <div>
            {/* Loading Modal */}
            <LoadingModal isOpen={loading} message={isEditMode ? 'Loading visit data...' : 'Loading...'} />
            {/* Creating Treatment Modal */}
            <LoadingModal isOpen={creatingTreatment} message={treatmentModalMessage} />
            {/* Camera Modal for Reports */}
            <CameraModal
                isOpen={showCamera}
                onClose={() => setShowCamera(false)}
                onCapture={handleCameraCapture}
                title="Capture Report Document"
            />
            {/* Restore Draft Modal */}
            <ConfirmModal
                isOpen={showRestoreDraftModal}
                onCancel={handleDiscardDraft}
                onConfirm={handleRestoreDraft}
                title="Restore Draft"
                message="Found unsaved prescription data from a previous session. Would you like to restore it?"
                confirmText="Restore"
                cancelText="Discard"
                variant="info"
            />

            {isPatient ? (
                // Patient view - Read-only prescription list
                <UserPrescriptionsContent user={user} />
            ) : (
                // Staff view - Create/Edit prescriptions (original form)
                <>
                    <div className="section-header">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="section-title">{isEditMode ? 'Edit Visit & Prescriptions' : 'Create Visit & Prescriptions'}</h2>
                                <p className="text-sm text-muted">Comprehensive visit recording with prescriptions and patient updates</p>
                            </div>
                            {!isEditMode && hasDraft && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg">
                                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Draft Auto-Saved</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Toast Notifications */}
                    <div className="fixed top-4 right-4 z-50 space-y-2">
                        {toasts.map(toast => (
                            <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slideIn ${toast.type === 'success' ? 'bg-green-500 text-white' :
                                toast.type === 'error' ? 'bg-red-500 text-white' :
                                    'bg-emerald-500 text-white'
                                }`}>
                                <span className="flex-1">{toast.message}</span>
                                <button onClick={() => removeToast(toast.id)} className="text-white hover:text-gray-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        {/* Step Progress Indicator */}
                        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                            <div className="relative">
                                {/* Progress Bar */}
                                <div className="flex items-center justify-between mb-4">
                                    {steps.map((step, index) => (
                                        <div key={step.number} className="flex items-center" style={{ width: index === steps.length - 1 ? 'auto' : '100%' }}>
                                            {/* Step Circle */}
                                            <button
                                                type="button"
                                                onClick={() => goToStep(step.number)}
                                                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${currentStep === step.number
                                                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/30 scale-110'
                                                    : currentStep > step.number
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-700'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-700'
                                                    } hover:scale-105 cursor-pointer`}
                                            >
                                                {currentStep > step.number ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    step.number
                                                )}
                                            </button>

                                            {/* Step Info - Only on larger screens */}
                                            <div className="hidden lg:block ml-3 flex-shrink-0">
                                                <div className={`text-sm font-semibold ${currentStep === step.number
                                                    ? 'text-emerald-700 dark:text-emerald-300'
                                                    : currentStep > step.number
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                    {step.title}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{step.description}</div>
                                            </div>

                                            {/* Connecting Line */}
                                            {index < steps.length - 1 && (
                                                <div className="flex-1 h-0.5 mx-3 bg-gray-200 dark:bg-gray-700 relative">
                                                    <div
                                                        className={`absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500 ${currentStep > step.number ? 'w-full' : 'w-0'
                                                            }`}
                                                    ></div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Current Step Title - Mobile */}
                                <div className="lg:hidden text-center">
                                    <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
                                        {steps[currentStep - 1].title}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{steps[currentStep - 1].description}</div>
                                </div>
                            </div>
                        </div>

                        {/* Patient Selection Card - Green Futuristic Theme */}
                        <div className={`relative overflow-hidden rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm ${isPatientSelectOpen ? 'relative z-[999999]' : 'relative z-0'}`}
                            style={{ display: currentStep !== 1 ? 'none' : 'block' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                            <div className="relative p-6">
                                <h3 className="text-lg font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">Patient Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">
                                            Select Patient <span className="text-red-600">*</span>
                                        </label>
                                        <div className={fieldErrors.patientId ? 'border-2 border-red-600 rounded-lg' : ''}>
                                            <CustomSelect
                                                required
                                                value={form.patientId}
                                                onChange={(id) => {
                                                    setForm((prev: any) => ({ ...prev, patientId: id }))
                                                    setFieldErrors((prev) => ({ ...prev, patientId: '' }))
                                                    const found = patients.find(p => String(p.id) === String(id))
                                                    if (!found) return

                                                    // Split nextVisit into date and time
                                                    let nextVisitDate = ''
                                                    let nextVisitTime = ''
                                                    if (found.nextVisit) {
                                                        const dt = new Date(found.nextVisit).toISOString()
                                                        nextVisitDate = dt.slice(0, 10)
                                                        nextVisitTime = dt.slice(11, 16)
                                                    }

                                                    // Fetch the most recent visit for this patient to get opdNo
                                                    fetch(`/api/visits?patientId=${id}`)
                                                        .then(r => r.json())
                                                        .then(async (patientVisits: any[]) => {
                                                            const latestVisit = patientVisits.length > 0 ? patientVisits[0] : null

                                                            // Generate preview for new visits
                                                            let previewOpdNo = ''
                                                            if (!latestVisit?.opdNo) {
                                                                previewOpdNo = await generateOpdNoPreview(id)
                                                                setGeneratedOpdNo(previewOpdNo)
                                                            }

                                                            setForm((prev: any) => ({
                                                                ...prev,
                                                                patientId: String(found.id),
                                                                opdNo: latestVisit?.opdNo || previewOpdNo,
                                                                dob: formatDateForInput(found.dob),
                                                                age: found.age ?? '',
                                                                address: found.address || '',
                                                                gender: found.gender || '',
                                                                phone: found.phone || '',
                                                                nextVisitDate,
                                                                nextVisitTime,
                                                                occupation: found.occupation || '',
                                                                pendingPaymentCents: found.pendingPaymentCents ?? '',
                                                                height: found.height ?? '',
                                                                weight: found.weight ?? '',
                                                                imageUrl: found.imageUrl || ''
                                                            }))
                                                        })
                                                        .catch(() => {
                                                            setForm((prev: any) => ({
                                                                ...prev,
                                                                patientId: String(found.id),
                                                                opdNo: '',
                                                                dob: formatDateForInput(found.dob),
                                                                age: found.age ?? '',
                                                                address: found.address || '',
                                                                gender: found.gender || '',
                                                                phone: found.phone || '',
                                                                nextVisitDate,
                                                                nextVisitTime,
                                                                occupation: found.occupation || '',
                                                                pendingPaymentCents: found.pendingPaymentCents ?? '',
                                                                height: found.height ?? '',
                                                                weight: found.weight ?? '',
                                                                imageUrl: found.imageUrl || ''
                                                            }))
                                                        })
                                                }}
                                                options={[
                                                    { value: '', label: 'Select patient' },
                                                    ...patients.map(p => ({
                                                        value: String(p.id),
                                                        label: `${p.firstName} ${p.lastName}${p.phone ? ' · ' + p.phone : ''}`
                                                    }))
                                                ]}
                                                placeholder="Select patient"
                                                onOpenChange={setIsPatientSelectOpen}
                                            />
                                        </div>
                                        {fieldErrors.patientId && (
                                            <p className="text-red-600 text-sm mt-1">{fieldErrors.patientId}</p>
                                        )}
                                    </div>

                                    {/* Patient Image Display - Improved Layout */}
                                    {form.patientId && (
                                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 my-4">
                                            <div className="flex items-center gap-6">
                                                {/* Patient Image */}
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={patients.find(p => String(p.id) === String(form.patientId))?.imageUrl || process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || ''}
                                                        alt="Patient"
                                                        className="w-24 h-24 object-cover rounded-lg border-3 border-white shadow-lg ring-2 ring-emerald-200"
                                                    />
                                                </div>
                                                {/* Patient Info */}
                                                <div className="flex-grow">
                                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                                                        {patients.find(p => String(p.id) === String(form.patientId))?.firstName} {patients.find(p => String(p.id) === String(form.patientId))?.lastName}
                                                    </h3>
                                                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {form.opdNo && (
                                                            <span className="flex items-center gap-1">
                                                                <span className="font-semibold">OPD:</span> <span className="text-green-600 dark:text-green-400">{form.opdNo}</span>
                                                            </span>
                                                        )}
                                                        {form.date && (
                                                            <span className="flex items-center gap-1">
                                                                <span className="font-semibold">Visit Date:</span> {new Date(form.date).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {form.age && (
                                                            <span className="flex items-center gap-1">
                                                                <span className="font-semibold">Age:</span> {form.age}
                                                            </span>
                                                        )}
                                                        {form.gender && (
                                                            <span className="flex items-center gap-1">
                                                                <span className="font-semibold">Gender:</span> {form.gender}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">OPD Number</label>
                                            <div className="p-2 text-base font-medium text-gray-900 dark:text-gray-100">
                                                {form.opdNo || <span className="text-muted italic">Select a patient first</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Current Visit Date <span className="text-red-600">*</span></label>
                                            <DateInput type="date" placeholder="Select visit date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full p-2 border rounded" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Date of Birth</label>
                                            <DateInput type="date" placeholder="Select date of birth" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="w-full p-2 border rounded" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Age</label>
                                            <input type="number" placeholder="35" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="w-full p-2 border rounded" />
                                        </div>
                                        <div className={isGenderOpen ? 'relative z-[10000]' : 'relative z-0'}>
                                            <label className="block text-sm font-medium mb-1.5">Gender</label>
                                            <CustomSelect
                                                value={form.gender}
                                                onChange={(val) => setForm({ ...form, gender: val })}
                                                options={genderOptions}
                                                placeholder="Select gender"
                                                allowCustom={true}
                                                onOpenChange={setIsGenderOpen}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Phone</label>
                                            <input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Occupation</label>
                                            <input placeholder="Engineer" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Father/Husband/Guardian Name</label>
                                            <input placeholder="Guardian name" value={form.fatherHusbandGuardianName} onChange={e => setForm({ ...form, fatherHusbandGuardianName: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Address</label>
                                            <input placeholder="123 Main St, City" value={form.address} onChange={e => setForm({ ...form, address: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Height</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {/* CM Input */}
                                                <div className="flex items-center rounded overflow-hidden bg-white dark:bg-gray-800 w-32">
                                                    <input
                                                        type="number"
                                                        placeholder="175"
                                                        value={form.height}
                                                        onChange={e => setForm({ ...form, height: e.target.value })}
                                                        className="w-20 p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <span className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-y border-r rounded-r">cm</span>
                                                </div>

                                                {/* Feet/Inches Input */}
                                                <div className="flex items-center gap-1 rounded overflow-hidden bg-white dark:bg-gray-800 w-40">
                                                    <input
                                                        type="number"
                                                        placeholder="5"
                                                        value={form.heightFeet}
                                                        onChange={e => setForm({ ...form, heightFeet: e.target.value })}
                                                        className="w-12 p-2 border rounded-l text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        title="Feet"
                                                    />
                                                    <span className="px-1 text-sm font-medium text-gray-600 dark:text-gray-400">ft</span>
                                                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
                                                    <input
                                                        type="number"
                                                        placeholder="9"
                                                        value={form.heightInches}
                                                        onChange={e => setForm({ ...form, heightInches: e.target.value })}
                                                        className="w-12 p-2 border text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        title="Inches"
                                                    />
                                                    <span className="px-2 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-y border-r rounded-r">in</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">
                                                Weight (kg)
                                                {previousWeight && (
                                                    <span className="ml-2 text-xs text-gray-500 font-normal">
                                                        (Previous: {previousWeight} kg)
                                                    </span>
                                                )}
                                            </label>
                                            <input type="number" placeholder="70" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="w-full p-2 border rounded" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Pending Payment (₹)</label>
                                            <input type="number" step="0.01" placeholder="500.00" value={form.pendingPaymentCents} onChange={e => setForm({ ...form, pendingPaymentCents: e.target.value })} className="w-full p-2 border rounded" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons for Step 1 */}
                        {currentStep === 1 && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                >
                                    Next: Clinical Info
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Clinical Information Card */}
                        <div className={`relative rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900/80 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-6 ${isTemperamentOpen || isPulseDiagnosisOpen || isPulseDiagnosis2Open ? 'z-[10000]' : 'z-0'}`}
                            style={{ display: currentStep !== 2 ? 'none' : 'block' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-2xl"></div>
                            <h3 className="relative text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">Clinical Information</h3>

                            {/* Temperament and Pulse Diagnoses in one line */}
                            <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Temperament</label>
                                    <CustomSelect
                                        value={form.temperament}
                                        onChange={(val) => setForm({ ...form, temperament: val })}
                                        options={temperamentOptions}
                                        placeholder="Select temperament"
                                        allowCustom={true}
                                        onOpenChange={setIsTemperamentOpen}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Pulse Diagnosis</label>
                                    <CustomSelect
                                        value={form.pulseDiagnosis}
                                        onChange={(val) => setForm({ ...form, pulseDiagnosis: val })}
                                        options={pulseDiagnosisOptions}
                                        placeholder="Select pulse diagnosis"
                                        allowCustom={true}
                                        onOpenChange={setIsPulseDiagnosisOpen}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Pulse Diagnosis 2</label>
                                    <CustomSelect
                                        value={form.pulseDiagnosis2}
                                        onChange={(val) => setForm({ ...form, pulseDiagnosis2: val })}
                                        options={pulseDiagnosis2Options}
                                        placeholder="Select pulse diagnosis 2"
                                        allowCustom={true}
                                        onOpenChange={setIsPulseDiagnosis2Open}
                                    />
                                </div>
                            </div>

                            {/* Other fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Major Complaints</label>
                                    <input placeholder="Headache, Fatigue" value={form.majorComplaints} onChange={e => setForm({ ...form, majorComplaints: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Investigation Ordered</label>
                                    <input placeholder="Blood test, X-ray" value={form.investigations} onChange={e => setForm({ ...form, investigations: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Provisional Diagnosis</label>
                                    <input placeholder="Viral infection" value={form.provisionalDiagnosis} onChange={e => setForm({ ...form, provisionalDiagnosis: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Improvements</label>
                                    <input placeholder="Patient showing recovery" value={form.improvements} onChange={e => setForm({ ...form, improvements: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium mb-1.5">Special Note</label>
                                    <input placeholder="Follow-up in 7 days" value={form.specialNote} onChange={e => setForm({ ...form, specialNote: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
                                </div>

                                {/* History / Reports - Split into two columns */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">History</label>
                                    <textarea
                                        placeholder="Previous medical history"
                                        value={form.historyReports}
                                        onChange={e => setForm({ ...form, historyReports: e.target.value.toUpperCase() })}
                                        rows={4}
                                        className="w-full p-2 border rounded resize-none mb-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Reports</label>
                                    <textarea
                                        placeholder="Lab reports, test results"
                                        value={form.reports}
                                        onChange={e => setForm({ ...form, reports: e.target.value.toUpperCase() })}
                                        rows={4}
                                        className="w-full p-2 border rounded resize-none mb-2"
                                    />

                                    {/* Minimalistic Reports Attachments with Camera */}
                                    <div className="space-y-2">
                                        {/* File Upload & Camera Controls */}
                                        <div className="flex items-center gap-2">
                                            <label className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-xs">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                <span>File</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,image/*"
                                                    onChange={handleReportsAttachmentUpload}
                                                    disabled={uploadingReports || reportsAttachments.length >= 10}
                                                    className="hidden"
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!form.patientId) {
                                                        showError('Please select a patient first')
                                                        return
                                                    }
                                                    setShowCamera(true)
                                                }}
                                                disabled={uploadingReports || reportsAttachments.length >= 10}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span>Camera</span>
                                            </button>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {reportsAttachments.length}/10
                                            </span>
                                        </div>

                                        {/* Uploaded Files List */}
                                        {reportsAttachments.length > 0 && (
                                            <div className="space-y-1">
                                                {reportsAttachments.map((attachment, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                                                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:text-blue-600">
                                                            {attachment.name}
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeReportsAttachment(index)}
                                                            className="text-gray-400 hover:text-red-600 p-0.5"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons for Step 2 */}
                        {currentStep === 2 && (
                            <div className="flex justify-between">
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                >
                                    Next: Visit Tracking
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Next Visit & Tracking - Consolidated in single line */}
                        <div className="relative rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900/80 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-6"
                            style={{ display: currentStep !== 3 ? 'none' : 'block' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-2xl"></div>
                            <h3 className="relative text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">Next Visit & Tracking</h3>
                            <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Next Visit Date</label>
                                    <DateInput type="date" placeholder="Select visit date" value={form.nextVisitDate} onChange={e => setForm({ ...form, nextVisitDate: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Visit Number (V)</label>
                                    <input type="number" placeholder="1" value={form.visitNumber} onChange={e => setForm({ ...form, visitNumber: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Follow-Up Count (FU)</label>
                                    <input type="number" placeholder="0" value={form.followUpCount} onChange={e => setForm({ ...form, followUpCount: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons for Step 3 */}
                        {currentStep === 3 && (
                            <div className="flex justify-between">
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                >
                                    Next: Select Medicines
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}


                        {/* Medicines Selection Card */}
                        <div className={`relative rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900/80 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-6 ${isTreatmentSelectOpen || isMedicineSelectOpen ? 'z-[10000]' : 'z-0'}`}
                            style={{ display: currentStep !== 4 ? 'none' : 'block', overflow: 'visible', position: 'relative' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-2xl"></div>
                            <h3 className="relative text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">Medicine Selection</h3>

                            {/* Add from Treatment Plan */}
                            <div className="relative mb-4 p-3 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl backdrop-blur-sm" style={{ overflow: 'visible', position: 'relative', zIndex: 100 }}>
                                <label className="block text-sm font-medium mb-2">
                                    Quick Add from Treatment Plan
                                </label>
                                <div className="flex gap-2" style={{ position: 'relative', zIndex: 100 }}>
                                    <CustomSelect
                                        value={selectedTreatmentId || ""}
                                        onChange={(treatmentId) => {
                                            if (selectedTreatmentId) return; // Prevent changing once selected
                                            const treatment = treatments.find(t => String(t.id) === String(treatmentId))
                                            if (treatment && treatment.treatmentProducts && treatment.treatmentProducts.length > 0) {
                                                // Replace all medicines with the treatment plan (not add)
                                                const newPrescriptions = treatment.treatmentProducts.map((tp: any) => ({
                                                    treatmentId: String(treatment.id),
                                                    productId: String(tp.productId),
                                                    spy1: tp.spy1 || '',
                                                    spy2: tp.spy2 || '',
                                                    spy3: tp.spy3 || '',
                                                    spy4: tp.spy4 || '',
                                                    spy5: tp.spy5 || '',
                                                    spy6: tp.spy6 || '',
                                                    quantity: tp.quantity || treatment.quantity || 1,
                                                    timing: tp.timing || '',
                                                    dosage: tp.dosage || treatment.dosage || '',
                                                    additions: tp.additions || '',
                                                    addition1: tp.addition1 || '',
                                                    addition2: tp.addition2 || '',
                                                    addition3: tp.addition3 || '',
                                                    procedure: tp.procedure || treatment.procedure || '',
                                                    presentation: tp.presentation || '',
                                                    droppersToday: tp.droppersToday?.toString() || '',
                                                    medicineQuantity: tp.medicineQuantity?.toString() || '',
                                                    administration: treatment.administration || '',
                                                    patientHasMedicine: false,
                                                    spyBottleSize: tp.spyBottleSize || '',
                                                    additionsBottleSize: tp.additionsBottleSize || ''
                                                }))
                                                setPrescriptions(newPrescriptions) // Replace, not add
                                                setSelectedTreatmentId(String(treatment.id))
                                                setSelectedTreatmentPlan(treatment) // Store the full treatment plan object
                                                setOriginalTreatmentData(JSON.parse(JSON.stringify(newPrescriptions))) // Deep copy
                                            }
                                        }}
                                        options={[
                                            { value: '', label: '-- select treatment plan to load medicines --' },
                                            ...(Array.isArray(treatments) ? treatments : [])
                                                .filter(t => !t.deleted) // Only show non-deleted treatments in dropdown
                                                .filter(t => !(t.provDiagnosis === 'IMPORTED' && t.planNumber === '00')) // Hide imported treatment plan
                                                .map(t => {
                                                    // Count how many plans exist for this diagnosis
                                                    const sameDignosisPlans = treatments.filter(plan =>
                                                        plan.provDiagnosis === t.provDiagnosis && !plan.deleted
                                                    )
                                                    // If only one plan exists for this diagnosis, show as Plan 1
                                                    const displayPlanNumber = sameDignosisPlans.length === 1 ? '1' : t.planNumber

                                                    return {
                                                        value: String(t.id),
                                                        label: `${displayPlanNumber ? `Plan ${displayPlanNumber} - ` : ''}${t.treatmentPlan || t.provDiagnosis || `Treatment #${t.id}`} (${t.treatmentProducts?.length || 0} medicines)`
                                                    }
                                                })
                                        ]}
                                        placeholder="-- select treatment plan --"
                                        className={`flex-1 ${selectedTreatmentId ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
                                    />
                                </div>
                                {selectedTreatmentId && (
                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Selected Plan:</span>
                                        <span className="text-gray-700 dark:text-gray-300">
                                            {(() => {
                                                const treatment = Array.isArray(treatments) ? treatments.find(t => String(t.id) === String(selectedTreatmentId)) : null
                                                const planName = treatment?.treatmentPlan || treatment?.provDiagnosis || `Treatment #${selectedTreatmentId}`
                                                return treatment?.deleted ? (
                                                    <>
                                                        <span className="text-red-600 dark:text-red-400 font-bold">(DELETED)</span> {planName}
                                                    </>
                                                ) : planName
                                            })()}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedTreatmentId(null)
                                                setSelectedTreatmentPlan(null)
                                                setOriginalTreatmentData([])
                                            }}
                                            className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-xs font-semibold"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs text-muted mt-1">This will <strong>replace all medicines</strong> with the selected treatment plan. To add individual medicines, use the selector below.</p>
                            </div>

                            {/* Add Individual Medicine */}
                            {products.length === 0 ? (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                                    No medicines in inventory. Add products on the <a href="/products" className="text-brand underline font-medium">Inventory page</a>.
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Or Add Individual Medicine</label>
                                    <div className="mb-3">
                                        <CustomSelect
                                            value={selectedProductId}
                                            onChange={(value) => {
                                                setSelectedProductId(value)
                                                if (value && value !== '') {
                                                    // Check if already in selected medicines
                                                    if (!selectedMedicines.includes(value)) {
                                                        setSelectedMedicines([...selectedMedicines, value])
                                                    }
                                                    // Clear selection after adding
                                                    setSelectedProductId('')
                                                }
                                            }}
                                            options={[
                                                { value: '', label: '-- select medicine from inventory --' },
                                                ...products.map(p => {
                                                    const rl = (p as any).reorderLevel ?? 0
                                                    const low = p.quantity <= rl
                                                    return {
                                                        value: String(p.id),
                                                        label: `${p.name} · Stock: ${p.quantity}${rl ? ' · Reorder: ' + rl : ''}${low ? ' · ⚠️ LOW' : ''}`
                                                    }
                                                })
                                            ]}
                                            placeholder="-- select medicine from inventory --"
                                            className="flex-1"
                                            onOpenChange={setIsMedicineSelectOpen}
                                        />
                                    </div>

                                    {/* Selected Medicines List - Always visible */}
                                    <div className="bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 mb-3 backdrop-blur-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                                                Selected Medicines ({selectedMedicines.length})
                                            </span>
                                            {selectedMedicines.length > 0 && (
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={removeAllSelectedMedicines}
                                                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors shadow-sm"
                                                    >
                                                        Remove All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={addAllSelectedMedicinesToPrescription}
                                                        className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                                                    >
                                                        Add All to Prescription
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {selectedMedicines.length === 0 ? (
                                            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                                No medicines selected yet. Select medicines from the dropdown above.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {selectedMedicines.map((productId) => {
                                                    const product = products.find(p => String(p.id) === productId)
                                                    if (!product) return null
                                                    return (
                                                        <div key={productId} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2 text-sm">
                                                            <span className="font-medium">{product.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFromSelectedMedicines(productId)}
                                                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold px-2"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation Buttons for Step 4 */}
                        {currentStep === 4 && (
                            <div className="flex justify-between">
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                >
                                    Next: Prescription Details
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Prescriptions Card */}
                        <div className="relative rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900/80 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-6"
                            style={{ display: currentStep !== 5 ? 'none' : 'block' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-2xl"></div>
                            <div className="relative flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">Prescriptions</h3>
                                <button type="button" onClick={addEmptyPrescription} className="px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-lg transition-colors shadow-sm hover:shadow-md">+ Add Empty Row</button>
                            </div>
                            {prescriptions.length === 0 ? (
                                <div className="relative text-center py-8 text-gray-500 dark:text-gray-400">
                                    No prescriptions added yet. Use the medicine selector above or click "Add Empty Row".
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {prescriptions.map((pr, i) => {
                                        const prescriptionTreatment = pr.treatmentId && Array.isArray(treatments) ? treatments.find(t => String(t.id) === String(pr.treatmentId)) : null
                                        const isDeleted = prescriptionTreatment?.deleted === true

                                        return (
                                            <div key={i} className={`relative group transition-all duration-300 ${isDeleted ? 'border border-red-400/50 dark:border-red-600/50 bg-red-50/50 dark:bg-red-950/30 rounded-2xl' : 'border border-emerald-200/40 dark:border-emerald-700/40 bg-gradient-to-br from-white via-emerald-50/20 to-transparent dark:from-gray-900/80 dark:via-emerald-950/10 dark:to-gray-900/80 rounded-2xl hover:border-emerald-400/60 dark:hover:border-emerald-600/60 hover:shadow-xl hover:shadow-emerald-500/10'}`}>
                                                {/* Futuristic glow effect on hover */}
                                                {!isDeleted && (
                                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/0 via-green-400/0 to-emerald-500/0 group-hover:from-emerald-400/5 group-hover:via-green-400/5 group-hover:to-emerald-500/5 transition-all duration-500 pointer-events-none"></div>
                                                )}

                                                {isDeleted && (
                                                    <div className="mb-3 p-2.5 bg-red-100/80 dark:bg-red-900/50 border border-red-300/50 dark:border-red-700/50 rounded-xl text-sm backdrop-blur-sm">
                                                        <span className="text-red-700 dark:text-red-300 font-semibold">⚠ DELETED TREATMENT PLAN - Read Only</span>
                                                    </div>
                                                )}
                                                <div className="relative p-4">
                                                    {/* Row 1: Medicine Name (Left) + 3x3 SPY Grid (Right) */}
                                                    <div className="flex gap-4 mb-3">
                                                        {/* LEFT: Medicine Info */}
                                                        <div className="w-64 flex-shrink-0">
                                                            <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Medicine</label>
                                                            {pr.productId ? (
                                                                <div className="p-3 text-xs text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700">
                                                                    {(() => {
                                                                        const product = products.find(p => String(p.id) === String(pr.productId))
                                                                        return (
                                                                            <div className="space-y-2.5">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-md text-[10px] font-bold">{i + 1}</span>
                                                                                    <span className="font-semibold leading-tight">{product ? product.name : `Product #${pr.productId}`}</span>
                                                                                </div>
                                                                                {product?.category && (
                                                                                    <div className="space-y-1.5">
                                                                                        <div className="flex items-center gap-1 text-[10px]">
                                                                                            {(() => {
                                                                                                const categoryName = typeof product.category === 'string' ? product.category : product.category.name
                                                                                                if (product.unit) {
                                                                                                    const unitParts = String(product.unit).trim().split(/\s+/)
                                                                                                    const unitType = unitParts.length >= 2 ? unitParts[1] : ''
                                                                                                    return (
                                                                                                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full">
                                                                                                            {categoryName} {unitType ? `(${unitType})` : ''}
                                                                                                        </span>
                                                                                                    )
                                                                                                }
                                                                                                return (
                                                                                                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full">
                                                                                                        {categoryName}
                                                                                                    </span>
                                                                                                )
                                                                                            })()}
                                                                                        </div>
                                                                                        {product && <div className="text-[10px] text-gray-500">Stock: {product.quantity}</div>}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })()}
                                                                </div>
                                                            ) : (
                                                                <CustomSelect
                                                                    value={pr.productId}
                                                                    onChange={(val) => !isDeleted && !pr.productId && updatePrescription(i, { productId: val })}
                                                                    options={[
                                                                        { value: '', label: '-- select medicine --' },
                                                                        ...products.map(p => ({
                                                                            value: String(p.id),
                                                                            label: `${p.name} · Stock: ${p.quantity}${p.reorderLevel ? ' · Reorder: ' + p.reorderLevel : ''}`
                                                                        }))
                                                                    ]}
                                                                    placeholder="-- select --"
                                                                    className={`text-xs h-9 ${isDeleted ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
                                                                />
                                                            )}
                                                        </div>

                                                        {/* RIGHT: SPY Grid + Additions */}
                                                        <div className={`flex-1 ${isDeleted ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}>
                                                            <label className="block text-xs font-semibold mb-2 text-gray-600 dark:text-gray-400">Spagyric Components</label>
                                                            {/* Row 1: SPY 1-3 */}
                                                            <div className="grid grid-cols-3 gap-3 mb-3">
                                                                {[1, 2, 3].map(num => {
                                                                    const spyKey = `spy${num}` as keyof typeof pr
                                                                    const spyValue = pr[spyKey] as string || ''
                                                                    return (
                                                                        <div key={num} className="flex gap-1">
                                                                            <CustomSelect
                                                                                value={parseComponent(spyValue).name}
                                                                                onChange={(val) => {
                                                                                    const parsed = parseComponent(spyValue)
                                                                                    updatePrescription(i, { [spyKey]: formatComponent(val.toUpperCase(), parsed.volume) })
                                                                                }}
                                                                                options={components}
                                                                                placeholder={`SPY${num}`}
                                                                                allowCustom={true}
                                                                                className="flex-1 text-xs h-8"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                value={parseComponent(spyValue).volume}
                                                                                onChange={(e) => {
                                                                                    const parsed = parseComponent(spyValue)
                                                                                    updatePrescription(i, { [spyKey]: formatComponent(parsed.name, e.target.value) })
                                                                                }}
                                                                                placeholder="Vol"
                                                                                className="flex-1 min-w-[64px] p-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                            />
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                            <label className="block text-xs font-semibold mb-2 mt-2 text-gray-600 dark:text-gray-400">SPY 4-6 & Bottle Size</label>
                                                            {/* Row 2: SPY 4-6 + SPY Bottle */}
                                                            <div className="grid grid-cols-4 gap-3 mb-3">
                                                                {[4, 5, 6].map(num => {
                                                                    const spyKey = `spy${num}` as keyof typeof pr
                                                                    const spyValue = pr[spyKey] as string || ''
                                                                    return (
                                                                        <div key={num} className="flex gap-1">
                                                                            <CustomSelect
                                                                                value={parseComponent(spyValue).name}
                                                                                onChange={(val) => {
                                                                                    const parsed = parseComponent(spyValue)
                                                                                    updatePrescription(i, { [spyKey]: formatComponent(val.toUpperCase(), parsed.volume) })
                                                                                }}
                                                                                options={components}
                                                                                placeholder={`SPY${num}`}
                                                                                allowCustom={true}
                                                                                className="flex-1 text-xs h-8"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                value={parseComponent(spyValue).volume}
                                                                                onChange={(e) => {
                                                                                    const parsed = parseComponent(spyValue)
                                                                                    updatePrescription(i, { [spyKey]: formatComponent(parsed.name, e.target.value) })
                                                                                }}
                                                                                placeholder="Vol"
                                                                                className="flex-1 min-w-[64px] p-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                            />
                                                                        </div>
                                                                    )
                                                                })}
                                                                {/* SPY Bottle Size */}
                                                                <div>
                                                                    <CustomSelect
                                                                        value={pr.spyBottleSize || ''}
                                                                        onChange={(val) => updatePrescription(i, { spyBottleSize: val })}
                                                                        options={bottlePricing.map(opt => ({
                                                                            ...opt,
                                                                            label: `${opt.label} (+${opt.price})`
                                                                        }))}
                                                                        placeholder="SPY Btl"
                                                                        disabled={!pr.spy4 && !pr.spy5 && !pr.spy6}
                                                                        className="text-xs h-8 [&_option]:text-green-600 dark:[&_option]:text-green-400"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <label className="block text-xs font-semibold mb-2 mt-2 text-blue-600 dark:text-blue-400">Additions & Bottle Size</label>
                                                            {/* Row 3: Add 1-3 + Add Bottle */}
                                                            <div className="grid grid-cols-4 gap-3">
                                                                {[1, 2, 3].map(num => (
                                                                    <div key={num}>
                                                                        <CustomSelect
                                                                            value={pr[`addition${num}` as keyof typeof pr] as string || ''}
                                                                            onChange={(val) => updatePrescription(i, { [`addition${num}`]: val.toUpperCase() })}
                                                                            options={additions}
                                                                            placeholder={`Add ${num}`}
                                                                            allowCustom={true}
                                                                            className="text-xs h-8"
                                                                        />
                                                                    </div>
                                                                ))}
                                                                {/* Add Bottle Size */}
                                                                <div>
                                                                    <CustomSelect
                                                                        value={pr.additionsBottleSize || ''}
                                                                        onChange={(val) => updatePrescription(i, { additionsBottleSize: val })}
                                                                        options={bottlePricing.map(opt => ({
                                                                            ...opt,
                                                                            label: `${opt.label} (+${opt.price})`
                                                                        }))}
                                                                        placeholder="Add Btl"
                                                                        disabled={!pr.addition1 && !pr.addition2 && !pr.addition3}
                                                                        className="text-xs h-8 [&_option]:text-green-600 dark:[&_option]:text-green-400"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Remaining Fields in ONE LINE */}
                                                    <div className="mt-4">
                                                        <label className="block text-xs font-semibold mb-2 text-gray-600 dark:text-gray-400">Dosage & Administration Details</label>
                                                        <div className={`flex gap-3 items-end w-full ${isDeleted ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}>
                                                            {/* Qty, Timing, Dosage */}
                                                            <div className="flex-1 min-w-[56px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Qty</label>
                                                                <input type="number" placeholder="0" value={pr.quantity || ''} onChange={e => updatePrescription(i, { quantity: Number(e.target.value) })} className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800" />
                                                            </div>
                                                            <div className="flex-1 min-w-[96px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Timing</label>
                                                                <CustomSelect value={pr.timing || ''} onChange={(val) => updatePrescription(i, { timing: val })} options={timing} placeholder="Time" allowCustom={true} className="text-xs h-8" />
                                                            </div>
                                                            <div className="flex-1 min-w-[80px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Dose</label>
                                                                <CustomSelect value={parseDosage(pr.dosage || '').quantity} onChange={(val) => { const parsed = parseDosage(pr.dosage || ''); updatePrescription(i, { dosage: formatDosage(val, parsed.timing, parsed.dilution) }) }} options={doseQuantity} placeholder="Dose" allowCustom={true} className="text-xs h-8" />
                                                            </div>
                                                            <div className="flex-1 min-w-[80px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Dilution</label>
                                                                <CustomSelect value={parseDosage(pr.dosage || '').dilution} onChange={(val) => { const parsed = parseDosage(pr.dosage || ''); updatePrescription(i, { dosage: formatDosage(parsed.quantity, parsed.timing, val) }) }} options={dilution} placeholder="Dil" allowCustom={true} className="text-xs h-8" />
                                                            </div>

                                                            {/* Procedure, Presentation, Administration */}
                                                            <div className="flex-1 min-w-[112px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Procedure</label>
                                                                <CustomSelect value={pr.procedure || ''} onChange={(val) => updatePrescription(i, { procedure: val.toUpperCase() })} options={procedure} placeholder="Proc" allowCustom={true} className="text-xs h-8" />
                                                            </div>
                                                            <div className="flex-1 min-w-[112px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Presentation</label>
                                                                <CustomSelect value={pr.presentation || ''} onChange={(val) => updatePrescription(i, { presentation: val.toUpperCase() })} options={presentation} placeholder="Pres" allowCustom={true} className="text-xs h-8" />
                                                            </div>
                                                            <div className="flex-1 min-w-[128px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Administration</label>
                                                                <CustomSelect value={pr.administration || ''} onChange={(val) => updatePrescription(i, { administration: val.toUpperCase() })} options={administration} placeholder="Admin" allowCustom={true} className="text-xs h-8" />
                                                            </div>
                                                        </div>

                                                        {/* Taken Checkbox & Remove Button - Original Position */}
                                                        <div className="flex items-center justify-between pt-3 border-t border-emerald-200/30 dark:border-emerald-700/30 mt-3">
                                                            <label className="flex items-center gap-2.5 cursor-pointer group/check">
                                                                <div className="relative">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={pr.patientHasMedicine || false}
                                                                        onChange={(e) => updatePrescription(i, { patientHasMedicine: e.target.checked })}
                                                                        className="peer sr-only"
                                                                    />
                                                                    <div className="w-5 h-5 border-2 border-emerald-300 dark:border-emerald-600 rounded-md peer-checked:bg-gradient-to-br peer-checked:from-emerald-500 peer-checked:to-green-500 peer-checked:border-emerald-500 transition-all duration-200 flex items-center justify-center shadow-sm peer-checked:shadow-emerald-500/30">
                                                                        <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover/check:text-emerald-600 dark:group-hover/check:text-emerald-400 transition-colors">Taken</span>
                                                            </label>

                                                            {!isDeleted && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { const copy = [...prescriptions]; copy.splice(i, 1); setPrescriptions(copy); }}
                                                                    className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 border border-red-300 dark:border-red-700 rounded-lg transition-all duration-200 hover:shadow-md"
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Navigation Buttons for Step 5 */}
                        {currentStep === 5 && (
                            <div className="flex justify-between">
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                >
                                    Next: Payment & Submit
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Financial Information Card */}
                        <div className="relative rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900/80 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-6"
                            style={{ display: currentStep !== 6 ? 'none' : 'block' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-2xl"></div>
                            <h3 className="relative text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">Financial Information</h3>
                            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Amount (₹)</label>
                                    <input type="number" step="0.01" placeholder="1000.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Discount (₹)</label>
                                    <input type="number" step="0.01" placeholder="100.00" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Payment Received (₹)</label>
                                    <input type="number" step="0.01" placeholder="900.00" value={form.payment} onChange={e => setForm({ ...form, payment: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Balance Due (₹)</label>
                                    <input type="number" step="0.01" placeholder="0.00" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="relative rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900/80 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-6"
                            style={{ display: currentStep !== 6 ? 'none' : 'block' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-2xl"></div>
                            <div className="relative flex items-center justify-between">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {prescriptions.length > 0 && (
                                        <span className="font-medium">{prescriptions.length} prescription(s) added</span>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back
                                    </button>
                                    <button disabled={loading} className="px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed">
                                        {loading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Visit & Prescriptions' : 'Save Visit & Prescriptions')}
                                    </button>
                                    {lastCreatedVisitId && (
                                        <a href={`/visits/${lastCreatedVisitId}`} target="_blank" rel="noreferrer" className="px-6 py-3 text-base font-medium text-emerald-700 dark:text-emerald-300 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                                            Open Last Visit
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>


                    {/* Treatment Plan Modification Modal */}
                    {showSaveModal && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
                            style={{
                                animation: 'fadeIn 0.2s ease-in-out'
                            }}
                        >
                            <div
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 animate-scaleIn"
                                style={{
                                    animation: 'scaleIn 0.3s ease-out'
                                }}
                            >
                                <h3 className="text-lg font-semibold mb-4">Treatment Plan Modified</h3>
                                <p className="text-sm text-muted mb-6">
                                    You've modified the treatment plan data. Would you like to save these changes as a new treatment plan, or use them just for this prescription?
                                </p>
                                <div className="space-y-3">
                                    {selectedTreatmentId && (
                                        <button
                                            onClick={async () => {
                                                const modal = document.querySelector('.animate-fadeIn')
                                                if (modal) {
                                                    modal.classList.add('animate-fadeOut')
                                                    await new Promise(resolve => setTimeout(resolve, 200))
                                                }
                                                setShowSaveModal(false)

                                                try {
                                                    // Show loading modal with update message
                                                    setTreatmentModalMessage('Updating Treatment Plan and Saving Prescription...')
                                                    setCreatingTreatment(true)                                                    // Get the current treatment plan data
                                                    const currentPlan = treatments.find(t => String(t.id) === String(selectedTreatmentId))

                                                    // Update the existing treatment plan with modified data
                                                    const updateData = {
                                                        id: selectedTreatmentId,
                                                        speciality: currentPlan?.speciality || form.temperament || '',
                                                        organ: currentPlan?.organ || '',
                                                        diseaseAction: currentPlan?.diseaseAction || '',
                                                        provDiagnosis: currentPlan?.provDiagnosis || form.provisionalDiagnosis || '',
                                                        treatmentPlan: currentPlan?.treatmentPlan || currentPlan?.provDiagnosis || form.provisionalDiagnosis || 'Treatment',
                                                        planNumber: currentPlan?.planNumber || '',
                                                        administration: prescriptions.length > 0 ? prescriptions[0].administration || '' : currentPlan?.administration || '',
                                                        notes: currentPlan?.notes || '',
                                                        products: prescriptions.map(pr => ({
                                                            productId: pr.productId,
                                                            comp1: pr.comp1 || '',
                                                            comp2: pr.comp2 || '',
                                                            comp3: pr.comp3 || '',
                                                            comp4: pr.comp4 || '',
                                                            comp5: pr.comp5 || '',
                                                            timing: pr.timing || '',
                                                            dosage: pr.dosage || '',
                                                            additions: pr.additions || '',
                                                            procedure: pr.procedure || '',
                                                            presentation: pr.presentation || ''
                                                        }))
                                                    }

                                                    // Update the treatment plan
                                                    const res = await fetch('/api/treatments', {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify(updateData)
                                                    })

                                                    if (!res.ok) {
                                                        const error = await res.json().catch(() => ({ error: 'Failed to update treatment plan' }))
                                                        setCreatingTreatment(false)
                                                        showError(error.error || 'Failed to update treatment plan')
                                                        return
                                                    }

                                                    // Refresh treatments list
                                                    const updatedTreatments = await fetch('/api/treatments').then(r => r.json())
                                                    setTreatments(updatedTreatments)

                                                    setCreatingTreatment(false)
                                                    showSuccess('Treatment plan updated successfully!')

                                                    // Continue with the prescription submission
                                                    await performSubmit()

                                                } catch (error: any) {
                                                    console.error('Error updating treatment plan:', error)
                                                    setCreatingTreatment(false)
                                                    showError(error.message || 'Failed to update treatment plan')
                                                }
                                            }}
                                            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Update Current Plan ({(() => {
                                                const plan = treatments.find(t => String(t.id) === String(selectedTreatmentId))
                                                return plan?.planNumber ? `Plan ${plan.planNumber}` : 'Source'
                                            })()})
                                        </button>
                                    )}
                                    <button
                                        onClick={async () => {
                                            // Fade out animation
                                            const modal = document.querySelector('.animate-fadeIn')
                                            if (modal) {
                                                modal.classList.add('animate-fadeOut')
                                                await new Promise(resolve => setTimeout(resolve, 200))
                                            }
                                            setShowSaveModal(false)

                                            // Create new treatment plan with ALL data from this page
                                            try {
                                                // Show loading modal instead of toasts
                                                setCreatingTreatment(true)

                                                // First, save/update the prescription
                                                const payload = { ...form, prescriptions }

                                                // Combine date and time for nextVisit
                                                if (form.nextVisitDate && form.nextVisitTime) {
                                                    payload.nextVisit = `${form.nextVisitDate}T${form.nextVisitTime}`
                                                }

                                                // If editing, include the visit ID
                                                if (isEditMode && visitId) {
                                                    payload.id = visitId
                                                }

                                                const visitRes = await fetch('/api/visits', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(payload)
                                                })

                                                if (!visitRes.ok) {
                                                    const error = await visitRes.json().catch(() => ({ error: visitRes.statusText }))
                                                    setCreatingTreatment(false)
                                                    showError(`${isEditMode ? 'Update' : 'Save'} failed: ` + (error?.error || visitRes.statusText))
                                                    return
                                                }

                                                const visitData = await visitRes.json()
                                                const savedVisitId = visitData.id
                                                setLastCreatedVisitId(savedVisitId)
                                                setLastCreatedVisit(visitData)

                                                // Fetch all existing treatments to determine the next plan number
                                                const treatmentsRes = await fetch('/api/treatments')
                                                const allTreatments = await treatmentsRes.json()

                                                // Calculate next plan number (e.g., if we have 02, next is 03)
                                                const planNumbers = allTreatments
                                                    .map((t: any) => t.planNumber)
                                                    .filter((pn: string) => pn && /^\d+$/.test(pn))
                                                    .map((pn: string) => parseInt(pn, 10))

                                                const maxPlanNumber = planNumbers.length > 0 ? Math.max(...planNumbers) : 0
                                                const nextPlanNumber = String(maxPlanNumber + 1).padStart(2, '0')

                                                // Get all the data from the selected treatment plan or form
                                                const newTreatmentData = {
                                                    // Use selected treatment plan data if available, otherwise use form data
                                                    speciality: selectedTreatmentPlan?.speciality || form.temperament || '',
                                                    organ: selectedTreatmentPlan?.organ || '',
                                                    diseaseAction: selectedTreatmentPlan?.diseaseAction || '',
                                                    provDiagnosis: selectedTreatmentPlan?.provDiagnosis || form.provisionalDiagnosis || '',
                                                    treatmentPlan: selectedTreatmentPlan?.provDiagnosis || form.provisionalDiagnosis || 'Treatment',
                                                    planNumber: nextPlanNumber,
                                                    administration: prescriptions.length > 0 ? prescriptions[0].administration || '' : '',
                                                    notes: `Created from ${isEditMode ? 'updated' : ''} visit - Patient: ${form.patientId ? patients.find(p => String(p.id) === form.patientId)?.firstName + ' ' + patients.find(p => String(p.id) === form.patientId)?.lastName : ''} - Date: ${new Date().toLocaleDateString()}`,
                                                    products: prescriptions.map(pr => ({
                                                        productId: pr.productId,
                                                        spy1: pr.spy1 || '',
                                                        spy2: pr.spy2 || '',
                                                        spy3: pr.spy3 || '',
                                                        spy4: pr.spy4 || '',
                                                        spy5: pr.spy5 || '',
                                                        timing: pr.timing || '',
                                                        dosage: pr.dosage || '',
                                                        addition1: pr.addition1 || '',
                                                        procedure: pr.procedure || '',
                                                        presentation: pr.presentation || ''
                                                    }))
                                                }

                                                // Create the new treatment plan
                                                const res = await fetch('/api/treatments', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(newTreatmentData)
                                                })

                                                if (!res.ok) {
                                                    const error = await res.json().catch(() => ({ error: 'Failed to create treatment plan' }))
                                                    setCreatingTreatment(false)
                                                    showError(error.error || 'Failed to create treatment plan')
                                                    return
                                                }

                                                const createdTreatment = await res.json()
                                                setCreatingTreatment(false)

                                                // Show navigation modal (with slight delay to ensure loading modal is closed)
                                                setCreatedTreatmentId(createdTreatment.id)
                                                setSavedVisitIdForNav(savedVisitId)
                                                await new Promise(resolve => setTimeout(resolve, 300))
                                                setShowNavigationModal(true)

                                            } catch (error: any) {
                                                console.error('Error creating treatment plan:', error)
                                                setCreatingTreatment(false)
                                                showError(error.message || 'Failed to create treatment plan')
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg transition-colors font-medium"
                                    >
                                        Create New Treatment Plan
                                    </button>
                                    <button
                                        onClick={async () => {
                                            // Fade out animation
                                            const modal = document.querySelector('.animate-fadeIn')
                                            if (modal) {
                                                modal.classList.add('animate-fadeOut')
                                                await new Promise(resolve => setTimeout(resolve, 200))
                                            }
                                            setShowSaveModal(false)
                                            setSelectedTreatmentId(null)
                                            setSelectedTreatmentPlan(null)
                                            setOriginalTreatmentData([])
                                            await performSubmit()
                                        }}
                                        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                    >
                                        Use for This Prescription Only
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Fade out animation
                                            const modal = document.querySelector('.animate-fadeIn')
                                            if (modal) {
                                                modal.classList.add('animate-fadeOut')
                                                setTimeout(() => {
                                                    setShowSaveModal(false)
                                                    setPendingSubmit(null)
                                                }, 200)
                                            } else {
                                                setShowSaveModal(false)
                                                setPendingSubmit(null)
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Modal - After Treatment Plan Created */}
                    {showNavigationModal && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 animate-fadeIn"
                            style={{
                                animation: 'fadeIn 0.2s ease-in-out'
                            }}
                        >
                            <div
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 animate-scaleIn"
                                style={{
                                    animation: 'scaleIn 0.3s ease-out'
                                }}
                            >
                                <div className="text-center mb-6">
                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                                        <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">Treatment Plan Created!</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Where would you like to go next?
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {selectedTreatmentId && selectedTreatmentId !== createdTreatmentId && (
                                        <button
                                            onClick={async () => {
                                                const modal = document.querySelector('.animate-fadeIn')
                                                if (modal) {
                                                    modal.classList.add('animate-fadeOut')
                                                    await new Promise(resolve => setTimeout(resolve, 200))
                                                }
                                                setShowNavigationModal(false)
                                                router.push(`/treatments/${selectedTreatmentId}`)
                                            }}
                                            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Edit Source Plan ({(() => {
                                                const plan = treatments.find(t => String(t.id) === String(selectedTreatmentId))
                                                return plan?.planNumber ? `Plan ${plan.planNumber}` : 'Original'
                                            })()})
                                        </button>
                                    )}
                                    <button
                                        onClick={async () => {
                                            const modal = document.querySelector('.animate-fadeIn')
                                            if (modal) {
                                                modal.classList.add('animate-fadeOut')
                                                await new Promise(resolve => setTimeout(resolve, 200))
                                            }
                                            setShowNavigationModal(false)
                                            if (createdTreatmentId) {
                                                router.push(`/treatments/${createdTreatmentId}`)
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Treatment Plan
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const modal = document.querySelector('.animate-fadeIn')
                                            if (modal) {
                                                modal.classList.add('animate-fadeOut')
                                                await new Promise(resolve => setTimeout(resolve, 200))
                                            }
                                            setShowNavigationModal(false)
                                            if (savedVisitIdForNav) {
                                                router.push(`/visits/${savedVisitIdForNav}`)
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        View Visit Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Prescription Preview Card */}

                </>
            )}
        </div>
    )
}

// User/Patient Prescriptions Content Component
function UserPrescriptionsContent({ user }: { user: any }) {
    const [visits, setVisits] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        fetch('/api/visits?limit=500&includePrescriptions=true')
            .then(r => r.json())
            .then(response => {
                const data = response.data || response
                // Filter visits that belong to this user
                const userVisits = data.filter((v: any) =>
                    v.patient?.email === user.email || v.patient?.phone === user.phone
                )
                setVisits(userVisits)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [user])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                <p className="text-muted">Loading your prescriptions...</p>
            </div>
        )
    }

    // Get all prescriptions from all visits
    const allPrescriptions = visits.flatMap(v =>
        (v.prescriptions || []).map((p: any) => ({ ...p, visit: v }))
    )

    return (
        <div>
            <div className="section-header">
                <h2 className="section-title">My Prescriptions</h2>
                <span className="badge">{allPrescriptions.length} prescription(s)</span>
            </div>

            {allPrescriptions.length === 0 ? (
                <div className="card text-center py-12">
                    <span className="text-6xl mb-4 block">💊</span>
                    <h3 className="text-xl font-semibold mb-2">No Prescriptions Yet</h3>
                    <p className="text-muted">Your prescribed medications will appear here after your doctor's visit.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visits.filter(v => v.prescriptions && v.prescriptions.length > 0).map(visit => (
                        <div key={visit.id} className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                            <div className="relative">
                                {/* Visit Header */}
                                <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-1">
                                                Visit - {new Date(visit.date).toLocaleDateString('en-IN', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </h3>
                                            <p className="text-sm text-muted">OPD No: <span className="text-green-600 dark:text-green-400">{visit.opdNo}</span></p>
                                            {visit.diagnoses && (
                                                <p className="text-sm mt-2">
                                                    <span className="font-medium">Diagnosis:</span> {visit.diagnoses}
                                                </p>
                                            )}
                                            {visit.chiefComplaint && (
                                                <p className="text-sm mt-1">
                                                    <span className="font-medium">Chief Complaint:</span> {visit.chiefComplaint}
                                                </p>
                                            )}
                                        </div>
                                        <Link
                                            href={`/visits/${visit.id}`}
                                            className="btn btn-secondary text-sm"
                                        >
                                            View Full Report
                                        </Link>
                                    </div>
                                </div>

                                {/* Prescriptions List */}
                                <h4 className="font-semibold mb-3">Prescribed Medications:</h4>
                                <div className="space-y-3">
                                    {visit.prescriptions.map((prescription: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center font-bold">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className="font-semibold text-base mb-2">
                                                        {prescription.product?.name || 'Medicine'}
                                                    </h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                        {prescription.dosage && (
                                                            <div>
                                                                <span className="font-medium">Dosage:</span> {prescription.dosage}
                                                            </div>
                                                        )}
                                                        {prescription.timing && (
                                                            <div>
                                                                <span className="font-medium">Timing:</span> {prescription.timing}
                                                            </div>
                                                        )}
                                                        {prescription.quantity && (
                                                            <div>
                                                                <span className="font-medium">Quantity:</span> {prescription.quantity}
                                                            </div>
                                                        )}
                                                        {prescription.administration && (
                                                            <div>
                                                                <span className="font-medium">Administration:</span> {prescription.administration}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {prescription.additions && (
                                                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                                                            <span className="font-medium">Special Instructions:</span> {prescription.additions}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
