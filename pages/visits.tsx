import { useState, useEffect } from 'react'
import Link from 'next/link'
import CustomSelect from '../components/CustomSelect'

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
        setForm({ patientId: '', opdNo: '', diagnoses: '' })
    }

    return (
        <div>
            <div className="section-header">
                <h2 className="section-title">Patient Visits</h2>
                <div className="flex items-center gap-3">
                    <span className="badge">{visits.length} total visits</span>
                    <Link href="/prescriptions" className="btn btn-primary text-sm">Create Visit with Prescriptions</Link>
                </div>
            </div>

            <div className="card mb-6">
                <h3 className="text-lg font-semibold mb-4">Record New Visit</h3>
                
                {!user && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                        Please <a className="text-brand underline font-medium" href="/login">login</a> to record visits.
                    </div>
                )}

                <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Patient</label>
                        <CustomSelect
                            required
                            value={form.patientId}
                            onChange={(val) => setForm({ ...form, patientId: val })}
                            options={[
                                { value: '', label: 'Select patient' },
                                ...patients.map(p => ({
                                    value: String(p.id),
                                    label: `${p.firstName} ${p.lastName}${p.opdNo ? ' · OPD: ' + p.opdNo : ''}`
                                }))
                            ]}
                            placeholder="Select patient"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">OPD Number</label>
                        <input placeholder="OPD-001" value={form.opdNo} onChange={e => setForm({ ...form, opdNo: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Diagnosis</label>
                        <input placeholder="Fever, Common Cold" value={form.diagnoses} onChange={e => setForm({ ...form, diagnoses: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div className="sm:col-span-3 text-right pt-2">
                        <button disabled={!user} className={`btn ${user ? 'btn-primary' : 'btn-secondary'}`}>
                            {user ? 'Record Visit' : 'Login to record visits'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                <h3 className="text-lg font-semibold mb-4">Visit History</h3>
                {visits.length === 0 ? (
                    <div className="text-center py-8 text-muted">No visits recorded yet</div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {visits.map(v => (
                            <li key={v.id} className="list-item">
                                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-semibold text-base">
                                                {v.patient?.firstName} {v.patient?.lastName}
                                            </h4>
                                            <span className="badge">OPD: {v.opdNo}</span>
                                        </div>
                                        <div className="text-sm text-muted space-y-1">
                                            <div><span className="font-medium">Date:</span> {new Date(v.date).toLocaleString()}</div>
                                            {v.diagnoses && <div><span className="font-medium">Diagnosis:</span> {v.diagnoses}</div>}
                                            {v.prescriptions && v.prescriptions.length > 0 && (
                                                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                                    <span className="font-medium">Prescriptions:</span> {v.prescriptions.length} item(s)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 self-start">
                                        <Link href={`/visits/${v.id}`} className="btn btn-primary text-sm">
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
