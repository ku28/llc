import { useState, useEffect } from 'react'
import CustomSelect from '../components/CustomSelect'
import DateInput from '../components/DateInput'

export default function ProductsPage() {
    const [items, setItems] = useState<any[]>([])
    const [form, setForm] = useState({ name: '', sku: '', priceCents: '', quantity: '' })

    useEffect(() => { fetch('/api/products').then(r => r.json()).then(setItems) }, [])
    const [user, setUser] = useState<any>(null)
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    const [batchForm, setBatchForm] = useState({ productId: '', sku: '', quantity: '', purchasePriceCents: '', salePriceCents: '', expiry: '' })

    async function create(e: any) {
        e.preventDefault()
        const payload = {
            name: form.name,
            sku: form.sku,
            priceCents: Number(form.priceCents) || 0,
            quantity: Number(form.quantity) || 0
        }
        await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        setForm({ name: '', sku: '', priceCents: '', quantity: '' })
        setItems(await (await fetch('/api/products')).json())
    }

    return (
        <div>
            <div className="section-header">
                <h2 className="section-title">Inventory Management</h2>
            </div>

            <div className="card mb-6">
                <h3 className="text-lg font-semibold mb-4">Add New Product</h3>
                <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Product Name *</label>
                        <input required placeholder="Aspirin 500mg" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="p-2 border rounded w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">SKU</label>
                        <input placeholder="MED-ASP-500" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="p-2 border rounded w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Price (₹)</label>
                        <input type="number" step="0.01" placeholder="150.00" value={form.priceCents} onChange={e => setForm({ ...form, priceCents: e.target.value })} className="p-2 border rounded w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Quantity</label>
                        <input type="number" placeholder="100" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="p-2 border rounded w-full" />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4 text-right">
                        <button disabled={!user} className={`btn ${user ? 'btn-primary' : 'btn-secondary'}`}>
                            {user ? 'Add Product' : 'Login to add products'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                        <span>Products List</span>
                        <span className="badge">{items.length} items</span>
                    </h3>
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-muted">No products yet</div>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                            {items.map(p => (
                                <li key={p.id} className="list-item">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="font-semibold text-base">{p.name}</div>
                                            <div className="text-sm text-muted mt-1">
                                                SKU: {p.sku} · Stock: <span className={p.quantity < (p.reorderLevel || 10) ? 'text-red-500 font-medium' : 'text-brand font-medium'}>{p.quantity}</span>
                                            </div>
                                            <div className="text-sm text-muted">
                                                Price: ₹{(p.priceCents / 100).toFixed(2)}
                                            </div>
                                        </div>
                                        {p.quantity < (p.reorderLevel || 10) && (
                                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-full font-medium">Low Stock</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Create Batch / Purchase</h3>
                    <form onSubmit={async (e) => {
                        e.preventDefault()
                        if (!user) return alert('Please login to create batches')
                        const payload = {
                            productId: batchForm.productId,
                            sku: batchForm.sku,
                            quantity: Number(batchForm.quantity) || 0,
                            purchasePriceCents: Number(batchForm.purchasePriceCents) || 0,
                            salePriceCents: Number(batchForm.salePriceCents) || 0,
                            expiry: batchForm.expiry
                        }
                        await fetch('/api/batches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                        setBatchForm({ productId: '', sku: '', quantity: '', purchasePriceCents: '', salePriceCents: '', expiry: '' })
                        setItems(await (await fetch('/api/products')).json())
                    }} className="grid gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Product *</label>
                            <CustomSelect
                                required
                                value={batchForm.productId}
                                onChange={(val) => setBatchForm({ ...batchForm, productId: val })}
                                options={[
                                    { value: '', label: 'Select product' },
                                    ...items.map(p => ({ value: String(p.id), label: p.name }))
                                ]}
                                placeholder="Select product"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Batch SKU</label>
                            <input placeholder="BATCH-2024-001" value={batchForm.sku} onChange={e => setBatchForm({ ...batchForm, sku: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Quantity</label>
                            <input type="number" placeholder="50" value={batchForm.quantity} onChange={e => setBatchForm({ ...batchForm, quantity: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Purchase Price (₹)</label>
                            <input type="number" step="0.01" placeholder="100.00" value={batchForm.purchasePriceCents} onChange={e => setBatchForm({ ...batchForm, purchasePriceCents: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Sale Price (₹)</label>
                            <input type="number" step="0.01" placeholder="150.00" value={batchForm.salePriceCents} onChange={e => setBatchForm({ ...batchForm, salePriceCents: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Expiry Date</label>
                            <DateInput type="date" placeholder="Select expiry date" value={batchForm.expiry} onChange={e => setBatchForm({ ...batchForm, expiry: e.target.value })} className="p-2 border rounded w-full" />
                        </div>
                        <div className="text-right pt-2">
                            <button disabled={!user} className={`btn ${user ? 'btn-primary' : 'btn-secondary'}`}>
                                {user ? 'Create Batch' : 'Login required'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
