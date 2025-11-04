import { useState, useEffect } from 'react'
import LoadingModal from '../components/LoadingModal'
import ToastNotification from '../components/ToastNotification'
import CustomSelect from '../components/CustomSelect'
import { useToast } from '../hooks/useToast'

export default function StockTransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [filterProduct, setFilterProduct] = useState('')
    const [filterType, setFilterType] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
    
    const [form, setForm] = useState({
        productId: '',
        transactionType: 'ADJUSTMENT',
        quantity: '',
        unitPrice: '',
        notes: '',
        performedBy: ''
    })
    
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            await Promise.all([
                fetchTransactions(),
                fetchProducts(),
                fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
            ])
        } finally {
            setLoading(false)
        }
    }

    const fetchTransactions = async (productId?: string, type?: string) => {
        let url = '/api/stock-transactions?limit=100'
        if (productId) url += `&productId=${productId}`
        if (type) url += `&type=${type}`
        
        const response = await fetch(url)
        const data = await response.json()
        setTransactions(Array.isArray(data) ? data : [])
    }

    const fetchProducts = async () => {
        const response = await fetch('/api/products/public')
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : [])
    }

    useEffect(() => {
        fetchTransactions(filterProduct, filterType)
    }, [filterProduct, filterType])

    async function handleSubmit(e: any) {
        e.preventDefault()
        setSubmitting(true)
        try {
            const payload = {
                productId: Number(form.productId),
                transactionType: form.transactionType,
                quantity: Number(form.quantity),
                unitPrice: form.unitPrice ? Number(form.unitPrice) : 0,
                notes: form.notes || null,
                performedBy: form.performedBy || user?.name || 'System'
            }
            
            const response = await fetch('/api/stock-transactions', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            })
            
            if (response.ok) {
                await fetchTransactions(filterProduct, filterType)
                await fetchProducts() // Refresh to get updated quantities
                closeModal()
                showSuccess('Inventory movement recorded successfully!')
            } else {
                const error = await response.json()
                showError('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error saving transaction:', error)
            showError('Failed to save transaction')
        } finally {
            setSubmitting(false)
        }
    }

    function closeModal() {
        setIsAnimating(false)
        setTimeout(() => {
            setIsModalOpen(false)
            setForm({
                productId: '',
                transactionType: 'ADJUSTMENT',
                quantity: '',
                unitPrice: '',
                notes: '',
                performedBy: ''
            })
        }, 200)
    }

    function getTransactionIcon(type: string) {
        switch (type) {
            case 'IN': return '📦'
            case 'OUT': return '📤'
            case 'ADJUSTMENT': return '🔧'
            case 'RETURN': return '↩️'
            default: return '📊'
        }
    }

    function getTransactionColor(type: string) {
        switch (type) {
            case 'IN': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            case 'OUT': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            case 'ADJUSTMENT': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
            case 'RETURN': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
            default: return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
        }
    }

    return (
        <div>
            <div className="section-header flex justify-between items-center">
                <h2 className="section-title">Inventory History</h2>
                <button 
                    onClick={() => {
                        setIsModalOpen(true)
                        setIsAnimating(false)
                        setTimeout(() => setIsAnimating(true), 10)
                    }}
                    className="btn btn-primary"
                >
                    + Manual Adjustment
                </button>
            </div>

                {/* Info Card */}
                <div className="card mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <div className="text-3xl">ℹ️</div>
                        <div>
                            <h3 className="font-semibold mb-1 text-blue-900 dark:text-blue-100">About Inventory History</h3>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                This page shows all inventory movements. Transactions are automatically created when you receive purchase orders or create customer invoices. 
                                Use "Manual Adjustment" to correct stock levels, record returns, or make other inventory changes.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="card mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="min-w-[200px]">
                            <CustomSelect
                                value={filterProduct}
                                onChange={(value) => setFilterProduct(value)}
                                options={[
                                    { value: '', label: 'All Products' },
                                    ...products.map(p => ({
                                        value: p.id.toString(),
                                        label: p.name
                                    }))
                                ]}
                                placeholder="All Products"
                            />
                        </div>
                        <div className="min-w-[180px]">
                            <CustomSelect
                                value={filterType}
                                onChange={(value) => setFilterType(value)}
                                options={[
                                    { value: '', label: 'All Types' },
                                    { value: 'IN', label: 'Stock In' },
                                    { value: 'OUT', label: 'Stock Out' },
                                    { value: 'ADJUSTMENT', label: 'Adjustments' },
                                    { value: 'RETURN', label: 'Returns' }
                                ]}
                                placeholder="All Types"
                            />
                        </div>
                        {(filterProduct || filterType) && (
                            <button
                                onClick={() => {
                                    setFilterProduct('')
                                    setFilterType('')
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Manual Adjustment Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manual Stock Adjustment</h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Form Content */}
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Product *</label>
                                        <CustomSelect
                                            value={form.productId}
                                            onChange={(value) => setForm({...form, productId: value})}
                                            options={products.map(p => ({
                                                value: p.id.toString(),
                                                label: `${p.name} (Current: ${p.quantity})`
                                            }))}
                                            placeholder="Select Product"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Transaction Type *</label>
                                        <CustomSelect
                                            value={form.transactionType}
                                            onChange={(value) => setForm({...form, transactionType: value})}
                                            options={[
                                                { value: 'ADJUSTMENT', label: 'Adjustment (Correction)' },
                                                { value: 'IN', label: 'Stock In (Add Stock)' },
                                                { value: 'OUT', label: 'Stock Out (Remove Stock)' },
                                                { value: 'RETURN', label: 'Return (Customer Return)' }
                                            ]}
                                            placeholder="Select transaction type"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Quantity *</label>
                                            <input
                                                type="number"
                                                required
                                                value={form.quantity}
                                                onChange={(e) => setForm({...form, quantity: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="0"
                                                min="0"
                                                step="1"
                                            />
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {form.transactionType === 'IN' || form.transactionType === 'RETURN' 
                                                    ? 'This will be added to current stock'
                                                    : 'This will be subtracted from current stock'}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Unit Price (₹)</label>
                                            <input
                                                type="number"
                                                value={form.unitPrice}
                                                onChange={(e) => setForm({...form, unitPrice: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Performed By</label>
                                        <input
                                            type="text"
                                            value={form.performedBy}
                                            onChange={(e) => setForm({...form, performedBy: e.target.value})}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            placeholder={user?.name || 'System'}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Notes *</label>
                                        <textarea
                                            required
                                            value={form.notes}
                                            onChange={(e) => setForm({...form, notes: e.target.value})}
                                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            rows={3}
                                            placeholder="Reason for this transaction (e.g., 'Damaged goods', 'Stock count correction', 'Customer return')"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                                        Record Transaction
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Transactions Timeline */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                        <span>Transaction History</span>
                        <span className="badge">
                            {transactions.length} movements
                        </span>
                    </h3>

                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted">
                            <p className="text-lg mb-2">
                                {filterProduct || filterType ? 'No transactions match your filters' : 'No transactions yet'}
                            </p>
                            <p className="text-sm">
                                Transactions will appear here when you receive purchase orders or create invoices
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(txn => (
                                <div key={txn.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="text-3xl flex-shrink-0">
                                            {getTransactionIcon(txn.transactionType)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-lg mb-1">
                                                        {txn.product?.name || 'Unknown Product'}
                                                    </h4>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`px-2 py-1 text-xs rounded font-semibold ${getTransactionColor(txn.transactionType)}`}>
                                                            {txn.transactionType}
                                                        </span>
                                                        {txn.referenceType && (
                                                            <span className="text-xs text-muted">
                                                                via {txn.referenceType} #{txn.referenceId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-right flex-shrink-0">
                                                    <div className="text-xs text-muted mb-1">
                                                        {new Date(txn.transactionDate).toLocaleString()}
                                                    </div>
                                                    <div className="text-sm font-medium">
                                                        By: {txn.performedBy || 'System'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Transaction Details */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div>
                                                    <div className="text-xs text-muted mb-1">Quantity</div>
                                                    <div className="font-semibold">
                                                        {txn.transactionType === 'IN' || txn.transactionType === 'RETURN' ? '+' : '-'}
                                                        {txn.quantity}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted mb-1">Unit Price</div>
                                                    <div className="font-semibold">₹{(txn.unitPrice || 0).toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted mb-1">Total Value</div>
                                                    <div className="font-semibold">₹{(txn.totalValue || 0).toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted mb-1">Balance After</div>
                                                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                                                        {txn.balanceQuantity}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {txn.notes && (
                                                <div className="mt-2 text-sm text-muted">
                                                    <strong>Notes:</strong> {txn.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination Controls */}
                            {transactions.length > itemsPerPage && (
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
                                        Page {currentPage} of {Math.ceil(transactions.length / itemsPerPage)}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(transactions.length / itemsPerPage), prev + 1))}
                                        disabled={currentPage === Math.ceil(transactions.length / itemsPerPage)}
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

            <LoadingModal 
                isOpen={loading || submitting} 
                message={loading ? 'Loading transactions...' : 'Recording transaction...'}
            />

            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </div>
    )
}
