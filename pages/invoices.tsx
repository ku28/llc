import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ConfirmModal from '../components/ConfirmModal'
import LoadingModal from '../components/LoadingModal'

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
        fetchInvoices()
        fetchPatients()
        fetchProducts()
        fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
    }, [])

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
        try {
            const validItems = form.items.filter(item => 
                (item.productId || item.description) && item.quantity && item.unitPrice
            )

            if (validItems.length === 0) {
                alert('Please add at least one item to the invoice')
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
                alert('Invoice created successfully!')
            } else {
                const error = await response.json()
                alert('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error saving invoice:', error)
            alert('Failed to save invoice')
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
        try {
            const response = await fetch(`/api/customer-invoices?id=${deleteId}`, { method: 'DELETE' })
            if (response.ok) {
                await fetchInvoices()
                alert('Invoice deleted!')
            } else {
                alert('Failed to delete invoice')
            }
        } catch (error) {
            console.error('Error deleting:', error)
            alert('Failed to delete invoice')
        } finally {
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
                alert('Payment recorded successfully!')
            } else {
                const error = await response.json()
                alert('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error recording payment:', error)
            alert('Failed to record payment')
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
        <Layout>
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
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        >
                            <option value="">All Status</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partially Paid</option>
                            <option value="paid">Paid</option>
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
                                                <span className={`px-2 py-1 text-xs rounded ${
                                                    inv.status === 'paid' 
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

                {/* Payment Modal - simplified */}
                {isPaymentModalOpen && paymentInvoice && (
                    <div 
                        className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                        onClick={closePaymentModal}
                    >
                        <div 
                            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center rounded-t-lg">
                                <div>
                                    <h3 className="text-xl font-semibold">Record Payment</h3>
                                    <p className="text-sm text-muted">Invoice: {paymentInvoice.invoiceNumber}</p>
                                </div>
                                <button onClick={closePaymentModal} className="text-2xl">×</button>
                            </div>

                            <form onSubmit={handlePayment} className="p-6">
                                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex justify-between mb-2">
                                        <span>Balance Due:</span>
                                        <span className="font-bold text-red-600">₹{(paymentInvoice.balanceAmount || 0).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
                                        <input
                                            type="number"
                                            required
                                            value={paymentForm.amount}
                                            onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                                            className="input-field"
                                            max={paymentInvoice.balanceAmount}
                                            step="0.01"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Method *</label>
                                        <select
                                            required
                                            value={paymentForm.paymentMethod}
                                            onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
                                            className="input-field"
                                        >
                                            <option value="CASH">Cash</option>
                                            <option value="CARD">Card</option>
                                            <option value="UPI">UPI</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                            <option value="CHEQUE">Cheque</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={closePaymentModal} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" disabled={!user} className="btn btn-primary">Record Payment</button>
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
            </div>
        </Layout>
    )
}
