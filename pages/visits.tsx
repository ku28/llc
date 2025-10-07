import { useState, useEffect } from 'react'

export default function VisitsPage() {
    const [visits, setVisits] = useState<any[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [form, setForm] = useState({ patientId: '', opdNo: '', diagnoses: '' })
    const [user, setUser] = useState<any>(null)
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    useEffect(() => { fetch('/api/visits').then(r => r.json()).then(setVisits); fetch('/api/patients').then(r => r.json()).then(setPatients) }, [])

    async function create(e: any) {
        e.preventDefault()
        await fetch('/api/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        setVisits(await (await fetch('/api/visits')).json())
    }

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Visits</h2>
            <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <select value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} className="p-2 border rounded">
                    <option value="">Select patient</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
                <input placeholder="OPD No" value={form.opdNo} onChange={e => setForm({ ...form, opdNo: e.target.value })} className="p-2 border rounded" />
                <input placeholder="Diagnoses" value={form.diagnoses} onChange={e => setForm({ ...form, diagnoses: e.target.value })} className="p-2 border rounded" />
                <div className="sm:col-span-3 text-right"><button disabled={!user} className={`px-4 py-2 rounded ${user ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>Add Visit</button></div>
            </form>
            {!user && <div className="text-sm text-gray-600">Please <a className="text-blue-600 underline" href="/login">login</a> to add visits.</div>}

            <div className="bg-white rounded shadow p-4">
                <ul>
                    {visits.map(v => (
                        <li key={v.id} className="p-2 border-b flex items-start justify-between">
                            <div>
                                <div className="font-medium">OPD: {v.opdNo} — {v.patient?.firstName} {v.patient?.lastName}</div>
                                <div className="text-sm text-gray-500">{new Date(v.date).toLocaleString()} · {v.diagnoses}</div>
                            </div>
                            <div className="text-right">
                                <a href={`/visits/${v.id}`} className="px-3 py-1 bg-indigo-600 text-white rounded">View</a>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
