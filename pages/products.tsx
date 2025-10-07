import { useState, useEffect } from 'react'

export default function ProductsPage(){
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', sku: '', priceCents: 0, quantity: 0 })

  useEffect(()=>{ fetch('/api/products').then(r=>r.json()).then(setItems) }, [])
  const [user, setUser] = useState<any>(null)
  useEffect(()=>{ fetch('/api/auth/me').then(r=>r.json()).then(d=>setUser(d.user)) }, [])

  const [batchForm, setBatchForm] = useState({ productId: '', sku: '', quantity: 0, purchasePriceCents: 0, salePriceCents: 0, expiry: '' })

  async function create(e:any){
    e.preventDefault()
    await fetch('/api/products', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
    setItems(await (await fetch('/api/products')).json())
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Inventory</h2>
      <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <input required placeholder="Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="p-2 border rounded" />
        <input placeholder="SKU" value={form.sku} onChange={e=>setForm({...form, sku: e.target.value})} className="p-2 border rounded" />
        <input type="number" placeholder="Price (cents)" value={form.priceCents} onChange={e=>setForm({...form, priceCents: Number(e.target.value)})} className="p-2 border rounded" />
        <input type="number" placeholder="Quantity" value={form.quantity} onChange={e=>setForm({...form, quantity: Number(e.target.value)})} className="p-2 border rounded" />
        <div className="sm:col-span-3 text-right">
          <button disabled={!user} className={`px-4 py-2 rounded ${user ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>Add Product</button>
        </div>
      </form>
      {!user && <div className="text-sm text-gray-600 mb-4">Please <a className="text-blue-600 underline" href="/login">login</a> to add products or batches.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Products</h3>
          <ul>
            {items.map(p=> (
              <li key={p.id} className="p-2 border-b flex justify-between"><div><b>{p.name}</b><div className="text-sm text-gray-500">SKU: {p.sku} · Qty: {p.quantity}</div></div></li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Create Batch / Purchase</h3>
          <form onSubmit={async (e)=>{
            e.preventDefault()
            if(!user) return alert('Please login to create batches')
            await fetch('/api/batches', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(batchForm) })
            setBatchForm({ productId: '', sku: '', quantity: 0, purchasePriceCents: 0, salePriceCents: 0, expiry: '' })
          }} className="grid gap-2">
            <select required value={batchForm.productId} onChange={e=>setBatchForm({...batchForm, productId: e.target.value})} className="p-2 border rounded">
              <option value="">Select product</option>
              {items.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Batch SKU" value={batchForm.sku} onChange={e=>setBatchForm({...batchForm, sku: e.target.value})} className="p-2 border rounded" />
            <input type="number" placeholder="Quantity" value={batchForm.quantity} onChange={e=>setBatchForm({...batchForm, quantity: Number(e.target.value)})} className="p-2 border rounded" />
            <input type="number" placeholder="Purchase price (cents)" value={batchForm.purchasePriceCents} onChange={e=>setBatchForm({...batchForm, purchasePriceCents: Number(e.target.value)})} className="p-2 border rounded" />
            <input type="number" placeholder="Sale price (cents)" value={batchForm.salePriceCents} onChange={e=>setBatchForm({...batchForm, salePriceCents: Number(e.target.value)})} className="p-2 border rounded" />
            <input type="date" placeholder="Expiry" value={batchForm.expiry} onChange={e=>setBatchForm({...batchForm, expiry: e.target.value})} className="p-2 border rounded" />
            <div className="text-right"><button disabled={!user} className={`px-4 py-2 rounded ${user ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>Create Batch</button></div>
          </form>
        </div>
      </div>
    </div>
  )
}
