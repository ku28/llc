import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import CustomSelect from '../components/CustomSelect'
import DateInput from '../components/DateInput'
import LoadingModal from '../components/LoadingModal'
import dropdownOptions from '../data/dropdownOptions.json'
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
    const [historyAttachments, setHistoryAttachments] = useState<Array<{ url: string, name: string, type: string }>>([])
    const [reportsAttachments, setReportsAttachments] = useState<Array<{ url: string, name: string, type: string }>>([])
    const [uploadingAttachment, setUploadingAttachment] = useState(false)
    const [uploadingHistory, setUploadingHistory] = useState(false)
    const [uploadingReports, setUploadingReports] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})
    const [form, setForm] = useState<any>({
        patientId: '', opdNo: '', temperament: '', pulseDiagnosis: '', pulseDiagnosis2: '',
        majorComplaints: '', historyReports: '', investigations: '', reports: '', provisionalDiagnosis: '',
        improvements: '', specialNote: '', dob: '', age: '', address: '', gender: '', phone: '',
        nextVisitDate: '', nextVisitTime: '', occupation: '', pendingPaymentCents: '',
        height: '', heightFeet: '', heightInches: '', weight: '', fatherHusbandGuardianName: '', imageUrl: '',
        // New financial fields
        amount: '', discount: '', payment: '', balance: '',
        // New tracking fields
        visitNumber: '', followUpCount: '', helper: ''
    })
    const [prescriptions, setPrescriptions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [lastCreatedVisitId, setLastCreatedVisitId] = useState<number | null>(null)
    const [lastCreatedVisit, setLastCreatedVisit] = useState<any | null>(null)
    const previewRef = useRef<HTMLDivElement | null>(null)
    const isPatient = user?.role?.toLowerCase() === 'user'

    // Track treatment plan modifications
    const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null)
    const [originalTreatmentData, setOriginalTreatmentData] = useState<any[]>([])
    const [showSaveModal, setShowSaveModal] = useState(false)
    const [pendingSubmit, setPendingSubmit] = useState<any>(null)

    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])
    useEffect(() => { fetch('/api/patients').then(r => r.json()).then(setPatients) }, [])
    useEffect(() => { fetch('/api/treatments').then(r => r.json()).then(setTreatments) }, [])
    useEffect(() => { fetch('/api/products').then(r => r.json()).then(setProducts) }, [])

    // Auto-calculate amount from prescriptions
    useEffect(() => {
        if (prescriptions.length === 0 || products.length === 0) return
        
        let totalAmount = 0
        prescriptions.forEach(pr => {
            const product = products.find(p => String(p.id) === String(pr.productId))
            if (product && product.priceCents) {
                const quantity = parseInt(pr.quantity) || 1
                // priceCents is already in paisa (1 rupee = 100 paisa), so divide by 100
                totalAmount += ((product.priceCents) * quantity)
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
        if (form.height && form.height !== '') {
            const cm = parseFloat(form.height)
            if (!isNaN(cm)) {
                const totalInches = cm / 2.54
                const feet = Math.floor(totalInches / 12)
                const inches = Math.round(totalInches % 12)
                setForm((prev: any) => ({ ...prev, heightFeet: feet.toString(), heightInches: inches.toString() }))
            }
        }
    }, [form.height])

    // Auto-convert height: feet-inches to cm
    useEffect(() => {
        if ((form.heightFeet !== '' || form.heightInches !== '') && form.heightFeet !== undefined && form.heightInches !== undefined) {
            const feet = parseFloat(form.heightFeet) || 0
            const inches = parseFloat(form.heightInches) || 0
            const totalInches = (feet * 12) + inches
            const cm = Math.round(totalInches * 2.54)
            if (cm > 0) {
                setForm((prev: any) => ({ ...prev, height: cm.toString() }))
            }
        }
    }, [form.heightFeet, form.heightInches])

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
            fetch(`/api/visits?id=${visitId}`)
                .then(r => r.json())
                .then(visit => {
                    if (!visit) {
                        alert('Visit not found')
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
                        height: visit.patient?.height ?? '',
                        weight: visit.patient?.weight ?? '',
                        fatherHusbandGuardianName: visit.patient?.fatherHusbandGuardianName || '',
                        imageUrl: visit.patient?.imageUrl || '',
                        amount: visit.amount ?? '',
                        discount: visit.discount ?? '',
                        payment: visit.payment ?? '',
                        balance: visit.balance ?? '',
                        visitNumber: visit.visitNumber ?? '',
                        followUpCount: visit.followUpCount ?? '',
                        helper: visit.helper || ''
                    })

                    // Pre-fill prescriptions
                    if (visit.prescriptions && visit.prescriptions.length > 0) {
                        setPrescriptions(visit.prescriptions.map((p: any) => ({
                            treatmentId: p.treatmentId ? String(p.treatmentId) : '',
                            productId: String(p.productId),
                            comp1: p.comp1 || '',
                            comp2: p.comp2 || '',
                            comp3: p.comp3 || '',
                            comp4: (p.comp4 && p.comp4.trim()) ? p.comp4 : undefined,
                            comp5: (p.comp5 && p.comp5.trim()) ? p.comp5 : undefined,
                            quantity: p.quantity || 1,
                            timing: p.timing || '',
                            dosage: p.dosage || '',
                            additions: p.additions || '',
                            procedure: p.procedure || '',
                            presentation: p.presentation || '',
                            droppersToday: p.droppersToday?.toString() || '',
                            medicineQuantity: p.medicineQuantity?.toString() || '',
                            administration: p.administration || '',
                            taken: p.taken || false
                        })))
                    }

                    setLoading(false)
                })
                .catch(err => {
                    console.error(err)
                    alert('Failed to load visit data')
                    setLoading(false)
                })
        }
    }, [isEditMode, visitId, router])

    async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files || files.length === 0) return

        // Check total file count
        if (attachments.length + files.length > 10) {
            alert('You can upload a maximum of 10 files')
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
                    alert(`File "${file.name}" is too large. Maximum size is 10MB.`)
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
            alert(`Failed to upload attachments: ${error.message || 'Unknown error'}`)
        } finally {
            setUploadingAttachment(false)
            // Reset input
            e.target.value = ''
        }
    }

    function removeAttachment(index: number) {
        setAttachments(attachments.filter((_, i) => i !== index))
    }

    async function handleHistoryAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files || files.length === 0) return

        if (historyAttachments.length + files.length > 10) {
            alert('You can upload a maximum of 10 files')
            return
        }

        setUploadingHistory(true)
        try {
            const uploadedFiles: Array<{ url: string, name: string, type: string }> = []
            const selectedPatient = patients.find(p => String(p.id) === String(form.patientId))
            const patientName = selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Unknown Patient'

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                if (file.size > 10 * 1024 * 1024) {
                    alert(`File "${file.name}" is too large. Maximum size is 10MB.`)
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
                        patientName: `${patientName}/History`
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

            setHistoryAttachments([...historyAttachments, ...uploadedFiles])
        } catch (error: any) {
            console.error('History attachment upload error:', error)
            alert(`Failed to upload attachments: ${error.message || 'Unknown error'}`)
        } finally {
            setUploadingHistory(false)
            e.target.value = ''
        }
    }

    function removeHistoryAttachment(index: number) {
        setHistoryAttachments(historyAttachments.filter((_, i) => i !== index))
    }

    async function handleReportsAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files || files.length === 0) return

        if (reportsAttachments.length + files.length > 10) {
            alert('You can upload a maximum of 10 files')
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
                    alert(`File "${file.name}" is too large. Maximum size is 10MB.`)
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
                        patientName: `${patientName}/Reports`
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
            alert(`Failed to upload attachments: ${error.message || 'Unknown error'}`)
        } finally {
            setUploadingReports(false)
            e.target.value = ''
        }
    }

    function removeReportsAttachment(index: number) {
        setReportsAttachments(reportsAttachments.filter((_, i) => i !== index))
    }

    function addSelectedProductToPrescription() {
        if (!selectedProductId) return alert('Select a medicine first')
        const prod = products.find(p => String(p.id) === String(selectedProductId))
        if (!prod) return alert('Selected product not found')

        // Clear treatment plan tracking when adding individual medicine
        setSelectedTreatmentId(null)
        setOriginalTreatmentData([])

        setPrescriptions([...prescriptions, {
            treatmentId: '', productId: String(prod.id),
            comp1: '', comp2: '', comp3: '', comp4: undefined, comp5: undefined,
            quantity: 1, timing: '', dosage: '',
            additions: '', procedure: '', presentation: '',
            droppersToday: '', medicineQuantity: '',
            administration: '', taken: false
        }])
    }

    function addToSelectedMedicines() {
        if (!selectedProductId) return alert('Select a medicine first')
        
        // Check if already in the list
        if (selectedMedicines.includes(selectedProductId)) {
            return alert('This medicine is already in your selection')
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
        if (selectedMedicines.length === 0) return alert('No medicines selected')
        
        // Clear treatment plan tracking when adding individual medicines
        setSelectedTreatmentId(null)
        setOriginalTreatmentData([])

        const newPrescriptions = selectedMedicines.map(productId => ({
            treatmentId: '', productId: productId,
            comp1: '', comp2: '', comp3: '', comp4: undefined, comp5: undefined,
            quantity: 1, timing: '', dosage: '',
            additions: '', procedure: '', presentation: '',
            droppersToday: '', medicineQuantity: '',
            administration: '', taken: false
        }))

        setPrescriptions([...prescriptions, ...newPrescriptions])
        setSelectedMedicines([]) // Clear the selected medicines
        showSuccess('Medicines added to prescription successfully')
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

        setForm((prev: any) => ({
            ...prev,
            patientId: String(found.id),
            opdNo: found.opdNo || '',
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
            weight: found.weight ?? ''
        }))
    }

    function addEmptyPrescription() {
        // Clear treatment plan tracking when adding empty row
        setSelectedTreatmentId(null)
        setOriginalTreatmentData([])

        setPrescriptions([...prescriptions, {
            treatmentId: '', productId: '',
            comp1: '', comp2: '', comp3: '', comp4: undefined, comp5: undefined,
            quantity: 1, timing: '', dosage: '',
            additions: '', procedure: '', presentation: '',
            droppersToday: '', medicineQuantity: '',
            administration: '', taken: false
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
                    comp1: firstProduct.comp1 || '',
                    comp2: firstProduct.comp2 || '',
                    comp3: firstProduct.comp3 || '',
                    // Treat empty strings as undefined to hide comp4/comp5
                    comp4: (firstProduct.comp4 && firstProduct.comp4.trim()) ? firstProduct.comp4 : undefined,
                    comp5: (firstProduct.comp5 && firstProduct.comp5.trim()) ? firstProduct.comp5 : undefined,
                    quantity: firstProduct.quantity || treatment.quantity || 1,
                    timing: firstProduct.timing || '',
                    dosage: firstProduct.dosage || treatment.dosage || '',
                    additions: firstProduct.additions || '',
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
            const fields = ['productId', 'comp1', 'comp2', 'comp3', 'comp4', 'comp5',
                'quantity', 'timing', 'dosage', 'additions', 'procedure',
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
            const payload = { ...form, prescriptions }

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
            showSuccess(`Visit ${isEditMode ? 'updated' : 'created'} successfully!`)
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

    return (
        <div>
            {/* Loading Modal */}
            <LoadingModal isOpen={loading} message={isEditMode ? 'Loading visit data...' : 'Loading...'} />
            
            {isPatient ? (
                // Patient view - Read-only prescription list
                <UserPrescriptionsContent user={user} />
            ) : (
                // Staff view - Create/Edit prescriptions (original form)
                <>
                    <div className="section-header">
                        <h2 className="section-title">{isEditMode ? 'Edit Visit & Prescriptions' : 'Create Visit & Prescriptions'}</h2>
                        <p className="text-sm text-muted">Comprehensive visit recording with prescriptions and patient updates</p>
                    </div>

                    {/* Toast Notifications */}
                    <div className="fixed top-4 right-4 z-50 space-y-2">
                        {toasts.map(toast => (
                            <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slideIn ${toast.type === 'success' ? 'bg-green-500 text-white' :
                                toast.type === 'error' ? 'bg-red-500 text-white' :
                                    'bg-blue-500 text-white'
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

                    <form onSubmit={submit} className="space-y-6">
                        {/* Patient Selection Card */}
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4">Patient Information</h3>
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

                                                setForm((prev: any) => ({
                                                    ...prev,
                                                    patientId: String(found.id),
                                                    opdNo: found.opdNo || '',
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
                                            }}
                                            options={[
                                                { value: '', label: '-- select patient --' },
                                                ...patients.map(p => ({
                                                    value: String(p.id),
                                                    label: `${p.firstName} ${p.lastName}${p.opdNo ? ' · OPD: ' + p.opdNo : ''}`
                                                }))
                                            ]}
                                            placeholder="-- select patient --"
                                        />
                                    </div>
                                    {fieldErrors.patientId && (
                                        <p className="text-red-600 text-sm mt-1">{fieldErrors.patientId}</p>
                                    )}
                                </div>

                                {/* Patient Image Display - Improved Layout */}
                                {form.patientId && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 my-4">
                                        <div className="flex items-center gap-6">
                                            {/* Patient Image */}
                                            <div className="flex-shrink-0">
                                                <img
                                                    src={patients.find(p => String(p.id) === String(form.patientId))?.imageUrl || process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || ''}
                                                    alt="Patient"
                                                    className="w-24 h-24 object-cover rounded-lg border-3 border-white shadow-lg ring-2 ring-blue-200"
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
                                                            <span className="font-semibold">OPD:</span> {form.opdNo}
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
                                        <input placeholder="OPD-001" value={form.opdNo} onChange={e => setForm({ ...form, opdNo: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Date of Birth</label>
                                        <DateInput type="date" placeholder="Select date of birth" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Age</label>
                                        <input type="number" placeholder="35" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Gender</label>
                                        <CustomSelect
                                            value={form.gender}
                                            onChange={(val) => setForm({ ...form, gender: val })}
                                            options={dropdownOptions.gender}
                                            placeholder="Select gender"
                                            allowCustom={true}
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
                                        <div className="flex items-center border rounded overflow-hidden">
                                            <input 
                                                type="number" 
                                                placeholder="175" 
                                                value={form.height} 
                                                onChange={e => setForm({ ...form, height: e.target.value })} 
                                                className="flex-1 p-2 border-0 focus:outline-none focus:ring-0" 
                                            />
                                            <span className="px-2 text-xs text-gray-500">cm</span>
                                            <div className="border-l border-dashed border-gray-300 dark:border-gray-600 h-8"></div>
                                            <input 
                                                type="number" 
                                                placeholder="5" 
                                                value={form.heightFeet} 
                                                onChange={e => setForm({ ...form, heightFeet: e.target.value })} 
                                                className="w-16 p-2 border-0 text-center focus:outline-none focus:ring-0" 
                                                title="Feet"
                                            />
                                            <span className="text-xs text-gray-500">'</span>
                                            <input 
                                                type="number" 
                                                placeholder="9" 
                                                value={form.heightInches} 
                                                onChange={e => setForm({ ...form, heightInches: e.target.value })} 
                                                className="w-16 p-2 border-0 text-center focus:outline-none focus:ring-0" 
                                                title="Inches"
                                            />
                                            <span className="px-2 text-xs text-gray-500">"</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Weight (kg)</label>
                                        <input type="number" placeholder="70" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Pending Payment (₹)</label>
                                        <input type="number" step="0.01" placeholder="500.00" value={form.pendingPaymentCents} onChange={e => setForm({ ...form, pendingPaymentCents: e.target.value })} className="w-full p-2 border rounded" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Clinical Information Card */}
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4">Clinical Information</h3>
                            
                            {/* Temperament and Pulse Diagnoses in one line */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Temperament</label>
                                    <CustomSelect
                                        value={form.temperament}
                                        onChange={(val) => setForm({ ...form, temperament: val })}
                                        options={dropdownOptions.temperament}
                                        placeholder="Select temperament"
                                        allowCustom={true}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Pulse Diagnosis</label>
                                    <CustomSelect
                                        value={form.pulseDiagnosis}
                                        onChange={(val) => setForm({ ...form, pulseDiagnosis: val })}
                                        options={dropdownOptions.pulseDiagnosis}
                                        placeholder="Select pulse diagnosis"
                                        allowCustom={true}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Pulse Diagnosis 2</label>
                                    <CustomSelect
                                        value={form.pulseDiagnosis2}
                                        onChange={(val) => setForm({ ...form, pulseDiagnosis2: val })}
                                        options={dropdownOptions.pulseDiagnosis2}
                                        placeholder="Select pulse diagnosis 2"
                                        allowCustom={true}
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

                                {/* History / Reports - Split into two columns with separate attachments */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">History</label>
                                    <textarea 
                                        placeholder="Previous medical history" 
                                        value={form.historyReports} 
                                        onChange={e => setForm({ ...form, historyReports: e.target.value.toUpperCase() })} 
                                        rows={4}
                                        className="w-full p-2 border rounded resize-none mb-2"
                                    />
                                    
                                    {/* History Attachments */}
                                    <div className="p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                <span className="text-xs font-medium">
                                                    {uploadingHistory ? 'Uploading...' : 'Attach'}
                                                </span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                                                    onChange={handleHistoryAttachmentUpload}
                                                    disabled={uploadingHistory || historyAttachments.length >= 10}
                                                    className="hidden"
                                                />
                                            </label>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                ({historyAttachments.length}/10)
                                            </span>
                                        </div>
                                        {historyAttachments.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {historyAttachments.map((attachment, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs">
                                                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:text-blue-600">
                                                            {attachment.name}
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeHistoryAttachment(index)}
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
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Reports</label>
                                    <textarea 
                                        placeholder="Lab reports, test results" 
                                        value={form.reports} 
                                        onChange={e => setForm({ ...form, reports: e.target.value.toUpperCase() })} 
                                        rows={4}
                                        className="w-full p-2 border rounded resize-none mb-2"
                                    />
                                    
                                    {/* Reports Attachments */}
                                    <div className="p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                <span className="text-xs font-medium">
                                                    {uploadingReports ? 'Uploading...' : 'Attach'}
                                                </span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                                                    onChange={handleReportsAttachmentUpload}
                                                    disabled={uploadingReports || reportsAttachments.length >= 10}
                                                    className="hidden"
                                                />
                                            </label>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                ({reportsAttachments.length}/10)
                                            </span>
                                        </div>
                                        {reportsAttachments.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {reportsAttachments.map((attachment, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs">
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

                        {/* Visit Tracking Card */}
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4">Visit Tracking</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Visit Number (V)</label>
                                    <input type="number" placeholder="1" value={form.visitNumber} onChange={e => setForm({ ...form, visitNumber: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Follow-Up Count (FU)</label>
                                    <input type="number" placeholder="0" value={form.followUpCount} onChange={e => setForm({ ...form, followUpCount: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Helper/Staff ID</label>
                                    <input placeholder="Staff001" value={form.helper} onChange={e => setForm({ ...form, helper: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        </div>

                        {/* Next Visit Card */}
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4">Next Visit</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Next Visit Date</label>
                                    <DateInput type="date" placeholder="Select visit date" value={form.nextVisitDate} onChange={e => setForm({ ...form, nextVisitDate: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Next Visit Time</label>
                                    <input type="time" placeholder="Select time" value={form.nextVisitTime} onChange={e => setForm({ ...form, nextVisitTime: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        </div>


                        {/* Medicines Selection Card */}
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4">Medicine Selection</h3>

                            {/* Add from Treatment Plan */}
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <label className="block text-sm font-medium mb-2">Quick Add from Treatment Plan</label>
                                <div className="flex gap-2">
                                    <CustomSelect
                                        value={selectedTreatmentId || ""}
                                        onChange={(treatmentId) => {
                                            const treatment = treatments.find(t => String(t.id) === String(treatmentId))
                                            if (treatment && treatment.treatmentProducts && treatment.treatmentProducts.length > 0) {
                                                // Replace all medicines with the treatment plan (not add)
                                                const newPrescriptions = treatment.treatmentProducts.map((tp: any) => ({
                                                    treatmentId: String(treatment.id),
                                                    productId: String(tp.productId),
                                                    comp1: tp.comp1 || '',
                                                    comp2: tp.comp2 || '',
                                                    comp3: tp.comp3 || '',
                                                    comp4: tp.comp4 || '',
                                                    comp5: tp.comp5 || '',
                                                    quantity: tp.quantity || treatment.quantity || 1,
                                                    timing: tp.timing || '',
                                                    dosage: tp.dosage || treatment.dosage || '',
                                                    additions: tp.additions || '',
                                                    procedure: tp.procedure || treatment.procedure || '',
                                                    presentation: tp.presentation || '',
                                                    droppersToday: tp.droppersToday?.toString() || '',
                                                    medicineQuantity: tp.medicineQuantity?.toString() || '',
                                                    administration: treatment.administration || '',
                                                    taken: false
                                                }))
                                                setPrescriptions(newPrescriptions) // Replace, not add
                                                setSelectedTreatmentId(String(treatment.id))
                                                setOriginalTreatmentData(JSON.parse(JSON.stringify(newPrescriptions))) // Deep copy
                                            }
                                        }}
                                        options={[
                                            { value: '', label: '-- select treatment plan to load medicines --' },
                                            ...treatments.map(t => ({
                                                value: String(t.id),
                                                label: `${t.treatmentPlan || t.provDiagnosis || `Treatment #${t.id}`} (${t.treatmentProducts?.length || 0} medicines)`
                                            }))
                                        ]}
                                        placeholder="-- select treatment plan --"
                                        className="flex-1"
                                    />
                                </div>
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
                        />
                    </div>

                    {/* Selected Medicines List - Always visible */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                Selected Medicines ({selectedMedicines.length})
                            </span>
                            {selectedMedicines.length > 0 && (
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={removeAllSelectedMedicines}
                                        className="btn btn-secondary text-sm"
                                    >
                                        Remove All
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={addAllSelectedMedicinesToPrescription}
                                        className="btn btn-primary text-sm"
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

                        {/* Prescriptions Card */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Prescriptions</h3>
                                <button type="button" onClick={addEmptyPrescription} className="btn btn-secondary text-sm">+ Add Empty Row</button>
                            </div>
                            {prescriptions.length === 0 ? (
                                <div className="text-center py-8 text-muted">
                                    No prescriptions added yet. Use the medicine selector above or click "Add Empty Row".
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {prescriptions.map((pr, i) => (
                                        <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Treatment Plan</label>
                                                    <CustomSelect
                                                        value={pr.treatmentId}
                                                        onChange={(val) => updatePrescription(i, { treatmentId: val })}
                                                        options={[
                                                            { value: '', label: '-- select treatment plan --' },
                                                            ...treatments.map(t => ({
                                                                value: String(t.id),
                                                                label: t.treatmentPlan || t.provDiagnosis || `Treatment #${t.id}`
                                                            }))
                                                        ]}
                                                        placeholder="-- select treatment plan --"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Medicine (from inventory)</label>
                                                    <CustomSelect
                                                        value={pr.productId}
                                                        onChange={(val) => updatePrescription(i, { productId: val })}
                                                        options={[
                                                            { value: '', label: '-- select medicine --' },
                                                            ...products.map(p => ({
                                                                value: String(p.id),
                                                                label: `${p.name} · Stock: ${p.quantity}${p.reorderLevel ? ' · Reorder: ' + p.reorderLevel : ''}`
                                                            }))
                                                        ]}
                                                        placeholder="-- select medicine --"
                                                    />
                                                </div>

                                                {/* Components Section - All in one line */}
                                                <div className="sm:col-span-2 lg:col-span-3">
                                                    <label className="block text-xs font-medium mb-1 text-muted">Components</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            placeholder="Component 1"
                                                            value={pr.comp1 || ''}
                                                            onChange={e => updatePrescription(i, { comp1: e.target.value })}
                                                            className="flex-1 p-2 border rounded text-sm"
                                                        />
                                                        <input
                                                            placeholder="Component 2"
                                                            value={pr.comp2 || ''}
                                                            onChange={e => updatePrescription(i, { comp2: e.target.value })}
                                                            className="flex-1 p-2 border rounded text-sm"
                                                        />
                                                        <input
                                                            placeholder="Component 3"
                                                            value={pr.comp3 || ''}
                                                            onChange={e => updatePrescription(i, { comp3: e.target.value })}
                                                            className="flex-1 p-2 border rounded text-sm"
                                                        />

                                                        {/* Show comp4 if it exists */}
                                                        {pr.comp4 !== undefined && (
                                                            <div className="flex-1 flex items-center gap-1">
                                                                <input
                                                                    placeholder="Component 4"
                                                                    value={pr.comp4 || ''}
                                                                    onChange={e => updatePrescription(i, { comp4: e.target.value })}
                                                                    className="flex-1 p-2 border rounded text-sm"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        updatePrescription(i, { comp4: undefined, comp5: undefined })
                                                                    }}
                                                                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                                                    title="Remove component 4"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Show comp5 if it exists */}
                                                        {pr.comp5 !== undefined && (
                                                            <div className="flex-1 flex items-center gap-1">
                                                                <input
                                                                    placeholder="Component 5"
                                                                    value={pr.comp5 || ''}
                                                                    onChange={e => updatePrescription(i, { comp5: e.target.value })}
                                                                    className="flex-1 p-2 border rounded text-sm"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        updatePrescription(i, { comp5: undefined })
                                                                    }}
                                                                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                                                    title="Remove component 5"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Plus button - show if less than 5 components */}
                                                        {pr.comp5 === undefined && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (pr.comp4 === undefined) {
                                                                        updatePrescription(i, { comp4: '' })
                                                                    } else {
                                                                        updatePrescription(i, { comp5: '' })
                                                                    }
                                                                }}
                                                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                                                title="Add component"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Qty (Drops)</label>
                                                    <input type="number" min="1" placeholder="0" value={pr.quantity} onChange={e => updatePrescription(i, { quantity: Number(e.target.value) })} className="w-full p-2 border rounded text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Timing</label>
                                                    <select
                                                        value={pr.timing || ''}
                                                        onChange={e => updatePrescription(i, { timing: e.target.value })}
                                                        className="w-full p-2 border rounded text-sm"
                                                    >
                                                        <option value="">Select timing</option>
                                                        <option value="BM">Before Meal</option>
                                                        <option value="AM">After Meal</option>
                                                        <option value="WM">With Meal</option>
                                                        <option value="HS">At Bedtime</option>
                                                        <option value="EMPTY">Empty Stomach</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Dosage</label>
                                                    <input placeholder="5 drops, 3x daily" value={pr.dosage || ''} onChange={e => updatePrescription(i, { dosage: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Additions</label>
                                                    <input placeholder="Additional notes" value={pr.additions || ''} onChange={e => updatePrescription(i, { additions: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Procedure</label>
                                                    <input placeholder="Procedure" value={pr.procedure || ''} onChange={e => updatePrescription(i, { procedure: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Presentation</label>
                                                    <input placeholder="Tablet, Drops, etc." value={pr.presentation || ''} onChange={e => updatePrescription(i, { presentation: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Droppers Today</label>
                                                    <input type="number" placeholder="0" value={pr.droppersToday || ''} onChange={e => updatePrescription(i, { droppersToday: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Medicine Quantity</label>
                                                    <input type="number" placeholder="0" value={pr.medicineQuantity || ''} onChange={e => updatePrescription(i, { medicineQuantity: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1 text-muted">Administration</label>
                                                    <input placeholder="Oral / Topical" value={pr.administration || ''} onChange={e => updatePrescription(i, { administration: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                                </div>
                                                <div className="flex items-end gap-2">
                                                    <label className="flex items-center gap-2 flex-1 text-sm">
                                                        <input type="checkbox" checked={!!pr.taken} onChange={e => updatePrescription(i, { taken: e.target.checked })} className="w-4 h-4" />
                                                        <span>Taken</span>
                                                    </label>
                                                    <button type="button" onClick={() => { const copy = [...prescriptions]; copy.splice(i, 1); setPrescriptions(copy); }} className="btn btn-danger text-sm">
                                                        × Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Financial Information Card */}
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4">Financial Information</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                        <div className="card">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-muted">
                                    {prescriptions.length > 0 && (
                                        <span>{prescriptions.length} prescription(s) added</span>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button disabled={loading} className="btn btn-primary">
                                        {loading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Visit & Prescriptions' : 'Save Visit & Prescriptions')}
                                    </button>
                                    {lastCreatedVisitId && (
                                        <a href={`/visits/${lastCreatedVisitId}`} target="_blank" rel="noreferrer" className="btn btn-secondary">
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
                                    <button
                                        onClick={async () => {
                                            // Fade out animation
                                            const modal = document.querySelector('.animate-fadeIn')
                                            if (modal) {
                                                modal.classList.add('animate-fadeOut')
                                                await new Promise(resolve => setTimeout(resolve, 200))
                                            }
                                            setShowSaveModal(false)

                                            // Create new treatment plan with modified data
                                            try {
                                                const originalTreatment = treatments.find(t => String(t.id) === String(selectedTreatmentId))
                                                if (!originalTreatment) {
                                                    showError('Original treatment plan not found')
                                                    return
                                                }

                                                // Prepare the new treatment plan data
                                                const newTreatmentData = {
                                                    srNo: originalTreatment.srNo || '',
                                                    speciality: originalTreatment.speciality || '',
                                                    organ: originalTreatment.organ || '',
                                                    diseaseAction: originalTreatment.diseaseAction || '',
                                                    provDiagnosis: originalTreatment.provDiagnosis || '',
                                                    treatmentPlan: `${originalTreatment.provDiagnosis} - Variation ${Date.now()}`,
                                                    planNumber: '', // Will be auto-generated
                                                    administration: originalTreatment.administration || '',
                                                    notes: `Modified from treatment plan #${originalTreatment.id}`,
                                                    medicines: prescriptions.map(pr => ({
                                                        productId: pr.productId,
                                                        comp1: pr.comp1 || '',
                                                        comp2: pr.comp2 || '',
                                                        comp3: pr.comp3 || '',
                                                        comp4: pr.comp4 || '',
                                                        comp5: pr.comp5 || '',
                                                        quantity: pr.quantity || 1,
                                                        timing: pr.timing || '',
                                                        dosage: pr.dosage || '',
                                                        additions: pr.additions || '',
                                                        procedure: pr.procedure || '',
                                                        presentation: pr.presentation || '',
                                                        droppersToday: pr.droppersToday || '',
                                                        medicineQuantity: pr.medicineQuantity || ''
                                                    }))
                                                }

                                                showInfo('Creating new treatment plan...')

                                                // Create the new treatment plan
                                                const res = await fetch('/api/treatments', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(newTreatmentData)
                                                })

                                                if (!res.ok) {
                                                    const error = await res.json().catch(() => ({ error: 'Failed to create treatment plan' }))
                                                    showError(error.error || 'Failed to create treatment plan')
                                                    return
                                                }

                                                const createdTreatment = await res.json()
                                                showSuccess('Treatment plan created successfully!')

                                                // Redirect to edit page of the new treatment plan
                                                setTimeout(() => {
                                                    router.push(`/treatments/${createdTreatment.id}`)
                                                }, 500)

                                            } catch (error: any) {
                                                console.error('Error creating treatment plan:', error)
                                                showError(error.message || 'Failed to create treatment plan')
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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

                    {/* Prescription Preview Card */}
                    {lastCreatedVisit && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                    Prescription Preview
                                </h3>
                                <button
                                    onClick={() => {
                                        if (lastCreatedVisitId) {
                                            window.open(`/visits/${lastCreatedVisitId}`, '_blank')
                                        }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    View Full Details
                                </button>
                            </div>

                            {/* Patient Information */}
                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Patient Name</p>
                                        <p className="font-semibold text-gray-800 dark:text-white">
                                            {lastCreatedVisit.patient?.firstName} {lastCreatedVisit.patient?.lastName}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">OPD No.</p>
                                        <p className="font-semibold text-gray-800 dark:text-white">
                                            {lastCreatedVisit.opdNo}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                                        <p className="font-semibold text-gray-800 dark:text-white">
                                            {new Date(lastCreatedVisit.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                                        <p className="font-semibold text-gray-800 dark:text-white">
                                            {lastCreatedVisit.phone || lastCreatedVisit.patient?.phone}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Prescriptions */}
                            {lastCreatedVisit.prescriptions && lastCreatedVisit.prescriptions.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Prescriptions</h4>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Medicine</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dosage</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Frequency</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duration</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {lastCreatedVisit.prescriptions.map((prescription: any, index: number) => (
                                                    <tr key={index}>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{index + 1}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                            {prescription.product?.name || prescription.treatment?.treatmentPlan || 'N/A'}
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{prescription.dosage || '-'}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{prescription.frequency || '-'}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{prescription.duration || '-'}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{prescription.quantity || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Diagnosis & Notes */}
                            <div className="grid grid-cols-1 gap-4">
                                {lastCreatedVisit.provisionalDiagnosis && (
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Provisional Diagnosis</p>
                                        <p className="text-gray-800 dark:text-white">{lastCreatedVisit.provisionalDiagnosis}</p>
                                    </div>
                                )}
                                {lastCreatedVisit.majorComplaints && (
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Chief Complaints</p>
                                        <p className="text-gray-800 dark:text-white">{lastCreatedVisit.majorComplaints}</p>
                                    </div>
                                )}
                            </div>

                            {/* Financial Information */}
                            {lastCreatedVisit.amount && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-end">
                                        <div className="w-64">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                                                <span className="font-semibold text-gray-800 dark:text-white">₹{lastCreatedVisit.amount}</span>
                                            </div>
                                            {lastCreatedVisit.discount > 0 && (
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                                                    <span className="font-semibold text-gray-800 dark:text-white">₹{lastCreatedVisit.discount}</span>
                                                </div>
                                            )}
                                            {lastCreatedVisit.payment > 0 && (
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-gray-600 dark:text-gray-400">Payment:</span>
                                                    <span className="font-semibold text-gray-800 dark:text-white">₹{lastCreatedVisit.payment}</span>
                                                </div>
                                            )}
                                            {lastCreatedVisit.balance !== undefined && (
                                                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <span className="text-gray-800 dark:text-white font-bold">Balance:</span>
                                                    <span className="font-bold text-gray-800 dark:text-white">₹{lastCreatedVisit.balance}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
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
        fetch('/api/visits')
            .then(r => r.json())
            .then(data => {
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
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
                        <div key={visit.id} className="card">
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
                                        <p className="text-sm text-muted">OPD No: {visit.opdNo}</p>
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
                    ))}
                </div>
            )}
        </div>
    )
}
