import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ConfirmModal from '../components/ConfirmModal'
import LoadingModal from '../components/LoadingModal'
import ToastNotification from '../components/ToastNotification'
import CustomSelect from '../components/CustomSelect'
import { useToast } from '../hooks/useToast'

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [paymentInvoice, setPaymentInvoice] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()

    const emptyForm = {
        patientId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        customerGSTIN: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        discount: '',
        notes: '',
        termsAndConditions: 'Payment due within 30 days. Late payments may incur interest charges.',
        items: [{ productId: '', description: '', quantity: '', unitPrice: '', taxRate: '', discount: '' }]
    }

    const [form, setForm] = useState(emptyForm)
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        paymentMethod: 'CASH',
        transactionId: ''
    })
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            await Promise.all([
                fetchInvoices(),
                fetchPatients(),
                fetchProducts(),
                fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
            ])
        } finally {
            setLoading(false)
        }
    }

    const fetchInvoices = async () => {
        const response = await fetch('/api/customer-invoices')
        const data = await response.json()
        setInvoices(Array.isArray(data) ? data : [])
    }

    const fetchPatients = async () => {
        const response = await fetch('/api/patients/public')
        const data = await response.json()
        setPatients(Array.isArray(data) ? data : [])
    }

    const fetchProducts = async () => {
        const response = await fetch('/api/products/public')
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : [])
    }

    async function handleSubmit(e: any) {
        e.preventDefault()
        setSubmitting(true)
        try {
            const validItems = form.items.filter(item =>
                (item.productId || item.description) && item.quantity && item.unitPrice
            )

            if (validItems.length === 0) {
                showError('Please add at least one item to the invoice')
                setSubmitting(false)
                return
            }

            const payload = {
                patientId: form.patientId ? Number(form.patientId) : null,
                customerName: form.customerName,
                customerEmail: form.customerEmail || null,
                customerPhone: form.customerPhone || null,
                customerAddress: form.customerAddress || null,
                customerGSTIN: form.customerGSTIN || null,
                invoiceDate: form.invoiceDate,
                dueDate: form.dueDate || null,
                discount: form.discount ? Number(form.discount) : 0,
                notes: form.notes || null,
                termsAndConditions: form.termsAndConditions || null,
                items: validItems.map(item => ({
                    productId: item.productId ? Number(item.productId) : null,
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    taxRate: item.taxRate ? Number(item.taxRate) : 0,
                    discount: item.discount ? Number(item.discount) : 0
                }))
            }

            const response = await fetch('/api/customer-invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                await fetchInvoices()
                closeModal()
                showSuccess('Invoice created successfully!')
            } else {
                const error = await response.json()
                showError('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error saving invoice:', error)
            showError('Failed to save invoice')
        } finally {
            setSubmitting(false)
        }
    }

    function addItem() {
        setForm({
            ...form,
            items: [...form.items, { productId: '', description: '', quantity: '', unitPrice: '', taxRate: '', discount: '' }]
        })
    }

    function removeItem(index: number) {
        const newItems = form.items.filter((_, i) => i !== index)
        setForm({ ...form, items: newItems })
    }

    function updateItem(index: number, field: string, value: any) {
        const newItems = [...form.items]
        newItems[index] = { ...newItems[index], [field]: value }

        if (field === 'productId' && value) {
            const product = products.find(p => p.id === Number(value))
            if (product) {
                newItems[index].description = product.name
                newItems[index].unitPrice = (product.priceCents / 100).toString()
            }
        }

        setForm({ ...form, items: newItems })
    }

    function fillFromPatient(patientId: string) {
        const patient = patients.find(p => p.id === Number(patientId))
        if (patient) {
            setForm({
                ...form,
                patientId,
                customerName: patient.name,
                customerPhone: patient.phone || '',
                customerEmail: patient.email || '',
                customerAddress: patient.address || ''
            })
        }
    }

    async function deleteInvoice(id: number) {
        setDeleteId(id)
        setShowDeleteConfirm(true)
    }

    async function confirmDelete() {
        if (deleteId === null) return
        setDeleting(true)
        try {
            const response = await fetch(`/api/customer-invoices?id=${deleteId}`, { method: 'DELETE' })
            if (response.ok) {
                await fetchInvoices()
                showSuccess('Invoice deleted successfully!')
            } else {
                showError('Failed to delete invoice')
            }
        } catch (error) {
            console.error('Error deleting:', error)
            showError('Failed to delete invoice')
        } finally {
            setDeleting(false)
            setShowDeleteConfirm(false)
            setDeleteId(null)
        }
    }

    function openPaymentModal(invoice: any) {
        setPaymentInvoice(invoice)
        setPaymentForm({
            amount: (invoice.balanceAmount || 0).toString(),
            paymentMethod: 'CASH',
            transactionId: ''
        })
        setIsPaymentModalOpen(true)
        setIsAnimating(false)
        setTimeout(() => setIsAnimating(true), 10)
    }

    async function handlePayment(e: any) {
        e.preventDefault()
        setSubmitting(true)
        try {
            const response = await fetch('/api/customer-invoices', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: paymentInvoice.id,
                    paidAmount: Number(paymentForm.amount),
                    paymentMethod: paymentForm.paymentMethod,
                    transactionId: paymentForm.transactionId || null
                })
            })

            if (response.ok) {
                await fetchInvoices()
                setIsPaymentModalOpen(false)
                setPaymentInvoice(null)
                showSuccess('Payment recorded successfully!')
            } else {
                const error = await response.json()
                showError('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error recording payment:', error)
            showError('Failed to record payment')
        } finally {
            setSubmitting(false)
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

    function closePaymentModal() {
        setIsAnimating(false)
        setTimeout(() => {
            setIsPaymentModalOpen(false)
            setPaymentInvoice(null)
        }, 200)
    }

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = searchQuery ?
            inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.customerPhone || '').toLowerCase().includes(searchQuery.toLowerCase())
            : true

        const matchesStatus = filterStatus ? inv.status === filterStatus : true

        return matchesSearch && matchesStatus
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

    function calculateInvoiceTotal() {
        const itemsTotal = form.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
        const discount = Number(form.discount) || 0

        return itemsTotal - discount
    }

    return (
        <div>
            <div className="section-header flex justify-between items-center">
                <h2 className="section-title">Customer Invoices</h2>
                <button
                    onClick={() => {
                        setIsModalOpen(true)
                        setIsAnimating(false)
                        setTimeout(() => setIsAnimating(true), 10)
                    }}
                    className="btn btn-primary"
                >
                    + Create Invoice
                </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="card mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 relative min-w-[250px]">
                        <input
                            type="text"
                            placeholder="🔍 Search invoices..."
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
                                { value: 'unpaid', label: 'Unpaid' },
                                { value: 'partial', label: 'Partially Paid' },
                                { value: 'paid', label: 'Paid' }
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

            {/* Invoices Table */}
            <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                    <span>Invoices</span>
                    <span className="badge">
                        {filteredInvoices.length} of {invoices.length} invoices
                    </span>
                </h3>

                {filteredInvoices.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                        <p className="text-lg mb-2">No invoices yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                                    <th className="px-4 py-3 text-right font-semibold">Balance</th>
                                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(inv => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 font-mono font-semibold">{inv.invoiceNumber}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{inv.customerName}</div>
                                            {inv.customerPhone && (
                                                <div className="text-xs text-muted">{inv.customerPhone}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            ₹{(inv.totalAmount || 0).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-600 font-semibold">
                                            ₹{(inv.balanceAmount || 0).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 text-xs rounded ${inv.status === 'paid'
                                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                    : inv.status === 'partial'
                                                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {inv.status !== 'paid' && (
                                                    <button
                                                        onClick={() => openPaymentModal(inv)}
                                                        disabled={!user}
                                                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded"
                                                    >
                                                        💰 Pay
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteInvoice(inv.id)}
                                                    disabled={!user}
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {filteredInvoices.length > itemsPerPage && (
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
                                    Page {currentPage} of {Math.ceil(filteredInvoices.length / itemsPerPage)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredInvoices.length / itemsPerPage), prev + 1))}
                                    disabled={currentPage === Math.ceil(filteredInvoices.length / itemsPerPage)}
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
                )}
            </div>

            {/* Create/Edit Invoice Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingId ? 'Edit Invoice' : 'Create Invoice'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {/* Form Content - Scrollable */}
                        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                            <form onSubmit={handleSubmit} className="p-6">
                                {/* Customer Information Section */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Customer Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Patient (Optional)</label>
                                            <CustomSelect
                                                value={form.patientId}
                                                onChange={(value) => {
                                                    setForm({ ...form, patientId: value })
                                                    if (value) fillFromPatient(value)
                                                }}
                                                options={[
                                                    { value: '', label: '-- Select Patient --' },
                                                    ...patients.map(p => ({
                                                        value: p.id.toString(),
                                                        label: `${p.firstName} ${p.lastName}${p.opdNo ? ` (${p.opdNo})` : ''}`
                                                    }))
                                                ]}
                                                placeholder="Select patient"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Customer Name *</label>
                                            <input
                                                required
                                                value={form.customerName}
                                                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Email</label>
                                            <input
                                                type="email"
                                                value={form.customerEmail}
                                                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Phone</label>
                                            <input
                                                type="tel"
                                                value={form.customerPhone}
                                                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Address</label>
                                            <textarea
                                                value={form.customerAddress}
                                                onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                                                rows={2}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Invoice Details Section */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Invoice Details</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Invoice Date *</label>
                                            <input
                                                type="date"
                                                required
                                                value={form.invoiceDate}
                                                onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Due Date</label>
                                            <input
                                                type="date"
                                                value={form.dueDate}
                                                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Discount (₹)</label>
                                            <input
                                                type="number"
                                                value={form.discount}
                                                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                                                min="0"
                                                step="0.01"
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Line Items Section */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h3>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {form.items.map((item, index) => (
                                            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                                <div className="grid grid-cols-6 gap-3">
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Product</label>
                                                        <CustomSelect
                                                            value={item.productId}
                                                            onChange={(value) => updateItem(index, 'productId', value)}
                                                            options={[
                                                                { value: '', label: '-- Optional --' },
                                                                ...products.map(p => ({
                                                                    value: p.id.toString(),
                                                                    label: p.name
                                                                }))
                                                            ]}
                                                            placeholder="Select product"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Description *</label>
                                                        <input
                                                            required
                                                            value={item.description}
                                                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Qty *</label>
                                                        <input
                                                            type="number"
                                                            required
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                            min="1"
                                                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Price *</label>
                                                        <input
                                                            type="number"
                                                            required
                                                            value={item.unitPrice}
                                                            onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        Total: ₹{calculateItemTotal(item).toFixed(2)}
                                                    </div>
                                                    {form.items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Total Section */}
                                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-semibold text-gray-900 dark:text-white">Invoice Total:</span>
                                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            ₹{calculateInvoiceTotal().toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Notes Section */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Notes</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        rows={3}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Any additional notes..."
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!user}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {editingId ? 'Update Invoice' : 'Create Invoice'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && paymentInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Invoice: {paymentInvoice.invoiceNumber}</p>
                            </div>
                            <button
                                onClick={closePaymentModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {/* Content */}
                        <form onSubmit={handlePayment}>
                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Balance Due:</span>
                                    <span className="font-bold text-lg text-red-600 dark:text-red-400">
                                        ₹{(paymentInvoice.balanceAmount || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Payment Amount (₹) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        max={paymentInvoice.balanceAmount}
                                        step="0.01"
                                        placeholder="Enter payment amount"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Payment Method *</label>
                                    <CustomSelect
                                        value={paymentForm.paymentMethod}
                                        onChange={(value) => setPaymentForm({ ...paymentForm, paymentMethod: value })}
                                        options={[
                                            { value: 'CASH', label: 'Cash' },
                                            { value: 'CARD', label: 'Card' },
                                            { value: 'UPI', label: 'UPI' },
                                            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                                            { value: 'CHEQUE', label: 'Cheque' }
                                        ]}
                                        placeholder="Select payment method"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closePaymentModal}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!user}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Invoice"
                message="Are you sure you want to delete this invoice? This action cannot be undone."
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
                message={loading ? 'Loading invoices...' : submitting ? 'Processing...' : 'Deleting invoice...'}
            />

            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </div>
    )
}
