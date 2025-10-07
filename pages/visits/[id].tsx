import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import CustomSelect from '../../components/CustomSelect'

export default function VisitDetail() {
    const router = useRouter()
    const { id } = router.query
    const [visit, setVisit] = useState<any>(null)
    const [treatments, setTreatments] = useState<any[]>([])
    const [formVisible, setFormVisible] = useState(false)
    const [form, setForm] = useState({ treatmentId: '', dosage: '', quantity: 1 })

    useEffect(() => {
        if (!id) return
        // fetch visit list and treatments
        fetch('/api/visits').then(r => r.json()).then(list => {
            const found = list.find((v: any) => String(v.id) === String(id))
            setVisit(found)
        })
        fetch('/api/treatments').then(r => r.json()).then(setTreatments)
    }, [id])

    async function addPrescription(e: any) {
        e.preventDefault()
        await fetch('/api/prescriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitId: id, treatmentId: form.treatmentId, dosage: form.dosage, quantity: Number(form.quantity) }) })
        // reload visit
        const list = await (await fetch('/api/visits')).json()
        setVisit(list.find((v: any) => String(v.id) === String(id)))
        setFormVisible(false)
    }

    if (!visit) return <div className="flex items-center justify-center h-64"><div className="text-muted">Loading...</div></div>

    return (
        <div>
            <div className="section-header">
                <div className="flex-1">
                    <h2 className="section-title">Prescription Details</h2>
                    <div className="text-sm text-muted mt-1">OPD {visit.opdNo} · {visit.patient?.firstName} {visit.patient?.lastName}</div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="btn btn-secondary">
                        <span className="mr-1">🖨️</span> Print / Save PDF
                    </button>
                    <button onClick={() => setFormVisible(v => !v)} className="btn btn-primary">
                        {formVisible ? '✕ Close' : '+ Add / Edit'}
                    </button>
                </div>
            </div>

            {/* Prescription formatted view */}
            <div className="card mb-6">
                <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="text-xs text-muted mb-2">Visit Date: {new Date(visit.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            <h3 className="text-xl font-semibold mb-2">{visit.patient?.firstName} {visit.patient?.lastName}</h3>
                            <div className="flex flex-wrap gap-3 text-sm">
                                <span className="inline-flex items-center">
                                    <span className="font-medium text-muted mr-1">Age:</span>
                                    <span>{visit.age ?? '-'}</span>
                                </span>
                                <span className="inline-flex items-center">
                                    <span className="font-medium text-muted mr-1">Gender:</span>
                                    <span>{visit.gender ?? '-'}</span>
                                </span>
                                <span className="inline-flex items-center">
                                    <span className="font-medium text-muted mr-1">Phone:</span>
                                    <span>{visit.phone ?? '-'}</span>
                                </span>
                            </div>
                        </div>
                        <div className="badge">{visit.opdNo}</div>
                    </div>
                </div>

                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Clinical Information</h4>
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <div className="text-sm">{visit.diagnoses || visit.specialNote || <span className="text-muted italic">No diagnosis notes recorded</span>}</div>
                    </div>
                </div>

                <div className="mt-6">
                    <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Prescribed Medications</h4>
                    {!visit.prescriptions || visit.prescriptions.length === 0 ? (
                        <div className="text-center py-8 text-muted">No medications prescribed yet</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs font-semibold text-muted uppercase tracking-wide border-b-2 border-gray-200 dark:border-gray-700">
                                        <th className="py-3 px-2">Medicine</th>
                                        <th className="py-3 px-2">Dosage</th>
                                        <th className="py-3 px-2">Administration</th>
                                        <th className="py-3 px-2 text-center">Quantity</th>
                                        <th className="py-3 px-2 text-center">Dispensed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {visit.prescriptions?.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                            <td className="py-3 px-2">
                                                <div className="font-medium">{p.treatment?.name}</div>
                                                {p.treatment?.code && <div className="text-xs text-muted mt-0.5">Code: {p.treatment.code}</div>}
                                                {p.product && <div className="text-xs text-brand mt-0.5">{p.product.name}</div>}
                                            </td>
                                            <td className="py-3 px-2 text-sm">{p.dosage || <span className="text-muted">-</span>}</td>
                                            <td className="py-3 px-2 text-sm">{p.administration || <span className="text-muted">-</span>}</td>
                                            <td className="py-3 px-2 text-center">
                                                <span className="inline-block bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-medium">{p.quantity}</span>
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                {p.dispensed ? (
                                                    <span className="inline-block bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded text-xs font-medium">✓ Yes</span>
                                                ) : (
                                                    <span className="inline-block bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-1 rounded text-xs font-medium">No</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-muted">
                        <div className="mb-2">Doctor's Signature:</div>
                        <div className="border-b border-gray-300 dark:border-gray-600 w-64 pb-2"></div>
                    </div>
                </div>
            </div>

            {/* Add prescription form toggled */}
            {formVisible && (
                <form onSubmit={addPrescription} className="card">
                    <h3 className="text-lg font-semibold mb-4">Add Prescription Item</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Treatment *</label>
                            <CustomSelect
                                required
                                value={form.treatmentId}
                                onChange={(val) => setForm({ ...form, treatmentId: val })}
                                options={[
                                    { value: '', label: 'Select treatment' },
                                    ...treatments.map(t => ({ value: String(t.id), label: `${t.name} (${t.code})` }))
                                ]}
                                placeholder="Select treatment"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Dosage</label>
                            <input placeholder="5 drops, 3 times daily" value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Quantity</label>
                            <input type="number" placeholder="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="p-2 border rounded w-full" />
                        </div>
                    </div>
                    <div className="mt-4 text-right">
                        <button type="button" onClick={() => setFormVisible(false)} className="btn btn-secondary mr-2">Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Prescription</button>
                    </div>
                </form>
            )}
        </div>
    )
}
