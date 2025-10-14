import { useState, useEffect } from 'react'
import CustomSelect from '../components/CustomSelect'
import { requireStaffOrAbove } from '../lib/withAuth'

function ProductsPage() {
    const [items, setItems] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    
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
        fetch('/api/products').then(r => r.json()).then(data => setItems(Array.isArray(data) ? data : []))
        fetch('/api/categories').then(r => r.json()).then(data => setCategories(Array.isArray(data) ? data : []))
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
        if (!confirm('Are you sure you want to delete this product?')) return
        try {
            const response = await fetch('/api/products', { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ id }) 
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
        }
    }

    return (
        <div>
            <div className="section-header flex justify-between items-center">
                <h2 className="section-title">Inventory Management</h2>
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
                                    {filteredItems.map(p => (
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
                                                <span className={p.quantity < (p.category?.reorderLevel || 0) ? 'text-red-600 font-semibold' : ''}>
                                                    {(p.quantity || 0).toFixed(0)}
                                                </span>
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
                        )
                    })()}
                </div>
        </div>
    )
}

// Protect this page - only staff, doctors, and admins can access
export default requireStaffOrAbove(ProductsPage)
