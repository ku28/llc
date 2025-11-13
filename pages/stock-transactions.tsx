import { useState, useEffect } from 'react'
import LoadingModal from '../components/LoadingModal'
import ToastNotification from '../components/ToastNotification'
import CustomSelect from '../components/CustomSelect'
import { useToast } from '../hooks/useToast'
import * as XLSX from 'xlsx'

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
    
    // Set-based state for multi-select
    const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<number>>(new Set())
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    
    // Export and sorting state
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [sortField, setSortField] = useState<string>('createdAt')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    
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

    // Selection functions
    function toggleSelectTransaction(id: number) {
        const newSelected = new Set(selectedTransactionIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedTransactionIds(newSelected)
    }

    function toggleSelectAll() {
        const filtered = getFilteredAndSortedTransactions()
        if (selectedTransactionIds.size === filtered.length && filtered.length > 0) {
            setSelectedTransactionIds(new Set())
        } else {
            setSelectedTransactionIds(new Set(filtered.map(t => t.id)))
        }
    }

    function toggleExpandRow(id: number) {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
    }

    function getFilteredAndSortedTransactions() {
        let filtered = transactions

        // Apply filters if needed (filterProduct and filterType are applied server-side via API)
        
        // Sort
        filtered = [...filtered].sort((a, b) => {
            let aVal = a[sortField]
            let bVal = b[sortField]

            // Handle different data types
            if (sortField === 'createdAt') {
                aVal = new Date(aVal).getTime()
                bVal = new Date(bVal).getTime()
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase()
                bVal = bVal?.toLowerCase() || ''
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
            return 0
        })

        return filtered
    }

    // Export functions
    function exportData(format: 'csv' | 'json' | 'xlsx') {
        const dataToExport = selectedTransactionIds.size > 0
            ? transactions.filter(t => selectedTransactionIds.has(t.id))
            : getFilteredAndSortedTransactions()

        const exportData = dataToExport.map(t => {
            const product = products.find(p => p.id === t.productId)
            return {
                'Date': new Date(t.createdAt).toLocaleString(),
                'Product': product?.name || 'Unknown',
                'Type': t.transactionType,
                'Quantity': t.quantity,
                'Unit Price': t.unitPrice || 0,
                'Total Value': (t.quantity * (t.unitPrice || 0)).toFixed(2),
                'Performed By': t.performedBy || 'System',
                'Notes': t.notes || '',
                'Reference': t.referenceType || ''
            }
        })

        if (format === 'csv') {
            exportToCSV(exportData)
        } else if (format === 'json') {
            exportToJSON(exportData)
        } else if (format === 'xlsx') {
            exportToExcel(exportData)
        }

        setShowExportDropdown(false)
        showSuccess(`Exported ${exportData.length} transaction(s) as ${format.toUpperCase()}!`)
    }

    const exportToCSV = (data: any[]) => {
        if (data.length === 0) {
            showError('No data to export')
            return
        }

        const headers = Object.keys(data[0])
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header]?.toString() || ''
                return value.includes(',') ? `"${value}"` : value
            }).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `stock_transactions_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
    }

    const exportToJSON = (data: any[]) => {
        if (data.length === 0) {
            showError('No data to export')
            return
        }

        const jsonContent = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonContent], { type: 'application/json' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `stock_transactions_${new Date().toISOString().split('T')[0]}.json`
        link.click()
    }

    const exportToExcel = (data: any[]) => {
        if (data.length === 0) {
            showError('No data to export')
            return
        }

        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Transactions')
        
        // Auto-size columns
        const maxWidth = 50
        const colWidths = Object.keys(data[0]).map(key => {
            const maxLen = Math.max(
                key.length,
                ...data.map(row => (row[key]?.toString() || '').length)
            )
            return { wch: Math.min(maxLen + 2, maxWidth) }
        })
        worksheet['!cols'] = colWidths

        XLSX.writeFile(workbook, `stock_transactions_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const filteredTransactions = getFilteredAndSortedTransactions()

    return (
        <div>
            <div className="section-header flex justify-between items-center gap-3">
                <h2 className="section-title">Inventory History</h2>
                <div className="flex items-center gap-3">
                    {/* Export Dropdown */}
                    {user && (
                        <div className="relative">
                            <button
                                onClick={() => setShowExportDropdown(!showExportDropdown)}
                                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all duration-200 font-medium"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {selectedTransactionIds.size > 0 ? `Export (${selectedTransactionIds.size})` : 'Export All'}
                            </button>

                            {showExportDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                                    <button
                                        onClick={() => exportData('csv')}
                                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-gray-700"
                                    >
                                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">Export CSV</div>
                                            <div className="text-xs text-gray-500">Comma-separated</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => exportData('json')}
                                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-gray-700"
                                    >
                                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">Export JSON</div>
                                            <div className="text-xs text-gray-500">For developers</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => exportData('xlsx')}
                                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">Export Excel</div>
                                            <div className="text-xs text-gray-500">XLSX format</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={() => {
                            setIsModalOpen(true)
                            setIsAnimating(false)
                            setTimeout(() => setIsAnimating(true), 10)
                        }}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-lg flex items-center gap-2 transition-all duration-200 font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Manual Adjustment
                    </button>
                </div>
            </div>

            {/* Bulk Action Bar (for selection clarity - no delete for history) */}
            {selectedTransactionIds.size > 0 && (
                <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/30 dark:border-emerald-700/30 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                            {selectedTransactionIds.size} transaction(s) selected
                        </span>
                        <button
                            onClick={() => setSelectedTransactionIds(new Set())}
                            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}

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
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={selectedTransactionIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <span>Transaction History</span>
                        </h3>
                        <span className="badge">
                            {filteredTransactions.length} movements
                        </span>
                    </div>

                    {filteredTransactions.length === 0 ? (
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
                            {filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(txn => (
                                <div key={txn.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={selectedTransactionIds.has(txn.id)}
                                            onChange={() => toggleSelectTransaction(txn.id)}
                                            className="w-4 h-4 mt-1 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 flex-shrink-0"
                                        />
                                        
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
