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
            <h2 className="text-xl font-bold mb-4">Treatments</h2>
            <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <input required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="p-2 border rounded" />
                <input placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="p-2 border rounded" />
                <input placeholder="Dosage" value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })} className="p-2 border rounded" />
                <input placeholder="Administration" value={form.administration} onChange={e => setForm({ ...form, administration: e.target.value })} className="p-2 border rounded" />
                <div className="sm:col-span-2 text-right"><button disabled={!user} className={`px-4 py-2 rounded ${user ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>Add</button></div>
            </form>
            {!user && <div className="text-sm text-gray-600">Please <a className="text-blue-600 underline" href="/login">login</a> to add treatments.</div>}

            <div className="bg-white rounded shadow p-4">
                {items.length === 0 ? <div>No treatments</div> : (
                    <ul>
                        {items.map(t => (
                            <li key={t.id} className="p-2 border-b flex justify-between"><div><b>{t.name}</b><div className="text-sm text-gray-500">{t.code} · {t.dosage}</div></div></li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
