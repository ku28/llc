import { useState, useEffect } from 'react'
import CustomSelect from '../components/CustomSelect'
import ConfirmModal from '../components/ConfirmModal'
import LoadingModal from '../components/LoadingModal'
import ImportProductsModal from '../components/ImportProductsModal'
import ToastNotification from '../components/ToastNotification'
import { useToast } from '../hooks/useToast'
import { requireStaffOrAbove } from '../lib/withAuth'

function ProductsPage() {
    const [items, setItems] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [showImportModal, setShowImportModal] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [generatingPO, setGeneratingPO] = useState(false)
    const [showLowStockModal, setShowLowStockModal] = useState(false)
    const [lowStockModalAnimating, setLowStockModalAnimating] = useState(false)
    const [selectedSupplier, setSelectedSupplier] = useState('')
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [sendingEmail, setSendingEmail] = useState(false)
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
    
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

    return (
        <div>
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
                    <button 
                        onClick={() => setShowImportModal(true)} 
                        className="btn bg-green-600 hover:bg-green-700 text-white"
                    >
                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Import Products
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
                            <span>Products Inventory</span>
                            <span className="badge">
                                {(() => {
                                    // Apply same filtering logic for count
                                    return items.filter(p => {
                                        if (searchQuery) {
                                            const name = (p.name || '').toLowerCase()
                                            if (!name.includes(searchQuery.toLowerCase())) return false
                                        }
                                        if (filterCategory && p.categoryId !== Number(filterCategory)) return false
                                        if (filterStockStatus) {
                                            const quantity = p.quantity || 0
                                            const threshold = p.category?.reorderLevel || 0
                                            if (filterStockStatus === 'in-stock' && quantity <= threshold) return false
                                            if (filterStockStatus === 'low-stock' && (quantity > threshold || quantity === 0)) return false
                                            if (filterStockStatus === 'out-of-stock' && quantity !== 0) return false
                                        }
                                        if (filterPriceRange) {
                                            const price = p.priceCents || 0
                                            if (filterPriceRange === '0-100' && (price < 0 || price > 100)) return false
                                            if (filterPriceRange === '100-500' && (price < 100 || price > 500)) return false
                                            if (filterPriceRange === '500-1000' && (price < 500 || price > 1000)) return false
                                            if (filterPriceRange === '1000-5000' && (price < 1000 || price > 5000)) return false
                                            if (filterPriceRange === '5000+' && price < 5000) return false
                                        }
                                        return true
                                    }).length
                                })()} of {items.length} items
                            </span>
                        </h3>
                    {(() => {
                        const filteredItems = items.filter(p => {
                            // Search filter
                            if (searchQuery) {
                                const name = (p.name || '').toLowerCase()
                                if (!name.includes(searchQuery.toLowerCase())) return false
                            }
                            
                            // Category filter
                            if (filterCategory) {
                                if (p.categoryId !== Number(filterCategory)) return false
                            }
                            
                            // Stock status filter
                            if (filterStockStatus) {
                                const quantity = p.quantity || 0
                                const threshold = p.category?.reorderLevel || 0
                                
                                if (filterStockStatus === 'in-stock' && quantity <= threshold) return false
                                if (filterStockStatus === 'low-stock' && (quantity > threshold || quantity === 0)) return false
                                if (filterStockStatus === 'out-of-stock' && quantity !== 0) return false
                            }
                            
                            // Price range filter
                            if (filterPriceRange) {
                                const price = p.priceCents || 0
                                
                                if (filterPriceRange === '0-100' && (price < 0 || price > 100)) return false
                                if (filterPriceRange === '100-500' && (price < 100 || price > 500)) return false
                                if (filterPriceRange === '500-1000' && (price < 500 || price > 1000)) return false
                                if (filterPriceRange === '1000-5000' && (price < 1000 || price > 5000)) return false
                                if (filterPriceRange === '5000+' && price < 5000) return false
                            }
                            
                            return true
                        })
                        
                        if (loading) {
                            return (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                    <p className="text-muted">Loading products...</p>
                                </div>
                            )
                        }
                        
                        if (filteredItems.length === 0 && (searchQuery || filterCategory || filterStockStatus || filterPriceRange)) {
                            return (
                                <div className="text-center py-8 text-muted">
                                    <p className="text-lg mb-2">No products match your filters</p>
                                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                                </div>
                            )
                        }
                        
                        if (filteredItems.length === 0) {
                            return <div className="text-center py-8 text-muted">No products yet</div>
                        }
                        
                        return (
                        <>
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
                                    {filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(p => (
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
                                                {(() => {
                                                    const qty = p.quantity || 0
                                                    const reorderLevel = p.category?.reorderLevel || 10
                                                    const isLowStock = qty < reorderLevel && qty > 0
                                                    const isOutOfStock = qty <= 0
                                                    
                                                    return (
                                                        <div className="flex items-center justify-end gap-1">
                                                            {isOutOfStock && (
                                                                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] rounded font-semibold">
                                                                    OUT
                                                                </span>
                                                            )}
                                                            {isLowStock && (
                                                                <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] rounded font-semibold">
                                                                    LOW
                                                                </span>
                                                            )}
                                                            <span className={
                                                                isOutOfStock ? 'text-red-600 dark:text-red-400 font-bold' :
                                                                isLowStock ? 'text-yellow-600 dark:text-yellow-400 font-semibold' :
                                                                'text-green-600 dark:text-green-400'
                                                            }>
                                                                {Math.max(0, qty).toFixed(0)}
                                                            </span>
                                                        </div>
                                                    )
                                                })()}
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

                        {/* Pagination Controls */}
                        {filteredItems.length > itemsPerPage && (
                            <div className="mt-4 flex items-center justify-center gap-4">
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
                                    Page {currentPage} of {Math.ceil(filteredItems.length / itemsPerPage)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredItems.length / itemsPerPage), prev + 1))}
                                    disabled={currentPage === Math.ceil(filteredItems.length / itemsPerPage)}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    Next
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        </>
)
                    })()}
                </div>

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
        </div>
    )
}

// Protect this page - only staff, doctors, and admins can access
export default requireStaffOrAbove(ProductsPage)
