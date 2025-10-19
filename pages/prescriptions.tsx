import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import CustomSelect from '../components/CustomSelect'
import DateInput from '../components/DateInput'
import dropdownOptions from '../data/dropdownOptions.json'

export default function PrescriptionsPage() {
    const router = useRouter()
    const { visitId, edit } = router.query
    const isEditMode = edit === 'true' && visitId
    
    const [user, setUser] = useState<any>(null)
    const [patients, setPatients] = useState<any[]>([])
    const [treatments, setTreatments] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [form, setForm] = useState<any>({ 
        patientId: '', opdNo: '', diagnoses: '', temperament: '', pulseDiagnosis: '', pulseDiagnosis2: '',
        majorComplaints: '', historyReports: '', investigations: '', provisionalDiagnosis: '', 
        improvements: '', specialNote: '', dob: '', age: '', address: '', gender: '', phone: '', 
        nextVisitDate: '', nextVisitTime: '', occupation: '', pendingPaymentCents: '', 
        height: '', weight: '', fatherHusbandGuardianName: '', imageUrl: '',
        // New financial fields
        amount: '', discount: '', payment: '', balance: '',
        // New tracking fields
        visitNumber: '', followUpCount: '', helper: '',
        // New note fields
        procedureAdopted: '', discussion: '', extra: ''
    })
    const [prescriptions, setPrescriptions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [lastCreatedVisitId, setLastCreatedVisitId] = useState<number | null>(null)
    const [lastCreatedVisit, setLastCreatedVisit] = useState<any | null>(null)
    const previewRef = useRef<HTMLDivElement | null>(null)
    const isPatient = user?.role?.toLowerCase() === 'user'

    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])
    useEffect(() => { fetch('/api/patients').then(r => r.json()).then(setPatients) }, [])
    useEffect(() => { fetch('/api/treatments').then(r => r.json()).then(setTreatments) }, [])
    useEffect(() => { fetch('/api/products').then(r => r.json()).then(setProducts) }, [])

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
                        diagnoses: visit.diagnoses || '',
                        temperament: visit.temperament || '',
                        pulseDiagnosis: visit.pulseDiagnosis || '',
                        pulseDiagnosis2: visit.pulseDiagnosis2 || '',
                        majorComplaints: visit.majorComplaints || '',
                        historyReports: visit.historyReports || '',
                        investigations: visit.investigations || '',
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
                        helper: visit.helper || '',
                        procedureAdopted: visit.procedureAdopted || '',
                        discussion: visit.discussion || '',
                        extra: visit.extra || ''
                    })
                    
                    // Pre-fill prescriptions
                    if (visit.prescriptions && visit.prescriptions.length > 0) {
                        setPrescriptions(visit.prescriptions.map((p: any) => ({
                            treatmentId: p.treatmentId ? String(p.treatmentId) : '',
                            productId: String(p.productId),
                            comp1: p.comp1 || '',
                            comp2: p.comp2 || '',
                            comp3: p.comp3 || '',
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

    function addSelectedProductToPrescription() {
        if (!selectedProductId) return alert('Select a medicine first')
        const prod = products.find(p => String(p.id) === String(selectedProductId))
        if (!prod) return alert('Selected product not found')
        setPrescriptions([...prescriptions, { 
            treatmentId: '', productId: String(prod.id), 
            comp1: '', comp2: '', comp3: '',
            quantity: 1, timing: '', dosage: '', 
            additions: '', procedure: '', presentation: '',
            droppersToday: '', medicineQuantity: '',
            administration: '', taken: false
        }])
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
        setPrescriptions([...prescriptions, { 
            treatmentId: '', productId: '', 
            comp1: '', comp2: '', comp3: '',
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
                alert(`${isEditMode ? 'Update' : 'Save'} failed: ` + (b?.error || res.statusText))
                setLoading(false)
                return 
            }
            const data = await res.json()
            setLastCreatedVisitId(data.id)
            setLastCreatedVisit(data)
            // Redirect to visit details page
            router.push(`/visits/${data.id}`)
        } catch (err) { 
            console.error(err)
            alert(`${isEditMode ? 'Update' : 'Save'} failed`) 
        }
        setLoading(false)
    }

    return (
        <div>
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

                    <form onSubmit={submit} className="space-y-6">
                {/* Patient Selection Card */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Patient Information</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Select Patient *</label>
                            <CustomSelect
                                required
                                value={form.patientId}
                                onChange={(id) => {
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
                                <input placeholder="OPD-001" value={form.opdNo} onChange={e => setForm({ ...form, opdNo: e.target.value })} className="w-full p-2 border rounded" />
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
                                <input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Occupation</label>
                                <input placeholder="Engineer" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium mb-1.5">Address</label>
                                <input placeholder="123 Main St, City" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium mb-1.5">Father/Husband/Guardian Name</label>
                                <input placeholder="Guardian name" value={form.fatherHusbandGuardianName} onChange={e => setForm({ ...form, fatherHusbandGuardianName: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Height (cm)</label>
                                <input type="number" placeholder="175" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Weight (kg)</label>
                                <input type="number" placeholder="70" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Pending Payment (₹)</label>
                                <input type="number" step="0.01" placeholder="500.00" value={form.pendingPaymentCents} onChange={e => setForm({ ...form, pendingPaymentCents: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
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
                </div>

                {/* Clinical Information Card */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Clinical Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Diagnosis</label>
                            <input placeholder="Fever, Common Cold" value={form.diagnoses} onChange={e => setForm({ ...form, diagnoses: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
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
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Major Complaints</label>
                            <input placeholder="Headache, Fatigue" value={form.majorComplaints} onChange={e => setForm({ ...form, majorComplaints: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">History / Reports</label>
                            <input placeholder="Previous medical history" value={form.historyReports} onChange={e => setForm({ ...form, historyReports: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Investigation Ordered</label>
                            <input placeholder="Blood test, X-ray" value={form.investigations} onChange={e => setForm({ ...form, investigations: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Provisional Diagnosis</label>
                            <input placeholder="Viral infection" value={form.provisionalDiagnosis} onChange={e => setForm({ ...form, provisionalDiagnosis: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Improvements</label>
                            <input placeholder="Patient showing recovery" value={form.improvements} onChange={e => setForm({ ...form, improvements: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1.5">Special Note</label>
                            <input placeholder="Follow-up in 7 days" value={form.specialNote} onChange={e => setForm({ ...form, specialNote: e.target.value })} className="w-full p-2 border rounded" />
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

                {/* Additional Notes Card */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Additional Notes</h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Procedure Adopted</label>
                            <textarea rows={2} placeholder="Procedures performed during visit" value={form.procedureAdopted} onChange={e => setForm({ ...form, procedureAdopted: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Discussion</label>
                            <textarea rows={2} placeholder="Discussion notes and observations" value={form.discussion} onChange={e => setForm({ ...form, discussion: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Extra Notes</label>
                            <textarea rows={2} placeholder="Additional notes or charges" value={form.extra} onChange={e => setForm({ ...form, extra: e.target.value })} className="w-full p-2 border rounded" />
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
                                value=""
                                onChange={(treatmentId) => {
                                    const treatment = treatments.find(t => String(t.id) === String(treatmentId))
                                    if (treatment && treatment.treatmentProducts && treatment.treatmentProducts.length > 0) {
                                        // Add all medicines from the treatment plan
                                        const newPrescriptions = treatment.treatmentProducts.map((tp: any) => ({
                                            treatmentId: String(treatment.id),
                                            productId: String(tp.productId),
                                            comp1: tp.comp1 || '',
                                            comp2: tp.comp2 || '',
                                            comp3: tp.comp3 || '',
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
                                        setPrescriptions([...prescriptions, ...newPrescriptions])
                                    }
                                }}
                                options={[
                                    { value: '', label: '-- select treatment plan to add all medicines --' },
                                    ...treatments.map(t => ({ 
                                        value: String(t.id), 
                                        label: `${t.treatmentPlan || t.provDiagnosis || `Treatment #${t.id}`} (${t.treatmentProducts?.length || 0} medicines)` 
                                    }))
                                ]}
                                placeholder="-- select treatment plan --"
                                className="flex-1"
                            />
                        </div>
                        <p className="text-xs text-muted mt-1">This will add all medicines from the selected treatment plan with pre-filled dosages and instructions.</p>
                    </div>

                    {/* Add Individual Medicine */}
                    {products.length === 0 ? (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                            No medicines in inventory. Add products on the <a href="/products" className="text-brand underline font-medium">Inventory page</a>.
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium mb-2">Or Add Individual Medicine</label>
                            <div className="flex gap-2">
                            <CustomSelect
                                value={selectedProductId}
                                onChange={setSelectedProductId}
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
                            <button type="button" onClick={addSelectedProductToPrescription} className="btn btn-primary">Add to Prescription</button>
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
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Comp 1</label>
                                            <input placeholder="Component 1" value={pr.comp1 || ''} onChange={e => updatePrescription(i, { comp1: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Comp 2</label>
                                            <input placeholder="Component 2" value={pr.comp2 || ''} onChange={e => updatePrescription(i, { comp2: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Comp 3</label>
                                            <input placeholder="Component 3" value={pr.comp3 || ''} onChange={e => updatePrescription(i, { comp3: e.target.value })} className="w-full p-2 border rounded text-sm" />
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

            {/* Prescription Preview Card */}
            {lastCreatedVisit && (
                <div className="card mt-6" ref={el => previewRef.current = el}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Prescription Preview — Visit #{lastCreatedVisit.id}</h3>
                        <button onClick={() => openPrintableWindow(previewRef.current)} className="btn btn-primary text-sm">
                            🖨️ Print / Save PDF
                        </button>
                    </div>

                    {/* TOP PART - FOR PATIENT (WITHOUT COMPOSITION) */}
                    <div className="prescription-section border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 mb-8 rounded-lg">
                        <div className="text-center mb-4">
                            <h2 className="text-xl font-bold">PRESCRIPTION - PATIENT COPY</h2>
                            <p className="text-sm text-muted">For Patient's Reference</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                                <div className="font-semibold mb-2">Patient Information</div>
                                <div className="text-sm space-y-1">
                                    <div><span className="font-medium">Name:</span> {(patients.find(p => String(p.id) === String(lastCreatedVisit.patientId))?.firstName) || lastCreatedVisit.patient?.firstName || ''} {(patients.find(p => String(p.id) === String(lastCreatedVisit.patientId))?.lastName) || lastCreatedVisit.patient?.lastName || ''}</div>
                                    <div><span className="font-medium">OPD Number:</span> {lastCreatedVisit.opdNo}</div>
                                    <div><span className="font-medium">Date:</span> {new Date(lastCreatedVisit.date).toLocaleString()}</div>
                                </div>
                            </div>

                            <div>
                                <div className="font-semibold mb-3">Prescribed Medicines</div>
                                {lastCreatedVisit.prescriptions?.length === 0 ? (
                                    <div className="text-center py-4 text-muted text-sm">No prescriptions</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {lastCreatedVisit.prescriptions?.map((pr: any, index: number) => {
                                            const product = products.find(p => String(p.id) === String(pr.productId))
                                            const treatment = treatments.find(t => String(t.id) === String(pr.treatmentId))
                                            return (
                                                <li key={pr.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                    <div className="font-medium text-brand text-lg">
                                                        {index + 1}. {product?.name || 'Medicine'}
                                                    </div>
                                                    <div className="text-sm mt-2 space-y-1">
                                                        {pr.dosage && <div><span className="font-medium">Dosage:</span> {pr.dosage}</div>}
                                                        {pr.timing && <div><span className="font-medium">Timing:</span> {pr.timing}</div>}
                                                        {pr.quantity && <div><span className="font-medium">Quantity:</span> {pr.quantity}</div>}
                                                        {pr.administration && <div><span className="font-medium">Administration:</span> {pr.administration}</div>}
                                                        {pr.procedure && <div><span className="font-medium">Procedure:</span> {pr.procedure}</div>}
                                                        {pr.additions && <div><span className="font-medium">Additional Instructions:</span> {pr.additions}</div>}
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PAGE BREAK FOR PRINTING */}
                    <div className="page-break" style={{ pageBreakAfter: 'always', borderTop: '2px dashed #ccc', margin: '20px 0' }}></div>

                    {/* BOTTOM PART - WITH COMPOSITION (FOR RECORD/PHARMACIST) */}
                    <div className="prescription-section border-2 border-dashed border-blue-300 dark:border-blue-600 p-6 rounded-lg">
                        <div className="text-center mb-4">
                            <h2 className="text-xl font-bold">PRESCRIPTION - COMPLETE RECORD</h2>
                            <p className="text-sm text-muted">With Full Composition Details</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                                <div className="font-semibold mb-2">Patient Information</div>
                                <div className="text-sm space-y-1">
                                    <div><span className="font-medium">Name:</span> {(patients.find(p => String(p.id) === String(lastCreatedVisit.patientId))?.firstName) || lastCreatedVisit.patient?.firstName || ''} {(patients.find(p => String(p.id) === String(lastCreatedVisit.patientId))?.lastName) || lastCreatedVisit.patient?.lastName || ''}</div>
                                    <div><span className="font-medium">OPD Number:</span> {lastCreatedVisit.opdNo}</div>
                                    <div><span className="font-medium">Date:</span> {new Date(lastCreatedVisit.date).toLocaleString()}</div>
                                </div>
                            </div>

                            <div>
                                <div className="font-semibold mb-3">Prescribed Medicines (With Composition)</div>
                                {lastCreatedVisit.prescriptions?.length === 0 ? (
                                    <div className="text-center py-4 text-muted text-sm">No prescriptions</div>
                                ) : (
                                    <ul className="space-y-3">
                                        {lastCreatedVisit.prescriptions?.map((pr: any, index: number) => {
                                            const product = products.find(p => String(p.id) === String(pr.productId))
                                            const treatment = treatments.find(t => String(t.id) === String(pr.treatmentId))
                                            return (
                                                <li key={pr.id} className="p-4 border-2 border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                                    <div className="font-medium text-brand text-lg mb-2">
                                                        {index + 1}. {product?.name || 'Medicine'}
                                                    </div>
                                                    
                                                    {/* COMPOSITION SECTION */}
                                                    {(pr.comp1 || pr.comp2 || pr.comp3) && (
                                                        <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
                                                            <div className="font-semibold text-sm mb-1">🔬 Composition:</div>
                                                            <div className="text-sm space-y-0.5">
                                                                {pr.comp1 && <div>• Component 1: {pr.comp1}</div>}
                                                                {pr.comp2 && <div>• Component 2: {pr.comp2}</div>}
                                                                {pr.comp3 && <div>• Component 3: {pr.comp3}</div>}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* TREATMENT PLAN INFO */}
                                                    {treatment && (
                                                        <div className="mb-2 text-sm">
                                                            <span className="font-medium">Treatment Plan:</span> {treatment.treatmentPlan || treatment.provDiagnosis || 'N/A'}
                                                        </div>
                                                    )}

                                                    {/* ALL OTHER DETAILS */}
                                                    <div className="text-sm space-y-1">
                                                        {pr.dosage && <div><span className="font-medium">Dosage:</span> {pr.dosage}</div>}
                                                        {pr.timing && <div><span className="font-medium">Timing:</span> {pr.timing}</div>}
                                                        {pr.quantity && <div><span className="font-medium">Quantity:</span> {pr.quantity}</div>}
                                                        {pr.administration && <div><span className="font-medium">Administration:</span> {pr.administration}</div>}
                                                        {pr.procedure && <div><span className="font-medium">Procedure:</span> {pr.procedure}</div>}
                                                        {pr.presentation && <div><span className="font-medium">Presentation:</span> {pr.presentation}</div>}
                                                        {pr.droppersToday && <div><span className="font-medium">Droppers Today:</span> {pr.droppersToday}</div>}
                                                        {pr.medicineQuantity && <div><span className="font-medium">Medicine Quantity:</span> {pr.medicineQuantity}</div>}
                                                        {pr.additions && <div><span className="font-medium">Additional Instructions:</span> {pr.additions}</div>}
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
                </>
            )}
        </div>
    )
}

function openPrintableWindow(node: HTMLDivElement | null){
    if (!node) return alert('Nothing to print')
    const html = `
      <html>
        <head>
          <title>Prescription</title>
          <style>
            body{ 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; 
              padding: 20px;
              max-width: 1000px;
              margin: 0 auto;
            }
            h2{ margin: 0 0 10px; color: #333; }
            h3{ margin:0 0 10px }
            .p-item{ margin-bottom: 8px }
            .prescription-section { 
              margin-bottom: 30px;
              padding: 20px;
              border: 2px dashed #ccc;
              border-radius: 8px;
            }
            .page-break { 
              page-break-after: always;
              border-top: 2px dashed #ccc;
              margin: 30px 0;
              padding-top: 10px;
            }
            .text-center { text-align: center; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .space-y-3 > * + * { margin-top: 0.75rem; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .p-4 { padding: 1rem; }
            .p-3 { padding: 0.75rem; }
            .p-2 { padding: 0.5rem; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-yellow-50 { background-color: #fefce8; }
            .rounded-lg { border-radius: 0.5rem; }
            .border { border: 1px solid #e5e7eb; }
            .border-2 { border: 2px solid; }
            .border-gray-200 { border-color: #e5e7eb; }
            .border-blue-200 { border-color: #bfdbfe; }
            .border-yellow-300 { border-color: #fde047; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .font-bold { font-weight: 700; }
            .text-sm { font-size: 0.875rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-brand { color: #3b82f6; }
            .text-muted { color: #6b7280; }
            ul { list-style: none; padding: 0; }
            @media print {
              body { padding: 10px; }
              .page-break { page-break-after: always; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${node.innerHTML}
        </body>
      </html>
    `
    const w = window.open('', '_blank')
    if (!w) return alert('Unable to open new window — please allow popups')
    w.document.open()
    w.document.write(html)
    w.document.close()
    setTimeout(()=>{ w.focus(); w.print(); }, 500)
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
