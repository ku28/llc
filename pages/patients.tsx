import { useState, useEffect } from 'react'

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', dob: '', opdNo: '', date: '', age: '', address: '', gender: '', nextVisit: '', occupation: '', pendingPaymentCents: '', height: '', weight: '' })

    useEffect(() => { fetch('/api/patients').then(r => r.json()).then(setPatients) }, [])

    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Patients</h2>
            <div className="bg-white rounded shadow p-4">
                {!user && <div className="mb-2 text-sm text-gray-600">You must <a className="text-blue-600 underline" href="/login">login</a> to add patients.</div>}

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
                            await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                            const list = await (await fetch('/api/patients')).json()
                            setPatients(list)
                            setForm({ firstName: '', lastName: '', phone: '', email: '', dob: '', opdNo: '', date: '', age: '', address: '', gender: '', nextVisit: '', occupation: '', pendingPaymentCents: '', height: '', weight: '' })
                        } catch (err) { console.error(err); alert('Failed to create patient') }
                    }} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                        <input required placeholder="First name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="p-2 border rounded" />
                        <input required placeholder="Last name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="p-2 border rounded" />
                        <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="p-2 border rounded" />
                        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="p-2 border rounded" />
                        <input type="date" placeholder="DOB" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="p-2 border rounded" />
                        <input placeholder="OPD No" value={(form as any).opdNo || ''} onChange={e => setForm({ ...form, opdNo: e.target.value })} className="p-2 border rounded" />
                        <input placeholder="Age" type="number" value={(form as any).age || ''} onChange={e => setForm({ ...form, age: e.target.value })} className="p-2 border rounded" />
                        <input placeholder="Address" value={(form as any).address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="p-2 border rounded" />
                        <input placeholder="Gender" value={(form as any).gender || ''} onChange={e => setForm({ ...form, gender: e.target.value })} className="p-2 border rounded" />
                        <input type="datetime-local" placeholder="Next visit" value={(form as any).nextVisit || ''} onChange={e => setForm({ ...form, nextVisit: e.target.value })} className="p-2 border rounded" />
                        <input placeholder="Occupation" value={(form as any).occupation || ''} onChange={e => setForm({ ...form, occupation: e.target.value })} className="p-2 border rounded" />
                        <input placeholder="Pending payment (cents)" type="number" value={(form as any).pendingPaymentCents || ''} onChange={e => setForm({ ...form, pendingPaymentCents: e.target.value })} className="p-2 border rounded" />
                        <input placeholder="Height" type="number" value={(form as any).height || ''} onChange={e => setForm({ ...form, height: e.target.value })} className="p-2 border rounded" />
                        <input placeholder="Weight" type="number" value={(form as any).weight || ''} onChange={e => setForm({ ...form, weight: e.target.value })} className="p-2 border rounded" />
                        <div className="sm:col-span-3 text-right"><button className="bg-blue-600 text-white px-4 py-2 rounded">Add Patient</button></div>
                    </form>
                )}

                <ul>
                    {patients.map(p => (
                        <li key={p.id} className="p-2 border-b">
                            <PatientRow p={p} onUpdated={async () => { setPatients(await (await fetch('/api/patients')).json()) }} onDeleted={async () => { setPatients(await (await fetch('/api/patients')).json()) }} />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

function PatientRow({ p, onUpdated, onDeleted }: any) {
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({ firstName: p.firstName || '', lastName: p.lastName || '', phone: p.phone || '', email: p.email || '', dob: p.dob ? new Date(p.dob).toISOString().slice(0, 10) : '', opdNo: p.opdNo || '', date: p.date ? new Date(p.date).toISOString().slice(0, 10) : '', age: p.age ? String(p.age) : '', address: p.address || '', gender: p.gender || '', nextVisit: p.nextVisit ? new Date(p.nextVisit).toISOString().slice(0, 16) : '', occupation: p.occupation || '', pendingPaymentCents: p.pendingPaymentCents ? String(p.pendingPaymentCents) : '', height: p.height ? String(p.height) : '', weight: p.weight ? String(p.weight) : '' })

    async function save() {
        try {
            const payload: any = { id: p.id, ...form }
            if (payload.age) payload.age = Number(payload.age)
            if (payload.pendingPaymentCents) payload.pendingPaymentCents = Number(payload.pendingPaymentCents)
            if (payload.height) payload.height = Number(payload.height)
            if (payload.weight) payload.weight = Number(payload.weight)
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
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <input placeholder="First name" className="p-2 border rounded" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            <input placeholder="Last name" className="p-2 border rounded" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
            <input placeholder="Phone" className="p-2 border rounded" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Email" className="p-2 border rounded" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder="OPD No" className="p-2 border rounded" value={(form as any).opdNo || ''} onChange={e => setForm({ ...form, opdNo: e.target.value })} />
            <input placeholder="DOB" className="p-2 border rounded" type="date" value={(form as any).dob || ''} onChange={e => setForm({ ...form, dob: e.target.value })} />
            <input placeholder="Age" className="p-2 border rounded" type="number" value={(form as any).age || ''} onChange={e => setForm({ ...form, age: e.target.value })} />
            <input placeholder="Address" className="p-2 border rounded" value={(form as any).address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
            <input placeholder="Gender" className="p-2 border rounded" value={(form as any).gender || ''} onChange={e => setForm({ ...form, gender: e.target.value })} />
            <input placeholder="Next visit" className="p-2 border rounded" type="datetime-local" value={(form as any).nextVisit || ''} onChange={e => setForm({ ...form, nextVisit: e.target.value })} />
            <input placeholder="Occupation" className="p-2 border rounded" value={(form as any).occupation || ''} onChange={e => setForm({ ...form, occupation: e.target.value })} />
            <input placeholder="Pending payment (cents)" className="p-2 border rounded" type="number" value={(form as any).pendingPaymentCents || ''} onChange={e => setForm({ ...form, pendingPaymentCents: e.target.value })} />
            <input placeholder="Height" className="p-2 border rounded" type="number" value={(form as any).height || ''} onChange={e => setForm({ ...form, height: e.target.value })} />
            <input placeholder="Weight" className="p-2 border rounded" type="number" value={(form as any).weight || ''} onChange={e => setForm({ ...form, weight: e.target.value })} />
            <div className="flex gap-2">
                <button onClick={save} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
            </div>
        </div>
    )

    return (
        <div className="flex justify-between items-center">
            <div>
                <div className="font-medium">{p.firstName} {p.lastName} {p.opdNo ? <span className="text-sm text-gray-500">· OPD: {p.opdNo}</span> : null}</div>
                <div className="text-sm text-gray-500">DOB: {p.dob ? new Date(p.dob).toLocaleDateString() : '-'} · Age: {p.age ?? '-'} · Gender: {p.gender ?? '-'}</div>
                <div className="text-sm text-gray-500">Address: {p.address ?? '-'} · Occupation: {p.occupation ?? '-'}</div>
                <div className="text-sm text-gray-500">Phone: {p.phone ?? '-'} · Pending: {p.pendingPaymentCents ? (p.pendingPaymentCents / 100).toFixed(2) : '0.00'}</div>
                <div className="text-sm text-gray-500">Height: {p.height ?? '-'} · Weight: {p.weight ?? '-'}</div>
                {p.visits && p.visits[0] ? (
                    <div className="mt-1 text-sm text-gray-700">Last visit: {new Date(p.visits[0].date).toLocaleString()} · Diagnoses: {p.visits[0].diagnoses}</div>
                ) : null}
                <div className="text-sm text-gray-500">Next visit: {p.nextVisit ? <a href={`/patients/${p.id}`} className="text-blue-600 underline">{new Date(p.nextVisit).toLocaleDateString()}</a> : '-'}</div>
            </div>
            <div className="space-x-2">
                <button onClick={() => setEditing(true)} className="px-2 py-1 bg-yellow-400 rounded">Edit</button>
                <button onClick={remove} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
            </div>
        </div>
    )
}
