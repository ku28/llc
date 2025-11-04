import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ConfirmModal from '../components/ConfirmModal'
import LoadingModal from '../components/LoadingModal'
import ToastNotification from '../components/ToastNotification'
import CustomSelect from '../components/CustomSelect'
import { useToast } from '../hooks/useToast'

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()

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
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            await Promise.all([
                fetchSuppliers(),
                fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
            ])
        } finally {
            setLoading(false)
        }
    }

    const fetchSuppliers = async () => {
        const response = await fetch('/api/suppliers')
        const data = await response.json()
        setSuppliers(Array.isArray(data) ? data : [])
    }

    const [user, setUser] = useState<any>(null)

    async function handleSubmit(e: any) {
        e.preventDefault()
        setSubmitting(true)
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
                showSuccess(editingId ? 'Supplier updated successfully!' : 'Supplier added successfully!')
            } else {
                const error = await response.json()
                showError('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error saving supplier:', error)
            showError('Failed to save supplier')
        } finally {
            setSubmitting(false)
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
        setDeleting(true)
        try {
            const response = await fetch(`/api/suppliers?id=${deleteId}`, { method: 'DELETE' })
            if (response.ok) {
                await fetchSuppliers()
                showSuccess('Supplier deleted successfully!')
            } else {
                showError('Failed to delete supplier')
            }
        } catch (error) {
            console.error('Error deleting supplier:', error)
            showError('Failed to delete supplier')
        } finally {
            setDeleting(false)
            setShowDeleteConfirm(false)
            setDeleteId(null)
        }
    }

    function toggleRowExpansion(id: number) {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
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
                showSuccess(`Supplier ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`)
            }
        } catch (error) {
            console.error('Error toggling status:', error)
            showError('Failed to update supplier status')
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
                        <div className="w-48">
                            <CustomSelect
                                value={filterStatus}
                                onChange={(value) => setFilterStatus(value)}
                                options={[
                                    { value: '', label: 'All Status' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'inactive', label: 'Inactive' }
                                ]}
                                placeholder="All Status"
                            />
                        </div>
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingId ? 'Edit Supplier' : 'Add New Supplier'}
                                </h2>
                                <button
                                    onClick={cancelEdit}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Form Content - Scrollable */}
                            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                                <form onSubmit={handleSubmit} className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Basic Information */}
                                        <div className="md:col-span-2">
                                            <h3 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">Basic Information</h3>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Supplier Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={form.name}
                                                onChange={(e) => setForm({...form, name: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Enter supplier name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Contact Person</label>
                                            <input
                                                type="text"
                                                value={form.contactPerson}
                                                onChange={(e) => setForm({...form, contactPerson: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Contact person name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Email</label>
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={(e) => setForm({...form, email: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="supplier@example.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Phone</label>
                                            <input
                                                type="tel"
                                                value={form.phone}
                                                onChange={(e) => setForm({...form, phone: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>

                                        {/* Address Information */}
                                        <div className="md:col-span-2 mt-4">
                                            <h3 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">Address</h3>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Street Address</label>
                                            <textarea
                                                value={form.address}
                                                onChange={(e) => setForm({...form, address: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                rows={2}
                                                placeholder="Street address"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">City</label>
                                            <input
                                                type="text"
                                                value={form.city}
                                                onChange={(e) => setForm({...form, city: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="City"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">State</label>
                                            <input
                                                type="text"
                                                value={form.state}
                                                onChange={(e) => setForm({...form, state: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="State"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Pincode</label>
                                            <input
                                                type="text"
                                                value={form.pincode}
                                                onChange={(e) => setForm({...form, pincode: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="123456"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">GSTIN</label>
                                            <input
                                                type="text"
                                                value={form.gstin}
                                                onChange={(e) => setForm({...form, gstin: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="22AAAAA0000A1Z5"
                                            />
                                        </div>

                                        {/* Payment Terms */}
                                        <div className="md:col-span-2 mt-4">
                                            <h3 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">Payment & Credit</h3>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Payment Terms</label>
                                            <CustomSelect
                                                value={form.paymentTerms}
                                                onChange={(value) => setForm({...form, paymentTerms: value})}
                                                options={[
                                                    { value: 'Net 7', label: 'Net 7 Days' },
                                                    { value: 'Net 15', label: 'Net 15 Days' },
                                                    { value: 'Net 30', label: 'Net 30 Days' },
                                                    { value: 'Net 45', label: 'Net 45 Days' },
                                                    { value: 'Net 60', label: 'Net 60 Days' },
                                                    { value: 'COD', label: 'Cash on Delivery' },
                                                    { value: 'Advance', label: 'Advance Payment' }
                                                ]}
                                                placeholder="Select payment terms"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Credit Limit (₹)</label>
                                            <input
                                                type="number"
                                                value={form.creditLimit}
                                                onChange={(e) => setForm({...form, creditLimit: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>

                                        {/* Notes */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Notes</label>
                                            <textarea
                                                value={form.notes}
                                                onChange={(e) => setForm({...form, notes: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                rows={3}
                                                placeholder="Additional notes about the supplier..."
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!user}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {editingId ? 'Update Supplier' : 'Add Supplier'}
                                        </button>
                                    </div>
                                </form>
                            </div>
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
                        <div className="space-y-3">
                            {filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(s => {
                                const isExpanded = expandedRows.has(s.id)
                                return (
                                    <div key={s.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                        {/* Summary Row */}
                                        <div className="bg-gray-50 dark:bg-gray-800 p-3 flex items-center gap-3">
                                            {/* Supplier Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm">{s.name}</div>
                                                <div className="text-xs text-muted mt-0.5">
                                                    {s.phone && <span className="mr-2">📞 {s.phone}</span>}
                                                    {s.city && <span>{s.city}</span>}
                                                </div>
                                            </div>
                                            
                                            {/* Status Badge */}
                                            <button
                                                onClick={() => toggleStatus(s)}
                                                className={`px-2 py-1 text-xs rounded ${
                                                    s.status === 'active' 
                                                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                                }`}
                                            >
                                                {s.status}
                                            </button>
                                            
                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => editSupplier(s)}
                                                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={() => deleteSupplier(s.id)}
                                                    className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                                                >
                                                    🗑️ Delete
                                                </button>
                                                <button
                                                    onClick={() => toggleRowExpansion(s.id)}
                                                    className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                                                >
                                                    {isExpanded ? '▲ Hide' : '▼ View More'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="p-4 bg-white dark:bg-gray-900 space-y-4">
                                                {/* Contact Info */}
                                                <div>
                                                    <div className="text-sm font-semibold mb-2">Contact Information</div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Contact Person</div>
                                                            <div className="text-sm font-medium">{s.contactPerson || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Phone</div>
                                                            <div className="text-sm font-medium">{s.phone || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Email</div>
                                                            <div className="text-sm font-medium">{s.email || '-'}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Address Info */}
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                                    <div className="text-sm font-semibold mb-2">Address</div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Address</div>
                                                            <div className="text-sm font-medium">{s.address || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">City</div>
                                                            <div className="text-sm font-medium">{s.city || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">State</div>
                                                            <div className="text-sm font-medium">{s.state || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Pincode</div>
                                                            <div className="text-sm font-medium">{s.pincode || '-'}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Business Info */}
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                                    <div className="text-sm font-semibold mb-2">Business Information</div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">GSTIN</div>
                                                            <div className="text-sm font-medium">{s.gstin || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Payment Terms</div>
                                                            <div className="text-sm font-medium">{s.paymentTerms || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Credit Limit</div>
                                                            <div className="text-sm font-medium">₹{(s.creditLimit || 0).toLocaleString()}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Outstanding Balance</div>
                                                            <div className="text-sm font-medium text-red-600">₹{(s.outstandingBalance || 0).toLocaleString()}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Purchase Orders</div>
                                                            <div className="text-sm font-medium">{s._count?.purchaseOrders || 0}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Notes */}
                                                {s.notes && (
                                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                                        <div className="text-xs text-muted mb-1">Notes</div>
                                                        <div className="text-sm">{s.notes}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                            {/* Pagination Controls */}
                            {filteredSuppliers.length > itemsPerPage && (
                                <div className="mt-6 flex items-center justify-center gap-4">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        Page {currentPage} of {Math.ceil(filteredSuppliers.length / itemsPerPage)}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredSuppliers.length / itemsPerPage), prev + 1))}
                                        disabled={currentPage === Math.ceil(filteredSuppliers.length / itemsPerPage)}
                                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        Next
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            )}
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

            <LoadingModal 
                isOpen={loading || submitting || deleting} 
                message={loading ? 'Loading suppliers...' : submitting ? 'Saving supplier...' : 'Deleting supplier...'}
            />

            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </div>
    )
}
