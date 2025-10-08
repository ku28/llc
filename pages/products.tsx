import { useState, useEffect } from 'react'
import CustomSelect from '../components/CustomSelect'

export default function ProductsPage() {
    const [items, setItems] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    
    const emptyForm = {
        name: '',
        categoryId: '',
        unit: '',
        priceCents: '',
        purchasePriceCents: '',
        totalPurchased: '',
        totalSales: '',
        quantity: '',
        inventoryValue: '',
        purchaseValue: '',
        salesValue: '',
        actualInventory: ''
    }
    
    const [form, setForm] = useState(emptyForm)

    useEffect(() => {
        fetch('/api/products').then(r => r.json()).then(data => setItems(Array.isArray(data) ? data : []))
        fetch('/api/categories').then(r => r.json()).then(data => setCategories(Array.isArray(data) ? data : []))
    }, [])
    const [user, setUser] = useState<any>(null)
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    // Auto-calculate all formula fields
    useEffect(() => {
        const unit = Number(form.unit) || 0
        const ratePerUnit = Number(form.priceCents) || 0
        const purchase = Number(form.totalPurchased) || 0
        const sales = Number(form.totalSales) || 0
        
        // P/PRICE = UINT × RATE/U
        const calculatedPurchasePrice = unit * ratePerUnit
        
        // INVENTORY = PURCHASE - SALES
        const calculatedInventory = purchase - sales
        
        // INV/VAL = RATE/U × INVENTORY (IFERROR handles empty)
        const calculatedInventoryValue = ratePerUnit * calculatedInventory
        
        // PUR/VAL = RATE/U × PURCHASE
        const calculatedPurchaseValue = ratePerUnit * purchase
        
        // SALE/VAL = RATE/U × SALES (IF handles 0)
        const calculatedSalesValue = ratePerUnit * sales
        
        // ACTUAL INVENTORY = INVENTORY / UINT (IFERROR handles division by zero)
        const calculatedActualInventory = unit > 0 ? calculatedInventory / unit : 0
        
        setForm(prev => ({
            ...prev,
            purchasePriceCents: calculatedPurchasePrice > 0 ? String(calculatedPurchasePrice) : prev.purchasePriceCents,
            quantity: String(calculatedInventory),
            inventoryValue: calculatedInventoryValue > 0 ? String(calculatedInventoryValue) : '',
            purchaseValue: calculatedPurchaseValue > 0 ? String(calculatedPurchaseValue) : '',
            salesValue: calculatedSalesValue > 0 ? String(calculatedSalesValue) : '',
            actualInventory: calculatedActualInventory > 0 ? String(calculatedActualInventory.toFixed(0)) : prev.actualInventory
        }))
    }, [form.unit, form.priceCents, form.totalPurchased, form.totalSales])

    async function create(e: any) {
        e.preventDefault()
        try {
            const payload = {
                name: form.name,
                categoryId: form.categoryId ? Number(form.categoryId) : null,
                unit: form.unit,
                priceCents: Number(form.priceCents) || 0,
                purchasePriceCents: Number(form.purchasePriceCents) || 0,
                totalPurchased: Number(form.totalPurchased) || 0,
                totalSales: Number(form.totalSales) || 0,
                quantity: Number(form.quantity) || 0,
                actualInventory: Number(form.actualInventory) || null
            }
            
            const response = await fetch('/api/products', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            })
            
            if (response.ok) {
                const updatedItems = await (await fetch('/api/products')).json()
                setItems(Array.isArray(updatedItems) ? updatedItems : [])
                closeModal()
                alert('Product added successfully!')
            } else {
                const error = await response.json()
                alert('Failed to add product: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Create error:', error)
            alert('Failed to add product: ' + error)
        }
    }

    async function updateProduct(e: any) {
        e.preventDefault()
        if (!editingId) return
        
        const payload = {
            id: editingId,
            name: form.name,
            categoryId: form.categoryId ? Number(form.categoryId) : null,
            unit: form.unit,
            priceCents: Number(form.priceCents) || 0,
            purchasePriceCents: Number(form.purchasePriceCents) || 0,
            totalPurchased: Number(form.totalPurchased) || 0,
            totalSales: Number(form.totalSales) || 0,
            quantity: Number(form.quantity) || 0,
            actualInventory: Number(form.actualInventory) || null
        }
        
        try {
            const response = await fetch('/api/products', { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            })
            
            if (response.ok) {
                setItems(await (await fetch('/api/products')).json())
                closeModal()
            } else {
                const error = await response.json()
                alert('Failed to update product: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Update error:', error)
            alert('Failed to update product')
        }
    }

    function editProduct(product: any) {
        setEditingId(product.id)
        setForm({
            name: product.name,
            categoryId: product.categoryId ? String(product.categoryId) : '',
            unit: product.unit || '',
            priceCents: String(product.priceCents || 0),
            purchasePriceCents: String(product.purchasePriceCents || 0),
            totalPurchased: String(product.totalPurchased || 0),
            totalSales: String(product.totalSales || 0),
            quantity: String(product.quantity || 0),
            inventoryValue: String(product.inventoryValue || ''),
            purchaseValue: String(product.purchaseValue || ''),
            salesValue: String(product.salesValue || ''),
            actualInventory: product.actualInventory ? String(product.actualInventory) : ''
        })
        setIsModalOpen(true)
        setIsAnimating(false)
        // Small delay to trigger opening animation
        setTimeout(() => setIsAnimating(true), 10)
    }

    function closeModal() {
        setIsAnimating(false)
        setTimeout(() => {
            setIsModalOpen(false)
            setEditingId(null)
            setForm(emptyForm)
        }, 300) // Match the animation duration
    }

    function cancelEdit() {
        closeModal()
    }

    async function deleteProduct(id: number) {
        if (!confirm('Are you sure you want to delete this product?')) return
        try {
            const response = await fetch('/api/products', { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ id }) 
            })
            if (response.ok) {
                setItems(await (await fetch('/api/products')).json())
            } else {
                const error = await response.json()
                alert('Failed to delete product: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Delete error:', error)
            alert('Failed to delete product')
        }
    }

    return (
        <div>
            <div className="section-header flex justify-between items-center">
                <h2 className="section-title">Inventory Management</h2>
                <button 
                    onClick={() => {
                        setIsModalOpen(true)
                        setIsAnimating(false)
                        setTimeout(() => setIsAnimating(true), 10)
                    }}
                    className="btn btn-primary"
                >
                    + Add New Product
                </button>
            </div>

            {/* Modal/Dialog */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-200 ease-out"
                    style={{
                        opacity: isAnimating ? 1 : 0,
                        backgroundColor: isAnimating ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)'
                    }}
                    onClick={cancelEdit}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out"
                        style={{
                            opacity: isAnimating ? 1 : 0,
                            transform: isAnimating ? 'scale(1)' : 'scale(0.95)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                                <span>{editingId ? 'Edit Product' : 'Add New Product'}</span>
                                <button 
                                    type="button" 
                                    onClick={cancelEdit} 
                                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </h3>
                            <form onSubmit={editingId ? updateProduct : create} className="space-y-3">
                            {/* Category */}
                            <div>
                                <label className="block text-xs font-medium mb-1">Category</label>
                                <CustomSelect
                                    value={form.categoryId}
                                    onChange={(val) => setForm({ ...form, categoryId: val })}
                                    options={[
                                        { value: '', label: 'Select category' },
                                        ...(Array.isArray(categories) ? categories.map(c => ({ value: String(c.id), label: c.name })) : [])
                                    ]}
                                    placeholder="Select category"
                                />
                            </div>

                            {/* Product Name */}
                            <div>
                                <label className="block text-xs font-medium mb-1">Product Name (ITEM) *</label>
                                <input required placeholder="DRP CANCEROMIN/R1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="p-1.5 text-sm border rounded w-full" />
                            </div>

                            {/* Unit */}
                            <div>
                                <label className="block text-xs font-medium mb-1">Unit (UINT)</label>
                                <input type="number" placeholder="30" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="p-1.5 text-sm border rounded w-full" />
                            </div>

                            {/* Sale Price */}
                            <div>
                                <label className="block text-xs font-medium mb-1">Sale Price (RATE/U) ₹</label>
                                <input type="number" step="0.01" placeholder="5.00" value={form.priceCents} onChange={e => setForm({ ...form, priceCents: e.target.value })} className="p-1.5 text-sm border rounded w-full" />
                            </div>

                            {/* Purchase Qty */}
                            <div>
                                <label className="block text-xs font-medium mb-1">Purchase Qty (PURCHASE)</label>
                                <input 
                                    type="number" 
                                    placeholder="150000.0" 
                                    value={form.totalPurchased} 
                                    onChange={e => setForm({ ...form, totalPurchased: e.target.value })} 
                                    className="p-1.5 text-sm border rounded w-full" 
                                />
                            </div>

                            {/* Sales Qty */}
                            <div>
                                <label className="block text-xs font-medium mb-1">Sales Qty (SALES)</label>
                                <input 
                                    type="number" 
                                    placeholder="304.0" 
                                    value={form.totalSales} 
                                    onChange={e => setForm({ ...form, totalSales: e.target.value })} 
                                    className="p-1.5 text-sm border rounded w-full" 
                                />
                            </div>

                            <div className="flex gap-2 justify-end pt-1">
                                <button type="button" onClick={cancelEdit} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={!user} className={`btn ${user ? 'btn-primary' : 'btn-secondary'}`}>
                                    {!user ? 'Login to add products' : editingId ? 'Update Product' : 'Add Product'}
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Products Table */}
            <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                            <span>Products Inventory</span>
                            <span className="badge">{items.length} items</span>
                        </h3>
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-muted">No products yet</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                                    <tr>
                                        <th className="px-2 py-1 text-left font-semibold text-xs">ITEM</th>
                                        <th className="px-1 py-1 text-left font-semibold text-xs">UNIT</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">RATE/U</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">P/PRICE</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">THRESH/IN</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">INVENTORY</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">INV/VAL</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">PURCHASE</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">PUR/VAL</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">SALES</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">SALE/VAL</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">LATEST</th>
                                        <th className="px-1 py-1 text-right font-semibold text-xs">ACTUAL</th>
                                        <th className="px-2 py-1 text-center font-semibold text-xs">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {items.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-2 py-1.5">
                                                <div className="font-medium text-xs leading-tight">{p.name}</div>
                                                {p.category && (
                                                    <div className="text-[10px] text-brand">{p.category.name}</div>
                                                )}
                                            </td>
                                            <td className="px-1 py-1.5 text-left text-xs">{p.unit || '-'}</td>
                                            <td className="px-1 py-1.5 text-right text-xs">₹{(p.priceCents || 0).toFixed(2)}</td>
                                            <td className="px-1 py-1.5 text-right text-xs">₹{(p.purchasePriceCents || 0).toFixed(2)}</td>
                                            <td className="px-1 py-1.5 text-right text-xs">{(p.category?.reorderLevel || 0).toFixed(0)}</td>
                                            <td className="px-1 py-1.5 text-right text-xs">
                                                <span className={p.quantity < (p.category?.reorderLevel || 0) ? 'text-red-600 font-semibold' : ''}>
                                                    {(p.quantity || 0).toFixed(0)}
                                                </span>
                                            </td>
                                            <td className="px-1 py-1.5 text-right text-xs">{p.inventoryValue ? `₹${p.inventoryValue.toFixed(0)}` : '-'}</td>
                                            <td className="px-1 py-1.5 text-right text-xs">{(p.totalPurchased || 0).toFixed(0)}</td>
                                            <td className="px-1 py-1.5 text-right text-xs">{p.purchaseValue ? `₹${p.purchaseValue.toFixed(0)}` : '-'}</td>
                                            <td className="px-1 py-1.5 text-right text-xs">{(p.totalSales || 0).toFixed(0)}</td>
                                            <td className="px-1 py-1.5 text-right text-xs">{p.salesValue ? `₹${p.salesValue.toFixed(0)}` : '-'}</td>
                                            <td className="px-1 py-1.5 text-right text-[10px]">{p.latestUpdate ? new Date(p.latestUpdate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '-'}</td>
                                            <td className="px-1 py-1.5 text-right text-xs">{p.actualInventory ? (p.actualInventory).toFixed(0) : '-'}</td>
                                            <td className="px-2 py-1.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => editProduct(p)}
                                                        disabled={!user}
                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] px-1.5 py-0.5 border border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                        title="Edit product"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => deleteProduct(p.id)}
                                                        disabled={!user}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] px-1.5 py-0.5 border border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        title="Delete product"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
        </div>
    )
}
