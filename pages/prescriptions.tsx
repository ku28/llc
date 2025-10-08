import { useEffect, useRef, useState } from 'react'
import CustomSelect from '../components/CustomSelect'
import DateInput from '../components/DateInput'

export default function PrescriptionsPage() {
    const [patients, setPatients] = useState<any[]>([])
    const [treatments, setTreatments] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [form, setForm] = useState<any>({ 
        patientId: '', opdNo: '', diagnoses: '', temperament: '', pulseDiagnosis: '', pulseDiagnosis2: '',
        majorComplaints: '', historyReports: '', investigations: '', provisionalDiagnosis: '', 
        improvements: '', specialNote: '', dob: '', age: '', address: '', gender: '', phone: '', 
        nextVisitDate: '', nextVisitTime: '', occupation: '', pendingPaymentCents: '', 
        height: '', weight: '', fatherHusbandGuardianName: '',
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

    useEffect(() => { fetch('/api/patients').then(r => r.json()).then(setPatients) }, [])
    useEffect(() => { fetch('/api/treatments').then(r => r.json()).then(setTreatments) }, [])
    useEffect(() => { fetch('/api/products').then(r => r.json()).then(setProducts) }, [])

    function addSelectedProductToPrescription() {
        if (!selectedProductId) return alert('Select a medicine first')
        const prod = products.find(p => String(p.id) === String(selectedProductId))
        if (!prod) return alert('Selected product not found')
        setPrescriptions([...prescriptions, { 
            treatmentId: '', productId: String(prod.id), dosage: '', administration: '', quantity: 1, taken: false,
            // Advanced fields
            drugLabel: '', constitutionRemedy: '', symptomCode: '', effectCode: '',
            timeOfDay: '', procedureMethod: '', precautions: '', totalDays: ''
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
            treatmentId: '', productId: '', dosage: '', administration: '', quantity: 1, taken: false,
            // Advanced fields
            drugLabel: '', constitutionRemedy: '', symptomCode: '', effectCode: '',
            timeOfDay: '', procedureMethod: '', precautions: '', totalDays: ''
        }])
    }

    function updatePrescription(i: number, patch: any) {
        const copy = [...prescriptions]
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
            
            const res = await fetch('/api/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (!res.ok) { const b = await res.json().catch(() => ({ error: res.statusText })); alert('Save failed: ' + (b?.error || res.statusText)); setLoading(false); return }
            const data = await res.json()
            setLastCreatedVisitId(data.id)
            setLastCreatedVisit(data)
            // show a quick confirmation
            alert('Saved visit #' + data.id)
            // reset
            setForm({ 
                patientId: '', opdNo: '', diagnoses: '', temperament: '', pulseDiagnosis: '', pulseDiagnosis2: '',
                majorComplaints: '', historyReports: '', investigations: '', provisionalDiagnosis: '', 
                improvements: '', specialNote: '', dob: '', age: '', address: '', gender: '', phone: '', 
                nextVisitDate: '', nextVisitTime: '', occupation: '', pendingPaymentCents: '', 
                height: '', weight: '', fatherHusbandGuardianName: '',
                amount: '', discount: '', payment: '', balance: '',
                visitNumber: '', followUpCount: '', helper: '',
                procedureAdopted: '', discussion: '', extra: ''
            })
            setPrescriptions([])
        } catch (err) { console.error(err); alert('Save failed') }
        setLoading(false)
    }

    return (
        <div>
            <div className="section-header">
                <h2 className="section-title">Create Visit & Prescriptions</h2>
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
                                        weight: found.weight ?? ''
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
                                <input placeholder="Male / Female / Other" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full p-2 border rounded" />
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
                            <input placeholder="Phlegmatic" value={form.temperament} onChange={e => setForm({ ...form, temperament: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Pulse Diagnosis</label>
                            <input placeholder="1/2/3-BRN" value={form.pulseDiagnosis} onChange={e => setForm({ ...form, pulseDiagnosis: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Pulse Diagnosis 2</label>
                            <input placeholder="1/1/2-BM" value={form.pulseDiagnosis2} onChange={e => setForm({ ...form, pulseDiagnosis2: e.target.value })} className="w-full p-2 border rounded" />
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
                    {products.length === 0 ? (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                            No medicines in inventory. Add products on the <a href="/products" className="text-brand underline font-medium">Inventory page</a>.
                        </div>
                    ) : (
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
                                            <label className="block text-xs font-medium mb-1 text-muted">Treatment</label>
                                            <CustomSelect
                                                value={pr.treatmentId}
                                                onChange={(val) => updatePrescription(i, { treatmentId: val })}
                                                options={[
                                                    { value: '', label: '-- select treatment --' },
                                                    ...treatments.map(t => ({ value: String(t.id), label: t.name }))
                                                ]}
                                                placeholder="-- select treatment --"
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
                                            <label className="block text-xs font-medium mb-1 text-muted">Dosage (DOSE)</label>
                                            <input placeholder="10/DRP/TDS/LW WTR" value={pr.dosage} onChange={e => updatePrescription(i, { dosage: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Drug Label (DL)</label>
                                            <input placeholder="S1, C3, L1" value={pr.drugLabel} onChange={e => updatePrescription(i, { drugLabel: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Constitution Remedy (CR)</label>
                                            <input placeholder="S1, VEN1, F1" value={pr.constitutionRemedy} onChange={e => updatePrescription(i, { constitutionRemedy: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Symptom Code (SY)</label>
                                            <input placeholder="Symptom code" value={pr.symptomCode} onChange={e => updatePrescription(i, { symptomCode: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Effect Code (EF)</label>
                                            <input placeholder="WE, YE, GE, BE" value={pr.effectCode} onChange={e => updatePrescription(i, { effectCode: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Time of Day (TM)</label>
                                            <input placeholder="BM, AM, RAP, ALT" value={pr.timeOfDay} onChange={e => updatePrescription(i, { timeOfDay: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Administration (AD)</label>
                                            <input placeholder="Oral / Topical" value={pr.administration} onChange={e => updatePrescription(i, { administration: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Procedure (PR)</label>
                                            <input placeholder="PPH, MSG, APL/LOCAL" value={pr.procedureMethod} onChange={e => updatePrescription(i, { procedureMethod: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Precautions (PRE)</label>
                                            <input placeholder="Special precautions" value={pr.precautions} onChange={e => updatePrescription(i, { precautions: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Total Days (TDY)</label>
                                            <input type="number" placeholder="30" value={pr.totalDays} onChange={e => updatePrescription(i, { totalDays: Number(e.target.value) })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-muted">Quantity (Bottles)</label>
                                            <input type="number" step="0.01" placeholder="1" value={pr.quantity} onChange={e => updatePrescription(i, { quantity: Number(e.target.value) })} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <label className="flex items-center gap-2 flex-1 text-sm">
                                                <input type="checkbox" checked={!!pr.taken} onChange={e => updatePrescription(i, { taken: e.target.checked })} className="w-4 h-4" />
                                                <span>Taken</span>
                                            </label>
                                            <button type="button" onClick={() => { const copy = [...prescriptions]; copy.splice(i, 1); setPrescriptions(copy); }} className="btn btn-danger text-sm">
                                                Delete
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
                                {loading ? 'Saving...' : 'Save Visit & Prescriptions'}
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
                                    {lastCreatedVisit.prescriptions?.map((pr: any) => (
                                        <li key={pr.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <div className="font-medium text-brand">
                                                {(treatments.find(t => String(t.id) === String(pr.treatmentId))?.name) || 'Treatment'} 
                                                {(products.find(p => String(p.id) === String(pr.productId))?.name) ? ` — ${products.find(p => String(p.id) === String(pr.productId))?.name}` : ''}
                                            </div>
                                            <div className="text-sm text-muted mt-1">
                                                <span className="font-medium">Dosage:</span> {pr.dosage || '-'} · 
                                                <span className="font-medium ml-2">Quantity:</span> {pr.quantity} · 
                                                <span className="font-medium ml-2">Administration:</span> {pr.administration || '-'}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
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
            body{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 20px }
            h3{ margin:0 0 10px }
            .p-item{ margin-bottom: 8px }
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
