import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ConfirmModal from '../components/ConfirmModal'
import LoadingModal from '../components/LoadingModal'

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    
    const emptyForm = {
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
        paymentTerms: 'Net 30',
        creditLimit: '',
        notes: ''
    }
    
    const [form, setForm] = useState(emptyForm)

    useEffect(() => {
        fetchSuppliers()
    }, [])

    const fetchSuppliers = async () => {
        const response = await fetch('/api/suppliers')
        const data = await response.json()
        setSuppliers(Array.isArray(data) ? data : [])
    }

    const [user, setUser] = useState<any>(null)
    useEffect(() => { 
        fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) 
    }, [])

    async function handleSubmit(e: any) {
        e.preventDefault()
        try {
            const payload = {
                ...form,
                creditLimit: form.creditLimit ? Number(form.creditLimit) : 0
            }
            
            const url = editingId ? '/api/suppliers' : '/api/suppliers'
            const method = editingId ? 'PUT' : 'POST'
            const body = editingId ? { ...payload, id: editingId } : payload
            
            const response = await fetch(url, { 
                method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(body) 
            })
            
            if (response.ok) {
                await fetchSuppliers()
                closeModal()
                alert(editingId ? 'Supplier updated successfully!' : 'Supplier added successfully!')
            } else {
                const error = await response.json()
                alert('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error saving supplier:', error)
            alert('Failed to save supplier')
        }
    }

    function editSupplier(supplier: any) {
        setForm({
            name: supplier.name || '',
            contactPerson: supplier.contactPerson || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            city: supplier.city || '',
            state: supplier.state || '',
            pincode: supplier.pincode || '',
            gstin: supplier.gstin || '',
            paymentTerms: supplier.paymentTerms || 'Net 30',
            creditLimit: supplier.creditLimit || '',
            notes: supplier.notes || ''
        })
        setEditingId(supplier.id)
        setIsModalOpen(true)
        setIsAnimating(false)
        setTimeout(() => setIsAnimating(true), 10)
    }

    async function deleteSupplier(id: number) {
        setDeleteId(id)
        setShowDeleteConfirm(true)
    }

    async function confirmDelete() {
        if (deleteId === null) return
        try {
            const response = await fetch(`/api/suppliers?id=${deleteId}`, { method: 'DELETE' })
            if (response.ok) {
                await fetchSuppliers()
                alert('Supplier deleted successfully!')
            } else {
                alert('Failed to delete supplier')
            }
        } catch (error) {
            console.error('Error deleting supplier:', error)
            alert('Failed to delete supplier')
        } finally {
            setShowDeleteConfirm(false)
            setDeleteId(null)
        }
    }

    async function toggleStatus(supplier: any) {
        try {
            const newStatus = supplier.status === 'active' ? 'inactive' : 'active'
            const response = await fetch('/api/suppliers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: supplier.id, status: newStatus })
            })
            if (response.ok) {
                await fetchSuppliers()
            }
        } catch (error) {
            console.error('Error toggling status:', error)
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

    function cancelEdit() {
        closeModal()
    }

    const filteredSuppliers = suppliers.filter(s => {
        const matchesSearch = searchQuery ? 
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
            : true
        
        const matchesStatus = filterStatus ? s.status === filterStatus : true
        
        return matchesSearch && matchesStatus
    })

    return (
        <Layout>
            <div>
                <div className="section-header flex justify-between items-center">
                    <h2 className="section-title">Supplier Management</h2>
                    <button 
                        onClick={() => {
                            setIsModalOpen(true)
                            setIsAnimating(false)
                            setTimeout(() => setIsAnimating(true), 10)
                        }}
                        className="btn btn-primary"
                    >
                        + Add New Supplier
                    </button>
                </div>

                {/* Search and Filter Bar */}
                <div className="card mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex-1 relative min-w-[250px]">
                            <input
                                type="text"
                                placeholder="🔍 Search suppliers by name, contact, phone, or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        {(searchQuery || filterStatus) && (
                            <button
                                onClick={() => {
                                    setSearchQuery('')
                                    setFilterStatus('')
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
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
                            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-all duration-200 ease-out"
                            style={{
                                transform: isAnimating ? 'scale(1)' : 'scale(0.95)',
                                opacity: isAnimating ? 1 : 0
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-xl font-semibold">
                                    {editingId ? 'Edit Supplier' : 'Add New Supplier'}
                                </h3>
                                <button
                                    onClick={cancelEdit}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Basic Information */}
                                    <div className="md:col-span-2">
                                        <h4 className="font-semibold text-lg mb-3 text-blue-600 dark:text-blue-400">Basic Information</h4>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Supplier Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({...form, name: e.target.value})}
                                            className="input-field"
                                            placeholder="Enter supplier name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Contact Person</label>
                                        <input
                                            type="text"
                                            value={form.contactPerson}
                                            onChange={(e) => setForm({...form, contactPerson: e.target.value})}
                                            className="input-field"
                                            placeholder="Contact person name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm({...form, email: e.target.value})}
                                            className="input-field"
                                            placeholder="supplier@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={(e) => setForm({...form, phone: e.target.value})}
                                            className="input-field"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>

                                    {/* Address Information */}
                                    <div className="md:col-span-2 mt-4">
                                        <h4 className="font-semibold text-lg mb-3 text-blue-600 dark:text-blue-400">Address</h4>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Street Address</label>
                                        <textarea
                                            value={form.address}
                                            onChange={(e) => setForm({...form, address: e.target.value})}
                                            className="input-field"
                                            rows={2}
                                            placeholder="Street address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">City</label>
                                        <input
                                            type="text"
                                            value={form.city}
                                            onChange={(e) => setForm({...form, city: e.target.value})}
                                            className="input-field"
                                            placeholder="City"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">State</label>
                                        <input
                                            type="text"
                                            value={form.state}
                                            onChange={(e) => setForm({...form, state: e.target.value})}
                                            className="input-field"
                                            placeholder="State"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Pincode</label>
                                        <input
                                            type="text"
                                            value={form.pincode}
                                            onChange={(e) => setForm({...form, pincode: e.target.value})}
                                            className="input-field"
                                            placeholder="123456"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">GSTIN</label>
                                        <input
                                            type="text"
                                            value={form.gstin}
                                            onChange={(e) => setForm({...form, gstin: e.target.value})}
                                            className="input-field"
                                            placeholder="22AAAAA0000A1Z5"
                                        />
                                    </div>

                                    {/* Payment Terms */}
                                    <div className="md:col-span-2 mt-4">
                                        <h4 className="font-semibold text-lg mb-3 text-blue-600 dark:text-blue-400">Payment & Credit</h4>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Payment Terms</label>
                                        <select
                                            value={form.paymentTerms}
                                            onChange={(e) => setForm({...form, paymentTerms: e.target.value})}
                                            className="input-field"
                                        >
                                            <option value="Net 7">Net 7 Days</option>
                                            <option value="Net 15">Net 15 Days</option>
                                            <option value="Net 30">Net 30 Days</option>
                                            <option value="Net 45">Net 45 Days</option>
                                            <option value="Net 60">Net 60 Days</option>
                                            <option value="COD">Cash on Delivery</option>
                                            <option value="Advance">Advance Payment</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Credit Limit (₹)</label>
                                        <input
                                            type="number"
                                            value={form.creditLimit}
                                            onChange={(e) => setForm({...form, creditLimit: e.target.value})}
                                            className="input-field"
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>

                                    {/* Notes */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Notes</label>
                                        <textarea
                                            value={form.notes}
                                            onChange={(e) => setForm({...form, notes: e.target.value})}
                                            className="input-field"
                                            rows={3}
                                            placeholder="Additional notes about the supplier..."
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!user}
                                        className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {editingId ? 'Update Supplier' : 'Add Supplier'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Suppliers Table */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                        <span>Suppliers</span>
                        <span className="badge">
                            {filteredSuppliers.length} of {suppliers.length} suppliers
                        </span>
                    </h3>

                    {filteredSuppliers.length === 0 ? (
                        <div className="text-center py-8 text-muted">
                            <p className="text-lg mb-2">
                                {searchQuery || filterStatus ? 'No suppliers match your filters' : 'No suppliers yet'}
                            </p>
                            <p className="text-sm">
                                {searchQuery || filterStatus ? 'Try adjusting your search or filter' : 'Click "Add New Supplier" to get started'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Supplier Name</th>
                                        <th className="px-4 py-3 text-left font-semibold">Contact</th>
                                        <th className="px-4 py-3 text-left font-semibold">Location</th>
                                        <th className="px-4 py-3 text-left font-semibold">GSTIN</th>
                                        <th className="px-4 py-3 text-center font-semibold">Payment Terms</th>
                                        <th className="px-4 py-3 text-right font-semibold">Credit Limit</th>
                                        <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                                        <th className="px-4 py-3 text-center font-semibold">POs</th>
                                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                                        <th className="px-4 py-3 text-center font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredSuppliers.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{s.name}</div>
                                                {s.contactPerson && (
                                                    <div className="text-xs text-muted">{s.contactPerson}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {s.phone && <div className="text-xs">{s.phone}</div>}
                                                {s.email && <div className="text-xs text-muted">{s.email}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {s.city && <div className="text-xs">{s.city}</div>}
                                                {s.state && <div className="text-xs text-muted">{s.state}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-xs">{s.gstin || '-'}</td>
                                            <td className="px-4 py-3 text-center text-xs">
                                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                                    {s.paymentTerms}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs">
                                                ₹{(s.creditLimit || 0).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs">
                                                <span className={s.outstandingBalance > 0 ? 'text-red-600 font-semibold' : ''}>
                                                    ₹{(s.outstandingBalance || 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs">
                                                {s._count?.purchaseOrders || 0}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => toggleStatus(s)}
                                                    className={`px-2 py-1 text-xs rounded cursor-pointer ${
                                                        s.status === 'active' 
                                                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                                    }`}
                                                >
                                                    {s.status}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => editSupplier(s)}
                                                        disabled={!user}
                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Edit supplier"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => deleteSupplier(s.id)}
                                                        disabled={!user}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Delete supplier"
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

            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Supplier"
                message="Are you sure you want to delete this supplier? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowDeleteConfirm(false)
                    setDeleteId(null)
                }}
            />
        </Layout>
    )
}
