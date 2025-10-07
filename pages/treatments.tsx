import { useState, useEffect } from 'react'

export default function TreatmentsPage() {
    const [items, setItems] = useState<any[]>([])
    const [form, setForm] = useState({ name: '', code: '', dosage: '', administration: '' })
    const [user, setUser] = useState<any>(null)
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    useEffect(() => { fetch('/api/treatments').then(r => r.json()).then(setItems) }, [])

    async function create(e: any) {
        e.preventDefault()
        const res = await fetch('/api/treatments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        if (res.ok) {
            // refresh full list after successful create
            const list = await (await fetch('/api/treatments')).json()
            setItems(list)
            setForm({ name: '', code: '', dosage: '', administration: '' })
        } else {
            const err = await res.text()
            console.error('Create treatment failed:', err)
            alert('Failed to create treatment')
        }
    }

    return (
        <div>
            <div className="section-header">
                <h2 className="section-title">Treatment Management</h2>
                <span className="badge">{items.length} treatments</span>
            </div>

            <div className="card mb-6">
                <h3 className="text-lg font-semibold mb-4">Add New Treatment</h3>
                
                {!user && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                        Please <a className="text-brand underline font-medium" href="/login">login</a> to add treatments.
                    </div>
                )}

                <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Treatment Name *</label>
                        <input required placeholder="Homeopathic Remedy X" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="p-2 border rounded w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Treatment Code</label>
                        <input placeholder="HRX-001" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="p-2 border rounded w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Dosage</label>
                        <input placeholder="5 drops, 3 times daily" value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })} className="p-2 border rounded w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Administration Method</label>
                        <input placeholder="Oral, Topical" value={form.administration} onChange={e => setForm({ ...form, administration: e.target.value })} className="p-2 border rounded w-full" />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4 text-right pt-2">
                        <button disabled={!user} className={`btn ${user ? 'btn-primary' : 'btn-secondary'}`}>
                            {user ? 'Add Treatment' : 'Login to add treatments'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                <h3 className="text-lg font-semibold mb-4">Available Treatments</h3>
                {items.length === 0 ? (
                    <div className="text-center py-8 text-muted">No treatments available yet</div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map(t => (
                            <li key={t.id} className="list-item">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="font-semibold text-base">{t.name}</div>
                                        <div className="text-sm text-muted mt-1 space-y-0.5">
                                            {t.code && <div><span className="font-medium">Code:</span> {t.code}</div>}
                                            {t.dosage && <div><span className="font-medium">Dosage:</span> {t.dosage}</div>}
                                            {t.administration && <div><span className="font-medium">Administration:</span> {t.administration}</div>}
                                            {t.procedure && <div><span className="font-medium">Procedure:</span> {t.procedure}</div>}
                                            {t.dilutors && <div><span className="font-medium">Dilutors:</span> {t.dilutors}</div>}
                                            {t.notes && <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm"><span className="font-medium">Notes:</span> {t.notes}</div>}
                                        </div>
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
