import { useState, useEffect } from 'react'
import Layout from '../components/Layout'

export default function PurchaseOrdersPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false)
    const [receivingPO, setReceivingPO] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterSupplier, setFilterSupplier] = useState('')
    
    const emptyForm = {
        supplierId: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDate: '',
        status: 'pending',
        discount: '',
        shippingCost: '',
        notes: '',
        items: [{ productId: '', quantity: '', unitPrice: '', taxRate: '', discount: '' }]
    }
    
    const [form, setForm] = useState(emptyForm)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        fetchPurchaseOrders()
        fetchSuppliers()
        fetchProducts()
        fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
    }, [])

    const fetchPurchaseOrders = async () => {
        const response = await fetch('/api/purchase-orders')
        const data = await response.json()
        setPurchaseOrders(Array.isArray(data) ? data : [])
    }

    const fetchSuppliers = async () => {
        const response = await fetch('/api/suppliers')
        const data = await response.json()
        setSuppliers(Array.isArray(data) ? data.filter((s: any) => s.status === 'active') : [])
    }

    const fetchProducts = async () => {
        const response = await fetch('/api/products/public')
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : [])
    }

    async function handleSubmit(e: any) {
        e.preventDefault()
        try {
            // Filter out empty items
            const validItems = form.items.filter(item => 
                item.productId && item.quantity && item.unitPrice
            )

            if (validItems.length === 0) {
                alert('Please add at least one item to the purchase order')
                return
            }

            const payload = {
                supplierId: Number(form.supplierId),
                orderDate: form.orderDate,
                expectedDate: form.expectedDate || null,
                status: form.status,
                discount: form.discount ? Number(form.discount) : 0,
                shippingCost: form.shippingCost ? Number(form.shippingCost) : 0,
                notes: form.notes,
                items: validItems.map(item => ({
                    productId: Number(item.productId),
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    taxRate: item.taxRate ? Number(item.taxRate) : 0,
                    discount: item.discount ? Number(item.discount) : 0
                }))
            }
            
            const url = editingId ? '/api/purchase-orders' : '/api/purchase-orders'
            const method = editingId ? 'PUT' : 'POST'
            const body = editingId ? { ...payload, id: editingId } : payload
            
            const response = await fetch(url, { 
                method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(body) 
            })
            
            if (response.ok) {
                await fetchPurchaseOrders()
                closeModal()
                alert(editingId ? 'Purchase Order updated!' : 'Purchase Order created!')
            } else {
                const error = await response.json()
                alert('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error saving purchase order:', error)
            alert('Failed to save purchase order')
        }
    }

    function addItem() {
        setForm({
            ...form,
            items: [...form.items, { productId: '', quantity: '', unitPrice: '', taxRate: '', discount: '' }]
        })
    }

    function removeItem(index: number) {
        const newItems = form.items.filter((_, i) => i !== index)
        setForm({ ...form, items: newItems })
    }

    function updateItem(index: number, field: string, value: any) {
        const newItems = [...form.items]
        newItems[index] = { ...newItems[index], [field]: value }
        setForm({ ...form, items: newItems })
    }

    function editPurchaseOrder(po: any) {
        setForm({
            supplierId: po.supplierId || '',
            orderDate: po.orderDate ? po.orderDate.split('T')[0] : '',
            expectedDate: po.expectedDate ? po.expectedDate.split('T')[0] : '',
            status: po.status || 'pending',
            discount: po.discount || '',
            shippingCost: po.shippingCost || '',
            notes: po.notes || '',
            items: po.items?.map((item: any) => ({
                productId: item.productId || '',
                quantity: item.quantity || '',
                unitPrice: item.unitPrice || '',
                taxRate: item.taxRate || '',
                discount: item.discount || ''
            })) || [{ productId: '', quantity: '', unitPrice: '', taxRate: '', discount: '' }]
        })
        setEditingId(po.id)
        setIsModalOpen(true)
        setIsAnimating(false)
        setTimeout(() => setIsAnimating(true), 10)
    }

    async function deletePurchaseOrder(id: number) {
        if (!confirm('Are you sure you want to delete this purchase order?')) return
        try {
            const response = await fetch(`/api/purchase-orders?id=${id}`, { method: 'DELETE' })
            if (response.ok) {
                await fetchPurchaseOrders()
                alert('Purchase order deleted!')
            } else {
                alert('Failed to delete purchase order')
            }
        } catch (error) {
            console.error('Error deleting:', error)
            alert('Failed to delete purchase order')
        }
    }

    function openReceivingModal(po: any) {
        setReceivingPO({
            ...po,
            items: po.items.map((item: any) => ({
                ...item,
                receivingQuantity: item.quantity - (item.receivedQuantity || 0)
            }))
        })
        setIsReceivingModalOpen(true)
        setIsAnimating(false)
        setTimeout(() => setIsAnimating(true), 10)
    }

    async function handleReceiveGoods(e: any) {
        e.preventDefault()
        try {
            const items = receivingPO.items.map((item: any) => ({
                id: item.id,
                receivedQuantity: Number(item.receivingQuantity) || 0
            }))

            const response = await fetch('/api/purchase-orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: receivingPO.id,
                    status: 'received',
                    receivedDate: new Date().toISOString().split('T')[0],
                    items
                })
            })

            if (response.ok) {
                await fetchPurchaseOrders()
                setIsReceivingModalOpen(false)
                setReceivingPO(null)
                alert('Goods received and inventory updated!')
            } else {
                const error = await response.json()
                alert('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error receiving goods:', error)
            alert('Failed to receive goods')
        }
    }

    function closeModal() {
        setIsAnimating(false)
        setTimeout(() => {
            setIsModalOpen(false)
            setForm(emptyForm)
            setEditingId(null)
        }, 200)
    }

    function closeReceivingModal() {
        setIsAnimating(false)
        setTimeout(() => {
            setIsReceivingModalOpen(false)
            setReceivingPO(null)
        }, 200)
    }

    const filteredPOs = purchaseOrders.filter(po => {
        const matchesSearch = searchQuery ? 
            po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase())
            : true
        
        const matchesStatus = filterStatus ? po.status === filterStatus : true
        const matchesSupplier = filterSupplier ? po.supplierId === Number(filterSupplier) : true
        
        return matchesSearch && matchesStatus && matchesSupplier
    })

    function calculateItemTotal(item: any) {
        const quantity = Number(item.quantity) || 0
        const unitPrice = Number(item.unitPrice) || 0
        const taxRate = Number(item.taxRate) || 0
        const discount = Number(item.discount) || 0
        
        const subtotal = quantity * unitPrice
        const afterDiscount = subtotal - discount
        const tax = afterDiscount * (taxRate / 100)
        
        return afterDiscount + tax
    }

    function calculatePOTotal() {
        const itemsTotal = form.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
        const discount = Number(form.discount) || 0
        const shipping = Number(form.shippingCost) || 0
        
        return itemsTotal - discount + shipping
    }

    return (
            <div>
                <div className="section-header flex justify-between items-center">
                    <h2 className="section-title">Purchase Orders</h2>
                    <button 
                        onClick={() => {
                            setIsModalOpen(true)
                            setIsAnimating(false)
                            setTimeout(() => setIsAnimating(true), 10)
                        }}
                        className="btn btn-primary"
                    >
                        + Create Purchase Order
                    </button>
                </div>

                {/* Search and Filter Bar */}
                <div className="card mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex-1 relative min-w-[250px]">
                            <input
                                type="text"
                                placeholder="🔍 Search by PO number or supplier..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                        <select
                            value={filterSupplier}
                            onChange={(e) => setFilterSupplier(e.target.value)}
                            className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        >
                            <option value="">All Suppliers</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="received">Received</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        {(searchQuery || filterStatus || filterSupplier) && (
                            <button
                                onClick={() => {
                                    setSearchQuery('')
                                    setFilterStatus('')
                                    setFilterSupplier('')
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Create/Edit Modal */}
                {isModalOpen && (
                    <div 
                        className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-200 ease-out"
                        style={{
                            opacity: isAnimating ? 1 : 0,
                            backgroundColor: isAnimating ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)'
                        }}
                        onClick={closeModal}
                    >
                        <div 
                            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto transition-all duration-200 ease-out"
                            style={{
                                transform: isAnimating ? 'scale(1)' : 'scale(0.95)',
                                opacity: isAnimating ? 1 : 0
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-xl font-semibold">
                                    {editingId ? 'Edit Purchase Order' : 'Create Purchase Order'}
                                </h3>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Supplier *</label>
                                        <select
                                            required
                                            value={form.supplierId}
                                            onChange={(e) => setForm({...form, supplierId: e.target.value})}
                                            className="input-field"
                                        >
                                            <option value="">Select Supplier</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Order Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={form.orderDate}
                                            onChange={(e) => setForm({...form, orderDate: e.target.value})}
                                            className="input-field"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Expected Date</label>
                                        <input
                                            type="date"
                                            value={form.expectedDate}
                                            onChange={(e) => setForm({...form, expectedDate: e.target.value})}
                                            className="input-field"
                                        />
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-semibold text-lg text-blue-600 dark:text-blue-400">Order Items</h4>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                                        >
                                            + Add Item
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {form.items.map((item, index) => (
                                            <div key={index} className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-medium mb-1">Product *</label>
                                                        <select
                                                            value={item.productId}
                                                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                                            className="input-field text-sm"
                                                            required
                                                        >
                                                            <option value="">Select Product</option>
                                                            {products.map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Quantity *</label>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                            className="input-field text-sm"
                                                            placeholder="0"
                                                            min="0"
                                                            step="1"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Unit Price (₹) *</label>
                                                        <input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                                            className="input-field text-sm"
                                                            placeholder="0.00"
                                                            min="0"
                                                            step="0.01"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Tax Rate (%)</label>
                                                        <input
                                                            type="number"
                                                            value={item.taxRate}
                                                            onChange={(e) => updateItem(index, 'taxRate', e.target.value)}
                                                            className="input-field text-sm"
                                                            placeholder="0"
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                    </div>

                                                    <div className="flex items-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                                                            disabled={form.items.length === 1}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-2 text-right text-sm font-semibold">
                                                    Item Total: ₹{calculateItemTotal(item).toFixed(2)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Charges */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Discount (₹)</label>
                                        <input
                                            type="number"
                                            value={form.discount}
                                            onChange={(e) => setForm({...form, discount: e.target.value})}
                                            className="input-field"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Shipping Cost (₹)</label>
                                        <input
                                            type="number"
                                            value={form.shippingCost}
                                            onChange={(e) => setForm({...form, shippingCost: e.target.value})}
                                            className="input-field"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>

                                    <div className="flex items-end">
                                        <div className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                            <div className="text-sm text-muted">Total Amount</div>
                                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                ₹{calculatePOTotal().toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium mb-1">Notes</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={(e) => setForm({...form, notes: e.target.value})}
                                        className="input-field"
                                        rows={3}
                                        placeholder="Additional notes..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!user}
                                        className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {editingId ? 'Update Purchase Order' : 'Create Purchase Order'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Receiving Goods Modal */}
                {isReceivingModalOpen && receivingPO && (
                    <div 
                        className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-200 ease-out"
                        style={{
                            opacity: isAnimating ? 1 : 0,
                            backgroundColor: isAnimating ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)'
                        }}
                        onClick={closeReceivingModal}
                    >
                        <div 
                            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-all duration-200 ease-out"
                            style={{
                                transform: isAnimating ? 'scale(1)' : 'scale(0.95)',
                                opacity: isAnimating ? 1 : 0
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-semibold">Receive Goods</h3>
                                    <p className="text-sm text-muted">PO: {receivingPO.poNumber}</p>
                                </div>
                                <button
                                    onClick={closeReceivingModal}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleReceiveGoods} className="p-6">
                                <div className="space-y-4 mb-6">
                                    {receivingPO.items.map((item: any, index: number) => {
                                        const product = products.find(p => p.id === item.productId)
                                        const alreadyReceived = item.receivedQuantity || 0
                                        const remaining = item.quantity - alreadyReceived

                                        return (
                                            <div key={item.id} className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="font-semibold">{product?.name || 'Unknown Product'}</div>
                                                        <div className="text-sm text-muted">
                                                            Ordered: {item.quantity} | Already Received: {alreadyReceived} | Remaining: {remaining}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Receiving Quantity</label>
                                                    <input
                                                        type="number"
                                                        value={item.receivingQuantity}
                                                        onChange={(e) => {
                                                            const newItems = [...receivingPO.items]
                                                            newItems[index].receivingQuantity = e.target.value
                                                            setReceivingPO({...receivingPO, items: newItems})
                                                        }}
                                                        className="input-field"
                                                        placeholder="0"
                                                        min="0"
                                                        max={remaining}
                                                        step="1"
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={closeReceivingModal}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!user}
                                        className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Receive Goods & Update Inventory
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Purchase Orders Table */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                        <span>Purchase Orders</span>
                        <span className="badge">
                            {filteredPOs.length} of {purchaseOrders.length} orders
                        </span>
                    </h3>

                    {filteredPOs.length === 0 ? (
                        <div className="text-center py-8 text-muted">
                            <p className="text-lg mb-2">
                                {searchQuery || filterStatus || filterSupplier ? 'No purchase orders match your filters' : 'No purchase orders yet'}
                            </p>
                            <p className="text-sm">
                                {searchQuery || filterStatus || filterSupplier ? 'Try adjusting your search or filter' : 'Click "Create Purchase Order" to get started'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">PO Number</th>
                                        <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                                        <th className="px-4 py-3 text-left font-semibold">Order Date</th>
                                        <th className="px-4 py-3 text-left font-semibold">Expected Date</th>
                                        <th className="px-4 py-3 text-center font-semibold">Items</th>
                                        <th className="px-4 py-3 text-right font-semibold">Total Amount</th>
                                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                                        <th className="px-4 py-3 text-center font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredPOs.map(po => (
                                        <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-4 py-3 font-mono font-semibold">{po.poNumber}</td>
                                            <td className="px-4 py-3">{po.supplier?.name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-xs">
                                                {po.orderDate ? new Date(po.orderDate).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">{po.items?.length || 0}</td>
                                            <td className="px-4 py-3 text-right font-semibold">
                                                ₹{(po.totalAmount || 0).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 text-xs rounded ${
                                                    po.status === 'received' 
                                                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                        : po.status === 'pending'
                                                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                                }`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {po.status === 'pending' && (
                                                        <button
                                                            onClick={() => openReceivingModal(po)}
                                                            disabled={!user}
                                                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded"
                                                            title="Receive goods"
                                                        >
                                                            📦 Receive
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => editPurchaseOrder(po)}
                                                        disabled={!user || po.status === 'received'}
                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Edit purchase order"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => deletePurchaseOrder(po.id)}
                                                        disabled={!user}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Delete purchase order"
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
