import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import CustomSelect from '../components/CustomSelect'
import ConfirmModal from '../components/ConfirmModal'
import LoadingModal from '../components/LoadingModal'
import ImportProductsModal from '../components/ImportProductsModal'
import ToastNotification from '../components/ToastNotification'
import { useToast } from '../hooks/useToast'
import { requireStaffOrAbove } from '../lib/withAuth'
import { useImportContext } from '../contexts/ImportContext'

function ProductsPage() {
    const [items, setItems] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'name' | 'price' | 'quantity'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [showSortDropdown, setShowSortDropdown] = useState(false)
    const [loading, setLoading] = useState(true)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set())
    const [showDeleteSelectedConfirm, setShowDeleteSelectedConfirm] = useState(false)
    const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
    const [isDeleteMinimized, setIsDeleteMinimized] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [generatingPO, setGeneratingPO] = useState(false)
    const [showLowStockModal, setShowLowStockModal] = useState(false)
    const [lowStockModalAnimating, setLowStockModalAnimating] = useState(false)
    const [selectedSupplier, setSelectedSupplier] = useState('')
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [sendingEmail, setSendingEmail] = useState(false)
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
    const { addTask, updateTask } = useImportContext()
    
    // Filter states
    const [filterCategory, setFilterCategory] = useState<string>('')
    const [filterStockStatus, setFilterStockStatus] = useState<string>('')
    const [filterPriceRange, setFilterPriceRange] = useState<string>('')
    const [showFilters, setShowFilters] = useState(false)
    
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
        setLoading(true)
        Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetch('/api/categories').then(r => r.json()),
            fetch('/api/suppliers').then(r => r.json())
        ]).then(([productsData, categoriesData, suppliersData]) => {
            setItems(Array.isArray(productsData) ? productsData : [])
            setCategories(Array.isArray(categoriesData) ? categoriesData : [])
            setSuppliers(Array.isArray(suppliersData) ? suppliersData.filter((s: any) => s.status === 'active') : [])
            setLoading(false)
        }).catch(() => setLoading(false))
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
        setDeleteId(id)
        setShowDeleteConfirm(true)
    }

    function toggleProductSelection(id: number) {
        const newSelected = new Set(selectedProductIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedProductIds(newSelected)
    }

    function toggleSelectAll() {
        const filteredProducts = getFilteredProducts()
        if (selectedProductIds.size === filteredProducts.length) {
            setSelectedProductIds(new Set())
        } else {
            setSelectedProductIds(new Set(filteredProducts.map((p: any) => p.id)))
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

    async function deleteSelectedProducts() {
        if (selectedProductIds.size === 0) {
            showError('Please select products to delete')
            return
        }
        setShowDeleteSelectedConfirm(true)
    }

    async function confirmDeleteSelected() {
        const idsToDelete = Array.from(selectedProductIds)
        const total = idsToDelete.length

        setShowDeleteSelectedConfirm(false)

        // Initialize progress
        setDeleteProgress({ current: 0, total })

        // Create task in global context
        const id = addTask({
            type: 'products',
            operation: 'delete',
            status: 'deleting',
            progress: { current: 0, total }
        })
        setDeleteTaskId(id)

        const CHUNK_SIZE = 10
        let deletedCount = 0

        try {
            // Process in chunks
            for (let i = 0; i < idsToDelete.length; i += CHUNK_SIZE) {
                const chunk = idsToDelete.slice(i, i + CHUNK_SIZE)
                
                // Delete chunk
                await Promise.all(chunk.map(productId =>
                    fetch('/api/products', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: productId })
                    })
                ))

                deletedCount += chunk.length
                setDeleteProgress({ current: deletedCount, total })

                // Update task progress
                updateTask(id, {
                    progress: { current: deletedCount, total }
                })

                // Small delay between chunks for better UX
                if (i + CHUNK_SIZE < idsToDelete.length) {
                    await new Promise(resolve => setTimeout(resolve, 100))
                }
            }

            // Refresh data
            setItems(await (await fetch('/api/products')).json())
            setSelectedProductIds(new Set())
            
            // Update task to success
            updateTask(id, {
                status: 'success',
                summary: { success: total, errors: 0 },
                endTime: Date.now()
            })
            
            showSuccess(`Deleted ${total} product(s) successfully`)
        } catch (error) {
            console.error('Delete error:', error)
            
            // Update task to error
            updateTask(id, {
                status: 'error',
                error: 'Failed to delete products',
                endTime: Date.now()
            })
            
            showError('Failed to delete products')
        } finally {
            setDeleteProgress({ current: 0, total: 0 })
            setDeleteTaskId(null)
            setIsDeleteMinimized(false)
        }
    }

    function getFilteredProducts() {
        let filtered = items.filter((product: any) => {
            // Search filter
            if (searchQuery && !product.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false
            }
            // Category filter
            if (filterCategory && String(product.categoryId) !== filterCategory) {
                return false
            }
            // Stock status filter
            if (filterStockStatus) {
                const qty = product.quantity || 0
                const reorderLevel = product.category?.reorderLevel || 10
                if (filterStockStatus === 'low' && qty >= reorderLevel) return false
                if (filterStockStatus === 'out' && qty > 0) return false
                if (filterStockStatus === 'in' && qty <= 0) return false
            }
            // Price range filter
            if (filterPriceRange) {
                const price = product.priceCents || 0
                if (filterPriceRange === 'low' && price >= 5000) return false
                if (filterPriceRange === 'medium' && (price < 5000 || price >= 20000)) return false
                if (filterPriceRange === 'high' && price < 20000) return false
            }
            return true
        })

        // Sort products
        filtered.sort((a, b) => {
            let compareResult = 0
            
            if (sortBy === 'name') {
                compareResult = (a.name || '').localeCompare(b.name || '')
            } else if (sortBy === 'price') {
                compareResult = (a.priceCents || 0) - (b.priceCents || 0)
            } else if (sortBy === 'quantity') {
                compareResult = (a.quantity || 0) - (b.quantity || 0)
            }
            
            return sortOrder === 'asc' ? compareResult : -compareResult
        })

        return filtered
    }

    async function autoGeneratePurchaseOrder() {
        // Get low stock products
        const lowStockProducts = items.filter((product: any) => {
            const qty = product.quantity || 0
            const reorderLevel = product.category?.reorderLevel || 10
            return qty < reorderLevel
        })

        if (lowStockProducts.length === 0) {
            showInfo('No low stock products found')
            return
        }

        // Show modal for supplier selection
        setShowLowStockModal(true)
        setLowStockModalAnimating(false)
        setTimeout(() => setLowStockModalAnimating(true), 10)
    }

    async function createPurchaseOrderWithSupplier() {
        if (!selectedSupplier) {
            showError('Please select a supplier')
            return
        }

        setGeneratingPO(true)
        try {
            // Get low stock products
            const lowStockProducts = items.filter((product: any) => {
                const qty = product.quantity || 0
                const reorderLevel = product.category?.reorderLevel || 10
                return qty < reorderLevel
            })

            // Generate PO Number
            const lastPOResponse = await fetch('/api/purchase-orders')
            const existingPOs = await lastPOResponse.json()
            const poNumber = `PO-${String((existingPOs.length || 0) + 1).padStart(6, '0')}`

            // Create purchase order items
            let subtotal = 0
            const orderItems = lowStockProducts.map((product: any) => {
                const reorderLevel = product.category?.reorderLevel || 10
                const currentQty = product.quantity || 0
                
                // Order enough to reach 2x the reorder level
                const quantityToOrder = Math.max(reorderLevel * 2 - currentQty, reorderLevel)
                
                const unitPrice = product.purchasePriceCents || product.priceCents || 0
                const itemTotal = quantityToOrder * unitPrice
                
                subtotal += itemTotal

                return {
                    productId: product.id,
                    quantity: quantityToOrder,
                    unitPrice: unitPrice,
                    taxRate: 0,
                    discount: 0
                }
            })

            const totalAmount = Math.round(subtotal)

            // Create the purchase order
            const response = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId: Number(selectedSupplier),
                    orderDate: new Date().toISOString(),
                    expectedDate: null,
                    items: orderItems,
                    notes: `Auto-generated purchase order for ${lowStockProducts.length} low stock item(s)`,
                    shippingCost: 0,
                    discount: 0
                })
            })

            if (response.ok) {
                const purchaseOrder = await response.json()
                
                // Send email to supplier
                setSendingEmail(true)
                try {
                    const emailResponse = await fetch('/api/purchase-orders/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ purchaseOrderId: purchaseOrder.id })
                    })

                    if (emailResponse.ok) {
                        const emailData = await emailResponse.json()
                        showSuccess(`✅ Purchase order ${purchaseOrder.poNumber} created and sent to supplier!`)
                    } else {
                        const emailError = await emailResponse.json()
                        showSuccess(`✅ Purchase order ${purchaseOrder.poNumber} created!`)
                        showError(`⚠️ Email failed: ${emailError.error}`)
                    }
                } catch (emailError) {
                    showSuccess(`✅ Purchase order ${purchaseOrder.poNumber} created!`)
                    showError('⚠️ Failed to send email to supplier')
                } finally {
                    setSendingEmail(false)
                }

                // Close modal and reset
                setLowStockModalAnimating(false)
                setTimeout(() => {
                    setShowLowStockModal(false)
                    setSelectedSupplier('')
                }, 300)
            } else {
                const error = await response.json()
                showError('❌ Error: ' + (error.error || 'Failed to generate purchase order'))
            }
        } catch (error) {
            console.error('Error generating purchase order:', error)
            showError('❌ Failed to generate purchase order')
        } finally {
            setGeneratingPO(false)
        }
    }

    function closeLowStockModal() {
        setLowStockModalAnimating(false)
        setTimeout(() => {
            setShowLowStockModal(false)
            setSelectedSupplier('')
        }, 300)
    }

    async function confirmDelete() {
        if (deleteId === null) return
        try {
            const response = await fetch('/api/products', { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ id: deleteId }) 
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
        } finally {
            setShowDeleteConfirm(false)
            setDeleteId(null)
        }
    }

    function exportData(format: 'csv' | 'json' | 'xlsx') {
        try {
            if (selectedProductIds.size === 0) {
                showError('Please select at least one product to export')
                return
            }

            const selectedProducts = items.filter((product: any) => selectedProductIds.has(product.id))

            const dataToExport = selectedProducts.map((p: any) => ({
                'name': p.name || '',
                'priceCents': p.priceCents || 0,
                'quantity': p.quantity || 0,
                'purchasePriceCents': p.purchasePriceCents || 0,
                'unit': p.unit || ''
            }))

            const timestamp = new Date().toISOString().split('T')[0]
            
            if (format === 'json') {
                const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `products_${timestamp}.json`
                a.click()
                URL.revokeObjectURL(url)
            } else if (format === 'csv') {
                const headers = Object.keys(dataToExport[0] || {})
                const csvContent = [
                    headers.join(','),
                    ...dataToExport.map(row => 
                        headers.map(header => {
                            const value = row[header as keyof typeof row] || ''
                            return String(value).includes(',') || String(value).includes('"') 
                                ? `"${String(value).replace(/"/g, '""')}"` 
                                : value
                        }).join(',')
                    )
                ].join('\n')
                
                const blob = new Blob([csvContent], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `products_${timestamp}.csv`
                a.click()
                URL.revokeObjectURL(url)
            } else if (format === 'xlsx') {
                const ws = XLSX.utils.json_to_sheet(dataToExport)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Products')
                XLSX.writeFile(wb, `products_${timestamp}.xlsx`)
            }
            
            showSuccess(`${selectedProductIds.size} product(s) exported as ${format.toUpperCase()}`)
            setShowExportDropdown(false)
        } catch (e) {
            console.error(e)
            showError('Failed to export products')
        }
    }

    // Close export dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement
            if (showExportDropdown && !target.closest('.relative')) {
                setShowExportDropdown(false)
            }
            if (showSortDropdown && !target.closest('.relative')) {
                setShowSortDropdown(false)
            }
        }
        if (showExportDropdown || showSortDropdown) {
            document.addEventListener('click', handleClickOutside)
        }
        return () => document.removeEventListener('click', handleClickOutside)
    }, [showExportDropdown, showSortDropdown])

    return (
        <div>
            {/* Delete Progress Modal - Minimizable */}
            {deleteProgress.total > 0 && !isDeleteMinimized && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                        {/* Header with minimize button */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Deleting Products
                            </h3>
                            <button
                                onClick={() => setIsDeleteMinimized(true)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                title="Minimize"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    Deleting Products
                                </h3>
                                <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
                                    {deleteProgress.current} / {deleteProgress.total}
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4 overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                                        style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                                    >
                                        <span className="text-xs font-semibold text-white">
                                            {Math.round((deleteProgress.current / deleteProgress.total) * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                    Please wait, deleting product {deleteProgress.current} of {deleteProgress.total}...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="section-header flex justify-between items-center">
                <h2 className="section-title">Inventory Management</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={autoGeneratePurchaseOrder}
                        disabled={generatingPO}
                        className="btn bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generatingPO ? (
                            <>
                                <svg className="w-4 h-4 mr-2 inline animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Order Low Stock Items
                            </>
                        )}
                    </button>
                    <div className="relative">
                        <button 
                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                            className="btn bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transition-all duration-200 flex items-center gap-2 shadow-lg shadow-green-200 dark:shadow-green-900/50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            <span className="font-semibold">{selectedProductIds.size > 0 ? `Export (${selectedProductIds.size})` : 'Export All'}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showExportDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-green-200 dark:border-green-900 z-50 overflow-hidden">
                                <button
                                    onClick={() => exportData('csv')}
                                    className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                                >
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="font-medium">CSV Format</span>
                                </button>
                                <button
                                    onClick={() => exportData('json')}
                                    className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                                >
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                    <span className="font-medium">JSON Format</span>
                                </button>
                                <button
                                    onClick={() => exportData('xlsx')}
                                    className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300 rounded-b-lg"
                                >
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span className="font-medium">Excel Format</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => setShowImportModal(true)} 
                        className="btn bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200 dark:shadow-green-900/50 transition-all duration-200 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="font-semibold">Import</span>
                    </button>
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
            </div>

            {/* Stock Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{items.length}</p>
                        </div>
                        <div className="p-3 bg-blue-200 dark:bg-blue-800/50 rounded-full">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">In Stock</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {items.filter(p => (p.quantity || 0) >= (p.category?.reorderLevel || 10)).length}
                            </p>
                        </div>
                        <div className="p-3 bg-green-200 dark:bg-green-800/50 rounded-full">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {items.filter(p => {
                                    const qty = p.quantity || 0
                                    const reorder = p.category?.reorderLevel || 10
                                    return qty < reorder && qty > 0
                                }).length}
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-200 dark:bg-yellow-800/50 rounded-full">
                            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {items.filter(p => (p.quantity || 0) <= 0).length}
                            </p>
                        </div>
                        <div className="p-3 bg-red-200 dark:bg-red-800/50 rounded-full">
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="card mb-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="🔍 Search products by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                        <svg className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    
                    {/* Sort Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                            className="px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-400 dark:hover:border-green-600 transition-all duration-200 flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md"
                        >
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                            <span>Sort</span>
                        </button>
                        {showSortDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-900">
                                    <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
                                        Sort By
                                    </p>
                                </div>
                                <div className="p-2">
                                    <button
                                        onClick={() => { setSortBy('name'); setShowSortDropdown(false) }}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                                            sortBy === 'name'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <svg className={`w-4 h-4 ${sortBy === 'name' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                        </svg>
                                        <span className="font-medium">Name</span>
                                    </button>
                                    <button
                                        onClick={() => { setSortBy('price'); setShowSortDropdown(false) }}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                                            sortBy === 'price'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <svg className={`w-4 h-4 ${sortBy === 'price' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">Price</span>
                                    </button>
                                    <button
                                        onClick={() => { setSortBy('quantity'); setShowSortDropdown(false) }}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                                            sortBy === 'quantity'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <svg className={`w-4 h-4 ${sortBy === 'quantity' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                        <span className="font-medium">Quantity</span>
                                    </button>
                                </div>
                                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">Order</div>
                                    <button
                                        onClick={() => { setSortOrder('asc'); setShowSortDropdown(false) }}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                                            sortOrder === 'asc'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <svg className={`w-4 h-4 ${sortOrder === 'asc' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                        <span className="font-medium">Ascending</span>
                                    </button>
                                    <button
                                        onClick={() => { setSortOrder('desc'); setShowSortDropdown(false) }}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                                            sortOrder === 'desc'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        <span className="font-medium">Descending</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filters
                    </button>
                    {(searchQuery || filterCategory || filterStockStatus || filterPriceRange) && (
                        <button
                            onClick={() => {
                                setSearchQuery('')
                                setFilterCategory('')
                                setFilterStockStatus('')
                                setFilterPriceRange('')
                            }}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="border-t dark:border-gray-700 pt-4 mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Category Filter */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Category</label>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Stock Status Filter */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Stock Status</label>
                                <select
                                    value={filterStockStatus}
                                    onChange={(e) => setFilterStockStatus(e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">All Stock Levels</option>
                                    <option value="in-stock">In Stock</option>
                                    <option value="low-stock">Low Stock (Below Threshold)</option>
                                    <option value="out-of-stock">Out of Stock</option>
                                </select>
                            </div>

                            {/* Price Range Filter */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Price Range</label>
                                <select
                                    value={filterPriceRange}
                                    onChange={(e) => setFilterPriceRange(e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">All Prices</option>
                                    <option value="0-100">₹0 - ₹100</option>
                                    <option value="100-500">₹100 - ₹500</option>
                                    <option value="500-1000">₹500 - ₹1,000</option>
                                    <option value="1000-5000">₹1,000 - ₹5,000</option>
                                    <option value="5000+">₹5,000+</option>
                                </select>
                            </div>
                        </div>

                        {/* Active Filters Display */}
                        {(filterCategory || filterStockStatus || filterPriceRange) && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="text-sm font-medium">Active Filters:</span>
                                {filterCategory && (
                                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center gap-2">
                                        {categories.find(c => c.id === Number(filterCategory))?.name}
                                        <button onClick={() => setFilterCategory('')} className="hover:text-blue-600">×</button>
                                    </span>
                                )}
                                {filterStockStatus && (
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm flex items-center gap-2">
                                        {filterStockStatus === 'in-stock' ? 'In Stock' : filterStockStatus === 'low-stock' ? 'Low Stock' : 'Out of Stock'}
                                        <button onClick={() => setFilterStockStatus('')} className="hover:text-green-600">×</button>
                                    </span>
                                )}
                                {filterPriceRange && (
                                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm flex items-center gap-2">
                                        {filterPriceRange === '5000+' ? '₹5,000+' : `₹${filterPriceRange.replace('-', ' - ₹')}`}
                                        <button onClick={() => setFilterPriceRange('')} className="hover:text-purple-600">×</button>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
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
                    <span className="flex items-center gap-3">
                        <label className="relative group/checkbox cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={getFilteredProducts().length > 0 && selectedProductIds.size === getFilteredProducts().length}
                                onChange={toggleSelectAll}
                                className="peer sr-only"
                            />
                            <div className="w-6 h-6 border-2 border-green-400 dark:border-green-600 rounded-md bg-white dark:bg-gray-700 peer-checked:bg-gradient-to-br peer-checked:from-green-500 peer-checked:to-emerald-600 peer-checked:border-green-500 transition-all duration-200 flex items-center justify-center shadow-sm peer-checked:shadow-lg peer-checked:shadow-green-500/50 group-hover/checkbox:border-green-500 group-hover/checkbox:scale-110">
                                <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="absolute inset-0 rounded-md bg-green-400 opacity-0 peer-checked:opacity-20 blur-md transition-opacity duration-200 pointer-events-none"></div>
                        </label>
                        <span className="font-bold text-gray-900 dark:text-gray-100">Products Inventory {selectedProductIds.size > 0 && <span className="px-2 py-0.5 ml-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">({selectedProductIds.size} selected)</span>}</span>
                    </span>
                    <span className="badge">{getFilteredProducts().length} products</span>
                </h3>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-muted">Loading products...</p>
                    </div>
                ) : getFilteredProducts().length === 0 ? (
                    <div className="text-center py-12 text-muted">
                        <p className="text-lg mb-2">No products found</p>
                        <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {getFilteredProducts()
                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                .map(p => {
                                    const isExpanded = expandedRows.has(p.id)
                                    const qty = p.quantity || 0
                                    const reorderLevel = p.category?.reorderLevel || 10
                                    const isLowStock = qty < reorderLevel && qty > 0
                                    const isOutOfStock = qty <= 0
                                    
                                    return (
                                        <div key={p.id} className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${selectedProductIds.has(p.id) ? 'ring-2 ring-green-500 shadow-xl shadow-green-100 dark:shadow-green-900/30 bg-gradient-to-r from-green-50/30 to-emerald-50/30 dark:from-gray-800 dark:to-gray-800' : ''}`}>
                                            {/* Summary Row */}
                                            <div className="bg-gray-50 dark:bg-gray-800 p-3 flex items-center gap-3">
                                                {/* Checkbox */}
                                                <div className="flex-shrink-0">
                                                    <label className="relative group/checkbox cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProductIds.has(p.id)}
                                                            onChange={() => toggleProductSelection(p.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="peer sr-only"
                                                        />
                                                        <div className="w-6 h-6 border-2 border-green-400 dark:border-green-600 rounded-md bg-white dark:bg-gray-700 peer-checked:bg-gradient-to-br peer-checked:from-green-500 peer-checked:to-emerald-600 peer-checked:border-green-500 transition-all duration-200 flex items-center justify-center shadow-sm peer-checked:shadow-lg peer-checked:shadow-green-500/50 group-hover/checkbox:border-green-500 group-hover/checkbox:scale-110">
                                                            <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                        <div className="absolute inset-0 rounded-md bg-green-400 opacity-0 peer-checked:opacity-20 blur-md transition-opacity duration-200 pointer-events-none"></div>
                                                    </label>
                                                </div>
                                                
                                                {/* Product Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-sm">{p.name}</div>
                                                    <div className="text-xs text-muted mt-0.5">
                                                        {p.category && <span className="mr-2">📦 {p.category.name}</span>}
                                                        <span className="mr-2">Unit: {p.unit || 'N/A'}</span>
                                                        <span>₹{(p.priceCents || 0).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Stock Status Badge */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {isOutOfStock && (
                                                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded font-semibold">
                                                            OUT OF STOCK
                                                        </span>
                                                    )}
                                                    {isLowStock && (
                                                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded font-semibold">
                                                            LOW STOCK
                                                        </span>
                                                    )}
                                                    <span className={`text-sm font-semibold ${
                                                        isOutOfStock ? 'text-red-600 dark:text-red-400' :
                                                        isLowStock ? 'text-yellow-600 dark:text-yellow-400' :
                                                        'text-green-600 dark:text-green-400'
                                                    }`}>
                                                        Qty: {Math.max(0, qty).toFixed(0)}
                                                    </span>
                                                </div>
                                                
                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => editProduct(p)}
                                                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                                        title="Edit"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteProduct(p.id)}
                                                        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                                                        title="Delete"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                    <button
                                                        onClick={() => toggleRowExpansion(p.id)}
                                                        className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                                                        title={isExpanded ? "Hide Details" : "View More"}
                                                    >
                                                        {isExpanded ? '▲ Hide' : '▼ View More'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Purchase Price</div>
                                                            <div className="text-sm font-medium">₹{(p.purchasePriceCents || 0).toFixed(2)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Reorder Level</div>
                                                            <div className="text-sm font-medium">{p.category?.reorderLevel || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Total Purchased</div>
                                                            <div className="text-sm font-medium">{(p.totalPurchased || 0).toFixed(0)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Total Sales</div>
                                                            <div className="text-sm font-medium">{(p.totalSales || 0).toFixed(0)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Inventory Value</div>
                                                            <div className="text-sm font-medium">{p.inventoryValue ? `₹${p.inventoryValue.toFixed(2)}` : '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Purchase Value</div>
                                                            <div className="text-sm font-medium">{p.purchaseValue ? `₹${p.purchaseValue.toFixed(2)}` : '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Sales Value</div>
                                                            <div className="text-sm font-medium">{p.salesValue ? `₹${p.salesValue.toFixed(2)}` : '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Actual Inventory</div>
                                                            <div className="text-sm font-medium">{p.actualInventory ? p.actualInventory.toFixed(0) : '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Latest Update</div>
                                                            <div className="text-sm font-medium">{p.latestUpdate ? new Date(p.latestUpdate).toLocaleDateString() : '-'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                        </div>

                        {/* Pagination Controls */}
                        {getFilteredProducts().length > itemsPerPage && (
                            <div className="mt-4 flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Previous
                                </button>
                                <span className="text-sm">
                                    Page {currentPage} of {Math.ceil(getFilteredProducts().length / itemsPerPage)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(getFilteredProducts().length / itemsPerPage), prev + 1))}
                                    disabled={currentPage >= Math.ceil(getFilteredProducts().length / itemsPerPage)}
                                    className="px-4 py-2 bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    Next
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <ConfirmModal
                isOpen={showDeleteSelectedConfirm}
                title="Delete Selected Products"
                message={`Are you sure you want to delete ${selectedProductIds.size} product(s)? This action cannot be undone.`}
                confirmText="Delete All"
                cancelText="Cancel"
                variant="danger"
                onConfirm={confirmDeleteSelected}
                onCancel={() => setShowDeleteSelectedConfirm(false)}
            />

            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Product"
                message="Are you sure you want to delete this product? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowDeleteConfirm(false)
                    setDeleteId(null)
                }}
            />

            <ImportProductsModal 
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportSuccess={() => {
                    setLoading(true)
                    fetch('/api/products').then(r => r.json()).then(productsData => {
                        setItems(Array.isArray(productsData) ? productsData : [])
                        setLoading(false)
                    }).catch(() => setLoading(false))
                }}
            />

            {/* Low Stock Purchase Order Modal */}
            {showLowStockModal && (
                <div className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${lowStockModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`}>
                    <div className={`bg-white dark:bg-gray-900 rounded-lg max-w-3xl w-full shadow-2xl transform transition-all duration-300 ${lowStockModalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Purchase Order</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Low & Out of Stock Items</p>
                            </div>
                            <button
                                onClick={closeLowStockModal}
                                disabled={generatingPO || sendingEmail}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
                            >
                                ×
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto max-h-[70vh] p-6">
                            {/* Low Stock Products List */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Items Requiring Restock ({items.filter((p: any) => (p.quantity || 0) < (p.category?.reorderLevel || 10)).length})
                                </h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {items
                                        .filter((p: any) => (p.quantity || 0) < (p.category?.reorderLevel || 10))
                                        .map((product: any) => {
                                            const currentQty = product.quantity || 0
                                            const reorderLevel = product.category?.reorderLevel || 10
                                            const orderQty = Math.max(reorderLevel * 2 - currentQty, reorderLevel)
                                            const isOutOfStock = currentQty <= 0
                                            
                                            return (
                                                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                                                            {isOutOfStock ? (
                                                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded font-semibold">
                                                                    OUT OF STOCK
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded font-semibold">
                                                                    LOW STOCK
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            Current: <span className={isOutOfStock ? 'text-red-600 font-semibold' : 'text-yellow-600 font-semibold'}>{currentQty}</span> | 
                                                            Reorder Level: {reorderLevel} | 
                                                            Will Order: <span className="text-green-600 font-semibold">{orderQty}</span> {product.unit || 'pcs'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            ₹{((product.purchasePriceCents || product.priceCents || 0) * orderQty).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    }
                                </div>
                            </div>

                            {/* Supplier Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                    Select Supplier *
                                </label>
                                <CustomSelect
                                    value={selectedSupplier}
                                    onChange={(value) => setSelectedSupplier(value)}
                                    options={suppliers.map(s => ({
                                        value: s.id.toString(),
                                        label: `${s.name}${s.email ? ` (${s.email})` : ''}`
                                    }))}
                                    placeholder="Select supplier to send order"
                                    required
                                />
                                {suppliers.length === 0 && (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                        ⚠️ No active suppliers found. Please add a supplier first.
                                    </p>
                                )}
                            </div>

                            {/* Total Summary */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Estimated Total:</span>
                                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        ₹{items
                                            .filter((p: any) => (p.quantity || 0) < (p.category?.reorderLevel || 10))
                                            .reduce((sum: number, p: any) => {
                                                const currentQty = p.quantity || 0
                                                const reorderLevel = p.category?.reorderLevel || 10
                                                const orderQty = Math.max(reorderLevel * 2 - currentQty, reorderLevel)
                                                const price = p.purchasePriceCents || p.priceCents || 0
                                                return sum + (orderQty * price)
                                            }, 0).toFixed(2)
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={closeLowStockModal}
                                disabled={generatingPO || sendingEmail}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createPurchaseOrderWithSupplier}
                                disabled={!selectedSupplier || generatingPO || sendingEmail || suppliers.length === 0}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {generatingPO || sendingEmail ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {sendingEmail ? 'Sending Email...' : 'Creating Order...'}
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Create & Send Order
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <ToastNotification toasts={toasts} removeToast={removeToast} />

            {/* Floating Export Button */}
            {selectedProductIds.size > 0 && (
                <div className="relative">
                    <button
                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                        className="fixed bottom-8 right-40 z-50 group"
                        title={`Export ${selectedProductIds.size} selected product(s)`}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-200"></div>
                            <div className="relative w-14 h-14 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 transform group-hover:scale-110">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                                <span className="absolute -top-1 -right-1 min-w-[24px] h-5 px-1.5 bg-green-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
                                    {selectedProductIds.size}
                                </span>
                            </div>
                        </div>
                    </button>
                    {showExportDropdown && (
                        <div className="fixed bottom-24 right-40 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-green-200 dark:border-green-900 z-50 overflow-hidden">
                            <button
                                onClick={() => exportData('csv')}
                                className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="font-medium">CSV Format</span>
                            </button>
                            <button
                                onClick={() => exportData('json')}
                                className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                <span className="font-medium">JSON Format</span>
                            </button>
                            <button
                                onClick={() => exportData('xlsx')}
                                className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300 rounded-b-lg"
                            >
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">Excel Format</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Delete Selected Button */}
            {selectedProductIds.size > 0 && (
                <button
                    onClick={deleteSelectedProducts}
                    className="fixed bottom-8 right-24 z-50 group"
                    title={`Delete ${selectedProductIds.size} selected product(s)`}
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-200 animate-pulse"></div>
                        <div className="relative w-14 h-14 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 transform group-hover:scale-110">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="absolute -top-1 -right-1 min-w-[24px] h-5 px-1.5 bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
                                {selectedProductIds.size}
                            </span>
                        </div>
                    </div>
                </button>
            )}
        </div>
    )
}

// Protect this page - only staff, doctors, and admins can access
export default requireStaffOrAbove(ProductsPage)
