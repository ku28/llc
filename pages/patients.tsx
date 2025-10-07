import { useState, useEffect } from 'react'
import DateInput from '../components/DateInput'

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', dob: '', opdNo: '', date: '', age: '', address: '', gender: '', nextVisitDate: '', nextVisitTime: '', occupation: '', pendingPaymentCents: '', height: '', weight: '' })

    useEffect(() => { fetch('/api/patients').then(r => r.json()).then(setPatients) }, [])

    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    return (
        <div>
            <div className="section-header">
                <h2 className="section-title">Patient Management</h2>
                <span className="badge">{patients.length} patients</span>
            </div>

            <div className="card mb-6">
                <h3 className="text-lg font-semibold mb-4">Register New Patient</h3>
                
                {!user && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                        You must <a className="text-brand underline font-medium" href="/login">login</a> to add patients.
                    </div>
                )}

                {user && (
                    <form onSubmit={async (e) => {
                        e.preventDefault()
                        try {
                            // convert numeric strings to numbers where appropriate
                            const payload: any = { ...form }
                            if (payload.age) payload.age = Number(payload.age)
                            if (payload.pendingPaymentCents) payload.pendingPaymentCents = Number(payload.pendingPaymentCents)
                            if (payload.height) payload.height = Number(payload.height)
                            if (payload.weight) payload.weight = Number(payload.weight)
                            
                            // Combine date and time for nextVisit
                            if (form.nextVisitDate && form.nextVisitTime) {
                                payload.nextVisit = `${form.nextVisitDate}T${form.nextVisitTime}`
                            }
                            
                            await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                            const list = await (await fetch('/api/patients')).json()
                            setPatients(list)
                            setForm({ firstName: '', lastName: '', phone: '', email: '', dob: '', opdNo: '', date: '', age: '', address: '', gender: '', nextVisitDate: '', nextVisitTime: '', occupation: '', pendingPaymentCents: '', height: '', weight: '' })
                        } catch (err) { console.error(err); alert('Failed to create patient') }
                    }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">First Name *</label>
                            <input required placeholder="John" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Last Name *</label>
                            <input required placeholder="Doe" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Phone</label>
                            <input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email</label>
                            <input type="email" placeholder="john.doe@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Date of Birth</label>
                            <DateInput type="date" placeholder="Select date of birth" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">OPD Number</label>
                            <input placeholder="OPD-001" value={(form as any).opdNo || ''} onChange={e => setForm({ ...form, opdNo: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Age</label>
                            <input placeholder="35" type="number" value={(form as any).age || ''} onChange={e => setForm({ ...form, age: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Address</label>
                            <input placeholder="123 Main St, City" value={(form as any).address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Gender</label>
                            <input placeholder="Male / Female / Other" value={(form as any).gender || ''} onChange={e => setForm({ ...form, gender: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Next Visit Date</label>
                            <DateInput type="date" placeholder="Select visit date" value={form.nextVisitDate} onChange={e => setForm({ ...form, nextVisitDate: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Next Visit Time</label>
                            <input type="time" placeholder="Select time" value={form.nextVisitTime} onChange={e => setForm({ ...form, nextVisitTime: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Occupation</label>
                            <input placeholder="Engineer" value={(form as any).occupation || ''} onChange={e => setForm({ ...form, occupation: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Pending Payment (₹)</label>
                            <input placeholder="500.00" type="number" step="0.01" value={(form as any).pendingPaymentCents || ''} onChange={e => setForm({ ...form, pendingPaymentCents: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Height (cm)</label>
                            <input placeholder="175" type="number" value={(form as any).height || ''} onChange={e => setForm({ ...form, height: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Weight (kg)</label>
                            <input placeholder="70" type="number" value={(form as any).weight || ''} onChange={e => setForm({ ...form, weight: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3 text-right pt-2">
                            <button className="btn btn-primary">Add Patient</button>
                        </div>
                    </form>
                )}
            </div>

            <div className="card">
                <h3 className="text-lg font-semibold mb-4">Patient Records</h3>
                {patients.length === 0 ? (
                    <div className="text-center py-8 text-muted">No patients registered yet</div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {patients.map(p => (
                            <li key={p.id} className="py-3">
                                <PatientRow p={p} onUpdated={async () => { setPatients(await (await fetch('/api/patients')).json()) }} onDeleted={async () => { setPatients(await (await fetch('/api/patients')).json()) }} />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

function PatientRow({ p, onUpdated, onDeleted }: any) {
    const [editing, setEditing] = useState(false)
    
    // Split nextVisit into date and time
    const splitNextVisit = () => {
        if (p.nextVisit) {
            const dt = new Date(p.nextVisit).toISOString()
            return {
                date: dt.slice(0, 10),
                time: dt.slice(11, 16)
            }
        }
        return { date: '', time: '' }
    }
    
    const nextVisitSplit = splitNextVisit()
    
    const [form, setForm] = useState({ 
        firstName: p.firstName || '', 
        lastName: p.lastName || '', 
        phone: p.phone || '', 
        email: p.email || '', 
        dob: p.dob ? new Date(p.dob).toISOString().slice(0, 10) : '', 
        opdNo: p.opdNo || '', 
        date: p.date ? new Date(p.date).toISOString().slice(0, 10) : '', 
        age: p.age ? String(p.age) : '', 
        address: p.address || '', 
        gender: p.gender || '', 
        nextVisit: p.nextVisit ? new Date(p.nextVisit).toISOString().slice(0, 16) : '',
        nextVisitDate: nextVisitSplit.date,
        nextVisitTime: nextVisitSplit.time,
        occupation: p.occupation || '', 
        pendingPaymentCents: p.pendingPaymentCents ? String(p.pendingPaymentCents) : '', 
        height: p.height ? String(p.height) : '', 
        weight: p.weight ? String(p.weight) : '' 
    })

    async function save() {
        try {
            const payload: any = { id: p.id, ...form }
            if (payload.age) payload.age = Number(payload.age)
            if (payload.pendingPaymentCents) payload.pendingPaymentCents = Number(payload.pendingPaymentCents)
            if (payload.height) payload.height = Number(payload.height)
            if (payload.weight) payload.weight = Number(payload.weight)
            
            // Combine date and time for nextVisit
            if (form.nextVisitDate && form.nextVisitTime) {
                payload.nextVisit = `${form.nextVisitDate}T${form.nextVisitTime}`
            } else if (form.nextVisit) {
                payload.nextVisit = form.nextVisit
            }
            
            await fetch('/api/patients', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            setEditing(false)
            onUpdated()
        } catch (err) { console.error(err); alert('Update failed') }
    }

    async function remove() {
        if (!confirm('Delete this patient?')) return
        try {
            const resp = await fetch('/api/patients', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) })
            if (!resp.ok) {
                const body = await resp.json().catch(() => ({ error: resp.statusText }))
                alert('Delete failed: ' + (body?.error || resp.statusText))
                return
            }
            onDeleted()
        } catch (err) { console.error(err); alert('Delete failed') }
    }

    if (editing) return (
        <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">First Name</label>
                    <input placeholder="John" className="p-2 border rounded w-full" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Last Name</label>
                    <input placeholder="Doe" className="p-2 border rounded w-full" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Phone</label>
                    <input placeholder="+91 98765 43210" className="p-2 border rounded w-full" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Email</label>
                    <input placeholder="john.doe@example.com" type="email" className="p-2 border rounded w-full" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">OPD Number</label>
                    <input placeholder="OPD-001" className="p-2 border rounded w-full" value={(form as any).opdNo || ''} onChange={e => setForm({ ...form, opdNo: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Date of Birth</label>
                    <DateInput className="p-2 border rounded w-full" type="date" placeholder="Select date of birth" value={(form as any).dob || ''} onChange={e => setForm({ ...form, dob: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Age</label>
                    <input placeholder="35" className="p-2 border rounded w-full" type="number" value={(form as any).age || ''} onChange={e => setForm({ ...form, age: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Address</label>
                    <input placeholder="123 Main St, City" className="p-2 border rounded w-full" value={(form as any).address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Gender</label>
                    <input placeholder="Male / Female / Other" className="p-2 border rounded w-full" value={(form as any).gender || ''} onChange={e => setForm({ ...form, gender: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Next Visit Date</label>
                    <DateInput className="p-2 border rounded w-full" type="date" placeholder="Select visit date" value={(form as any).nextVisitDate || ''} onChange={e => setForm({ ...form, nextVisitDate: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Next Visit Time</label>
                    <input type="time" placeholder="Select time" className="p-2 border rounded w-full" value={(form as any).nextVisitTime || ''} onChange={e => setForm({ ...form, nextVisitTime: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Occupation</label>
                    <input placeholder="Engineer" className="p-2 border rounded w-full" value={(form as any).occupation || ''} onChange={e => setForm({ ...form, occupation: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Pending Payment (₹)</label>
                    <input placeholder="500.00" className="p-2 border rounded w-full" type="number" step="0.01" value={(form as any).pendingPaymentCents || ''} onChange={e => setForm({ ...form, pendingPaymentCents: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Height (cm)</label>
                    <input placeholder="175" className="p-2 border rounded w-full" type="number" value={(form as any).height || ''} onChange={e => setForm({ ...form, height: e.target.value })} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-muted">Weight (kg)</label>
                    <input placeholder="70" className="p-2 border rounded w-full" type="number" value={(form as any).weight || ''} onChange={e => setForm({ ...form, weight: e.target.value })} />
                </div>
            </div>
            <div className="flex gap-2 justify-end">
                <button onClick={save} className="btn btn-primary">Save Changes</button>
                <button onClick={() => setEditing(false)} className="btn btn-secondary">Cancel</button>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg">{p.firstName} {p.lastName}</h4>
                    {p.opdNo && <span className="badge">OPD: {p.opdNo}</span>}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted">
                    <div><span className="font-medium">DOB:</span> {p.dob ? new Date(p.dob).toLocaleDateString() : '-'}</div>
                    <div><span className="font-medium">Age:</span> {p.age ?? '-'}</div>
                    <div><span className="font-medium">Gender:</span> {p.gender ?? '-'}</div>
                    <div><span className="font-medium">Phone:</span> {p.phone ?? '-'}</div>
                    <div><span className="font-medium">Email:</span> {p.email ?? '-'}</div>
                    <div><span className="font-medium">Occupation:</span> {p.occupation ?? '-'}</div>
                    <div className="sm:col-span-2"><span className="font-medium">Address:</span> {p.address ?? '-'}</div>
                    <div><span className="font-medium">Height:</span> {p.height ? `${p.height} cm` : '-'}</div>
                    <div><span className="font-medium">Weight:</span> {p.weight ? `${p.weight} kg` : '-'}</div>
                    <div>
                        <span className="font-medium">Pending:</span> 
                        <span className={p.pendingPaymentCents && p.pendingPaymentCents > 0 ? 'text-red-600 dark:text-red-400 font-medium ml-1' : 'ml-1'}>
                            ₹{p.pendingPaymentCents ? (p.pendingPaymentCents / 100).toFixed(2) : '0.00'}
                        </span>
                    </div>
                    {p.nextVisit && (
                        <div>
                            <span className="font-medium">Next visit:</span> 
                            <a href={`/patients/${p.id}`} className="text-brand hover:underline ml-1 font-medium">
                                {new Date(p.nextVisit).toLocaleDateString()}
                            </a>
                        </div>
                    )}
                </div>

                {p.visits && p.visits[0] ? (
                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                        <span className="font-medium">Last visit:</span> {new Date(p.visits[0].date).toLocaleDateString()} · 
                        <span className="font-medium ml-2">Diagnoses:</span> {p.visits[0].diagnoses || 'None'}
                    </div>
                ) : null}
            </div>

            <div className="flex sm:flex-col gap-2 self-start">
                <button onClick={() => setEditing(true)} className="btn btn-secondary flex-1 sm:flex-none">Edit</button>
                <button onClick={remove} className="btn btn-danger flex-1 sm:flex-none">Delete</button>
            </div>
        </div>
    )
}
