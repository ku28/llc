import { useEffect, useRef, useState } from 'react'

export default function PrescriptionsPage() {
    const [patients, setPatients] = useState<any[]>([])
    const [treatments, setTreatments] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [form, setForm] = useState<any>({ patientId: '', opdNo: '', diagnoses: '', temperament: '', pulseDiagnosis: '', majorComplaints: '', historyReports: '', investigations: '', provisionalDiagnosis: '', improvements: '', specialNote: '', dob: '', age: '', address: '', gender: '', phone: '', nextVisit: '', occupation: '', pendingPaymentCents: '', height: '', weight: '' })
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
        setPrescriptions([...prescriptions, { treatmentId: '', productId: String(prod.id), dosage: '', administration: '', quantity: 1, taken: false }])
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
        setForm((prev: any) => ({
            ...prev,
            patientId: String(found.id),
            opdNo: found.opdNo || '',
            dob: formatDateForInput(found.dob),
            age: found.age ?? '',
            address: found.address || '',
            gender: found.gender || '',
            phone: found.phone || '',
            nextVisit: formatDateTimeLocal(found.nextVisit),
            occupation: found.occupation || '',
            pendingPaymentCents: found.pendingPaymentCents ?? '',
            height: found.height ?? '',
            weight: found.weight ?? ''
        }))
    }

    function addEmptyPrescription() {
        setPrescriptions([...prescriptions, { treatmentId: '', productId: '', dosage: '', administration: '', quantity: 1, taken: false }])
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
            const res = await fetch('/api/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (!res.ok) { const b = await res.json().catch(() => ({ error: res.statusText })); alert('Save failed: ' + (b?.error || res.statusText)); setLoading(false); return }
            const data = await res.json()
            setLastCreatedVisitId(data.id)
            setLastCreatedVisit(data)
            // show a quick confirmation
            alert('Saved visit #' + data.id)
            // reset
            setForm({ patientId: '', opdNo: '', diagnoses: '', temperament: '', pulseDiagnosis: '', majorComplaints: '', historyReports: '', investigations: '', provisionalDiagnosis: '', improvements: '', specialNote: '', dob: '', age: '', address: '', gender: '', phone: '', nextVisit: '', occupation: '', pendingPaymentCents: '', height: '', weight: '' })
            setPrescriptions([])
        } catch (err) { console.error(err); alert('Save failed') }
        setLoading(false)
    }

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Create Visit & Prescriptions</h2>
            <form onSubmit={submit} className="grid grid-cols-1 gap-3">
                <div>
                    <label className="block text-sm font-medium">Patient</label>
                    <select required value={form.patientId} onChange={handlePatientChange} className="p-2 border rounded w-full">
                        <option value="">-- select patient --</option>
                        {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.opdNo ? '· OPD: ' + p.opdNo : ''}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium">Medicines (inventory)</label>
                    {products.length === 0 ? (
                        <div className="text-sm text-gray-500">No medicines in inventory. Add products on the Inventory page.</div>
                    ) : (
                        <div className="flex gap-2">
                            <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="p-2 border rounded w-full">
                                <option value="">-- select medicine --</option>
                                {products.map(p => {
                                    const rl = (p as any).reorderLevel ?? 0
                                    const low = p.quantity <= rl
                                    return <option key={p.id} value={p.id}>{p.name} · Qty: {p.quantity}{rl ? ' · Reorder: ' + rl : ''}{low ? ' · LOW' : ''}</option>
                                })}
                            </select>
                            <button type="button" onClick={addSelectedProductToPrescription} className="px-3 py-1 bg-blue-600 text-white rounded">Add</button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input placeholder="OPD No" value={form.opdNo} onChange={e => setForm({ ...form, opdNo: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Diagnoses" value={form.diagnoses} onChange={e => setForm({ ...form, diagnoses: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Temperament" value={form.temperament} onChange={e => setForm({ ...form, temperament: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Pulse diagnosis" value={form.pulseDiagnosis} onChange={e => setForm({ ...form, pulseDiagnosis: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Major complaints" value={form.majorComplaints} onChange={e => setForm({ ...form, majorComplaints: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="History / reports" value={form.historyReports} onChange={e => setForm({ ...form, historyReports: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Investigation ordered" value={form.investigations} onChange={e => setForm({ ...form, investigations: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Provisional diagnosis" value={form.provisionalDiagnosis} onChange={e => setForm({ ...form, provisionalDiagnosis: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Improvements" value={form.improvements} onChange={e => setForm({ ...form, improvements: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Special note" value={form.specialNote} onChange={e => setForm({ ...form, specialNote: e.target.value })} className="p-2 border rounded" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input type="date" placeholder="DOB" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Age" type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Gender" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="p-2 border rounded" />
                    <input type="datetime-local" placeholder="Next visit" value={form.nextVisit} onChange={e => setForm({ ...form, nextVisit: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Occupation" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Pending payment (cents)" type="number" value={form.pendingPaymentCents} onChange={e => setForm({ ...form, pendingPaymentCents: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Height" type="number" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} className="p-2 border rounded" />
                    <input placeholder="Weight" type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="p-2 border rounded" />
                </div>

                <div>
                    <h3 className="font-semibold">Prescriptions</h3>
                    <div className="space-y-2">
                        {prescriptions.map((pr, i) => (
                            <div key={i} className="p-2 border rounded grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
                                <select value={pr.treatmentId} onChange={e => updatePrescription(i, { treatmentId: e.target.value })} className="p-2 border rounded">
                                    <option value="">-- treatment --</option>
                                    {treatments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                {/* product selection shows inventory and qty */}
                                <select value={pr.productId} onChange={e => updatePrescription(i, { productId: e.target.value })} className="p-2 border rounded">
                                    <option value="">-- medicine (inventory) --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} · Qty: {p.quantity}{p.reorderLevel ? ' · Reorder: ' + p.reorderLevel : ''}</option>)}
                                </select>
                                <input placeholder="Dosage" value={pr.dosage} onChange={e => updatePrescription(i, { dosage: e.target.value })} className="p-2 border rounded" />
                                <input placeholder="Administration" value={pr.administration} onChange={e => updatePrescription(i, { administration: e.target.value })} className="p-2 border rounded" />
                                <input placeholder="Quantity" type="number" value={pr.quantity} onChange={e => updatePrescription(i, { quantity: Number(e.target.value) })} className="p-2 border rounded" />
                                <label className="sm:col-span-4 text-sm"><input type="checkbox" checked={!!pr.taken} onChange={e => updatePrescription(i, { taken: e.target.checked })} /> Taken</label>
                                <div className="text-right">
                                    <button type="button" onClick={() => { const copy = [...prescriptions]; copy.splice(i, 1); setPrescriptions(copy); }} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2">
                        <button type="button" onClick={addEmptyPrescription} className="px-3 py-1 bg-blue-600 text-white rounded">Add Prescription</button>
                    </div>
                </div>

                <div className="pt-2">
                    <button disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">Save Visit & Prescriptions</button>
                </div>
                {lastCreatedVisitId && (
                    <div className="pt-2">
                        <a href={`/visits/${lastCreatedVisitId}`} target="_blank" rel="noreferrer" className="inline-block px-3 py-2 bg-indigo-600 text-white rounded">Open Visit</a>
                    </div>
                )}
            </form>

            {lastCreatedVisit && (
                <div className="mt-6 bg-white rounded shadow p-4" ref={el => previewRef.current = el}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold">Prescription Preview — Visit #{lastCreatedVisit.id}</h3>
                        <div>
                            <button onClick={() => openPrintableWindow(previewRef.current)} className="px-3 py-1 bg-gray-800 text-white rounded">Print / Save PDF</button>
                        </div>
                    </div>

                    <div className="mt-3">
                        <div className="font-semibold">Patient</div>
                        <div>{(patients.find(p => String(p.id) === String(lastCreatedVisit.patientId))?.firstName) || lastCreatedVisit.patient?.firstName || ''} {(patients.find(p => String(p.id) === String(lastCreatedVisit.patientId))?.lastName) || lastCreatedVisit.patient?.lastName || ''}</div>
                        <div className="text-sm text-gray-600">OPD: {lastCreatedVisit.opdNo} · Date: {new Date(lastCreatedVisit.date).toLocaleString()}</div>
                    </div>

                    <div className="mt-4">
                        <div className="font-semibold">Prescriptions</div>
                        <ul className="mt-2">
                            {lastCreatedVisit.prescriptions?.map((pr: any) => (
                                <li key={pr.id} className="p-2 border-b">
                                    <div className="font-medium">{(treatments.find(t => String(t.id) === String(pr.treatmentId))?.name) || ''} {(products.find(p => String(p.id) === String(pr.productId))?.name) ? ` — ${products.find(p => String(p.id) === String(pr.productId))?.name}` : ''}</div>
                                    <div className="text-sm text-gray-700">Dosage: {pr.dosage || '-'} · Qty: {pr.quantity} · Administration: {pr.administration || '-'}</div>
                                </li>
                            ))}
                        </ul>
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
