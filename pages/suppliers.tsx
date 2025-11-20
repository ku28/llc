import { useState, useEffect } from 'react'
import LoadingModal from '../components/LoadingModal'
import ToastNotification from '../components/ToastNotification'
import CustomSelect from '../components/CustomSelect'
import { useToast } from '../hooks/useToast'
import { useDataCache } from '../contexts/DataCacheContext'
import RefreshButton from '../components/RefreshButton'
import * as XLSX from 'xlsx'

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([])
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
    
    // Set-based state for multi-select
    const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<number>>(new Set())
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    
    // Export and delete state
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; id?: number; deleteMultiple?: boolean; message?: string }>({ open: false })
    const [confirmModalAnimating, setConfirmModalAnimating] = useState(false)
    const [isDeleteMinimized, setIsDeleteMinimized] = useState(false)
    
    // Sorting state
    const [sortField, setSortField] = useState<string>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
    const { getCache, setCache } = useDataCache()

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
        const cachedSuppliers = getCache<any[]>('suppliers')
        if (cachedSuppliers) {
            setSuppliers(Array.isArray(cachedSuppliers) ? cachedSuppliers : [])
            setLoading(false)
            // Still fetch user
            fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
        } else {
            fetchInitialData()
        }
        
        // Cleanup on unmount
        return () => {
            setSuppliers([])
        }
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
        const suppliersData = Array.isArray(data) ? data : []
        setSuppliers(suppliersData)
        setCache('suppliers', suppliersData)
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
        document.body.style.overflow = 'hidden'
        setIsAnimating(false)
        setTimeout(() => setIsAnimating(true), 10)
    }

    async function deleteSupplier(id: number) {
        setConfirmModal({ open: true, id, message: 'Are you sure you want to delete this supplier?' })
        setTimeout(() => setConfirmModalAnimating(true), 10)
    }

    function openBulkDeleteConfirm() {
        setConfirmModal({
            open: true,
            deleteMultiple: true,
            message: `Are you sure you want to delete ${selectedSupplierIds.size} selected supplier(s)? This action cannot be undone.`
        })
        setTimeout(() => setConfirmModalAnimating(true), 10)
    }

    function closeConfirmModal() {
        setConfirmModalAnimating(false)
        setTimeout(() => setConfirmModal({ open: false }), 300)
    }

    async function handleConfirmDelete(id?: number) {
        if (!id && !confirmModal.deleteMultiple) {
            closeConfirmModal()
            return
        }

        closeConfirmModal()
        setDeleting(true)
        try {
            if (confirmModal.deleteMultiple) {
                const idsArray = Array.from(selectedSupplierIds)
                setDeleteProgress({ current: 0, total: idsArray.length })
                
                const CHUNK_SIZE = 10
                for (let i = 0; i < idsArray.length; i += CHUNK_SIZE) {
                    const chunk = idsArray.slice(i, i + CHUNK_SIZE)
                    await Promise.all(
                        chunk.map(supplierId =>
                            fetch(`/api/suppliers?id=${supplierId}`, { method: 'DELETE' })
                        )
                    )
                    const completed = Math.min(i + CHUNK_SIZE, idsArray.length)
                    setDeleteProgress({ current: completed, total: idsArray.length })
                }
                
                showSuccess(`Successfully deleted ${idsArray.length} supplier(s)!`)
                setSelectedSupplierIds(new Set())
            } else if (id) {
                const response = await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' })
                if (response.ok) {
                    showSuccess('Supplier deleted successfully!')
                } else {
                    showError('Failed to delete supplier')
                }
            }
            await fetchSuppliers()
        } catch (error) {
            console.error('Error deleting supplier(s):', error)
            showError('Failed to delete supplier(s)')
        } finally {
            setDeleting(false)
            setDeleteProgress({ current: 0, total: 0 })
            setIsDeleteMinimized(false)
        }
    }

    function toggleSelectSupplier(id: number) {
        const newSelected = new Set(selectedSupplierIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedSupplierIds(newSelected)
    }

    function toggleSelectAll() {
        const filtered = getFilteredAndSortedSuppliers()
        if (selectedSupplierIds.size === filtered.length && filtered.length > 0) {
            setSelectedSupplierIds(new Set())
        } else {
            setSelectedSupplierIds(new Set(filtered.map(s => s.id)))
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

    function getFilteredAndSortedSuppliers() {
        let filtered = suppliers.filter(s => {
            const matchesSearch = searchQuery ?
                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
                : true

            const matchesStatus = filterStatus ? s.status === filterStatus : true

            return matchesSearch && matchesStatus
        })

        // Sort
        filtered.sort((a, b) => {
            let aVal = a[sortField]
            let bVal = b[sortField]

            // Handle different data types
            if (typeof aVal === 'string') aVal = aVal.toLowerCase()
            if (typeof bVal === 'string') bVal = bVal.toLowerCase()

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
            return 0
        })

        return filtered
    }

    // Export functions
    function exportData(format: 'csv' | 'json' | 'xlsx') {
        const dataToExport = selectedSupplierIds.size > 0
            ? suppliers.filter(s => selectedSupplierIds.has(s.id))
            : getFilteredAndSortedSuppliers()

        const exportData = dataToExport.map(s => ({
            'Supplier Name': s.name || '',
            'Contact Person': s.contactPerson || '',
            'Email': s.email || '',
            'Phone': s.phone || '',
            'Address': s.address || '',
            'City': s.city || '',
            'State': s.state || '',
            'Pincode': s.pincode || '',
            'GSTIN': s.gstin || '',
            'Payment Terms': s.paymentTerms || '',
            'Credit Limit': s.creditLimit || 0,
            'Status': s.status || '',
            'Notes': s.notes || ''
        }))

        if (format === 'csv') {
            exportToCSV(exportData)
        } else if (format === 'json') {
            exportToJSON(exportData)
        } else if (format === 'xlsx') {
            exportToExcel(exportData)
        }

        setShowExportDropdown(false)
        showSuccess(`Exported ${exportData.length} supplier(s) as ${format.toUpperCase()}!`)
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
        link.download = `suppliers_${new Date().toISOString().split('T')[0]}.csv`
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
        link.download = `suppliers_${new Date().toISOString().split('T')[0]}.json`
        link.click()
    }

    const exportToExcel = (data: any[]) => {
        if (data.length === 0) {
            showError('No data to export')
            return
        }

        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers')
        
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

        XLSX.writeFile(workbook, `suppliers_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    function toggleRowExpansion(id: number) {
        toggleExpandRow(id)
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
        document.body.style.overflow = 'unset'
        setTimeout(() => {
            setIsModalOpen(false)
            setForm(emptyForm)
            setEditingId(null)
        }, 200)
    }

    function cancelEdit() {
        closeModal()
    }

    const filteredSuppliers = getFilteredAndSortedSuppliers()

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
                        Supplier Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage supplier relationships and contacts</p>
                </div>
                <div className="flex items-center gap-3">
                    <RefreshButton onRefresh={fetchSuppliers} />
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
                                {selectedSupplierIds.size > 0 ? `Export (${selectedSupplierIds.size})` : 'Export All'}
                            </button>

                            {showExportDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden">
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
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg shadow-lg flex items-center gap-2 transition-all duration-200 font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Supplier
                    </button>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedSupplierIds.size > 0 && (
                <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/30 dark:border-emerald-700/30 rounded-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                            {selectedSupplierIds.size} supplier(s) selected
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedSupplierIds(new Set())}
                                className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600"
                            >
                                Clear Selection
                            </button>
                            <button
                                onClick={openBulkDeleteConfirm}
                                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Selected
                            </button>
                        </div>
                    </div>
                </div>
            )}

                {/* Search and Filter Bar */}
                <div className="card mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex-1 relative min-w-[250px]">
                            <input
                                type="text"
                                placeholder="🔍 Search suppliers by name, contact, phone, or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/20 backdrop-blur-sm max-w-4xl w-full max-h-[90vh]">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                            {/* Header */}
                            <div className="relative flex items-center justify-between px-6 py-4 border-b border-emerald-200/30 dark:border-emerald-700/30">
                                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
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
                                            <h3 className="text-lg font-semibold mb-4 text-emerald-600 dark:text-emerald-400">Basic Information</h3>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Supplier Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={form.name}
                                                onChange={(e) => setForm({...form, name: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Enter supplier name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Contact Person</label>
                                            <input
                                                type="text"
                                                value={form.contactPerson}
                                                onChange={(e) => setForm({...form, contactPerson: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="Contact person name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Email</label>
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={(e) => setForm({...form, email: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="supplier@example.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Phone</label>
                                            <input
                                                type="tel"
                                                value={form.phone}
                                                onChange={(e) => setForm({...form, phone: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>

                                        {/* Address Information */}
                                        <div className="md:col-span-2 mt-4">
                                            <h3 className="text-lg font-semibold mb-4 text-emerald-600 dark:text-emerald-400">Address</h3>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Street Address</label>
                                            <textarea
                                                value={form.address}
                                                onChange={(e) => setForm({...form, address: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
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
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="City"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">State</label>
                                            <input
                                                type="text"
                                                value={form.state}
                                                onChange={(e) => setForm({...form, state: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="State"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Pincode</label>
                                            <input
                                                type="text"
                                                value={form.pincode}
                                                onChange={(e) => setForm({...form, pincode: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="123456"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">GSTIN</label>
                                            <input
                                                type="text"
                                                value={form.gstin}
                                                onChange={(e) => setForm({...form, gstin: e.target.value})}
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="22AAAAA0000A1Z5"
                                            />
                                        </div>

                                        {/* Payment Terms */}
                                        <div className="md:col-span-2 mt-4">
                                            <h3 className="text-lg font-semibold mb-4 text-emerald-600 dark:text-emerald-400">Payment & Credit</h3>
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
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
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
                                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
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
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                <div className="relative rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                    <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={selectedSupplierIds.size === filteredSuppliers.length && filteredSuppliers.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <span>Suppliers</span>
                        </h3>
                        <span className="badge">
                            {filteredSuppliers.length} of {suppliers.length} suppliers
                        </span>
                    </div>

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
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={selectedSupplierIds.has(s.id)}
                                                onChange={() => toggleSelectSupplier(s.id)}
                                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 flex-shrink-0"
                                            />
                                            
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
                                                    className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded"
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

            {/* Confirm Delete Modal */}
            {confirmModal.open && (
                <div className={`fixed inset-0 bg-black transition-opacity duration-300 ${confirmModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`} style={{ zIndex: 9999 }} onClick={closeConfirmModal}>
                    <div className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-300 ${confirmModalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ zIndex: 10000 }}>
                        <div className="relative overflow-hidden rounded-2xl border border-red-200/30 dark:border-red-700/30 bg-gradient-to-br from-white via-red-50/30 to-orange-50/20 dark:from-gray-900 dark:via-red-950/20 dark:to-gray-900 shadow-lg shadow-red-500/20 backdrop-blur-sm max-w-md w-full" onClick={e => e.stopPropagation()}>
                            <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 via-transparent to-orange-500/5 pointer-events-none"></div>
                            <div className="relative p-6">
                                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400">
                                    Confirm Delete
                                </h3>
                                <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
                                    {confirmModal.message}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={closeConfirmModal}
                                        className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => handleConfirmDelete(confirmModal.id)} 
                                        disabled={deleting} 
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium shadow-md"
                                    >
                                        {deleting && (
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Progress Modal (for bulk deletes) */}
            {deleting && deleteProgress.total > 0 && !isDeleteMinimized && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-md w-full">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Deleting Suppliers</h3>
                                <button
                                    onClick={() => setIsDeleteMinimized(true)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-center mb-6">
                                <svg className="w-16 h-16 mx-auto text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            
                            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2 text-center">
                                {deleteProgress.current} / {deleteProgress.total}
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                                {Math.round((deleteProgress.current / deleteProgress.total) * 100)}% Complete
                            </p>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                                <div 
                                    className="bg-red-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                                    style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                                >
                                    <span className="text-xs text-white font-medium">
                                        {deleteProgress.current > 0 && `${Math.round((deleteProgress.current / deleteProgress.total) * 100)}%`}
                                    </span>
                                </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 text-center">
                                Please wait, deleting supplier {deleteProgress.current} of {deleteProgress.total}...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Modal (for single deletes or when minimized) */}
            {((deleting && deleteProgress.total === 0) || (deleting && isDeleteMinimized)) && (
                <LoadingModal isOpen={true} message="Deleting supplier..." />
            )}

            <LoadingModal 
                isOpen={loading || submitting} 
                message={loading ? 'Loading suppliers...' : 'Saving supplier...'}
            />

            <ToastNotification toasts={toasts} removeToast={removeToast} />
            </div>
        </div>
    )
}
