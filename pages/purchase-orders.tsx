import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import ConfirmModal from '../components/ConfirmModal'
import LoadingModal from '../components/LoadingModal'
import ToastNotification from '../components/ToastNotification'
import CustomSelect from '../components/CustomSelect'
import { useToast } from '../hooks/useToast'

export default function PurchaseOrdersPage() {
    const [sentDemands, setSentDemands] = useState<any[]>([])
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [demandList, setDemandList] = useState<any[]>([]) // Current demand list being built
    const [showSupplierModal, setShowSupplierModal] = useState(false)
    const [supplierModalAnimating, setSupplierModalAnimating] = useState(false)
    const [selectedSupplier, setSelectedSupplier] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [activeTab, setActiveTab] = useState<'pending' | 'received'>('pending')
    const [searchQuery, setSearchQuery] = useState('')
    const [filterSupplier, setFilterSupplier] = useState('')
    const [loading, setLoading] = useState(false)
    const [sendingEmail, setSendingEmail] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [receiving, setReceiving] = useState(false)
    const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false)
    const [receivingModalAnimating, setReceivingModalAnimating] = useState(false)
    const [receivingPO, setReceivingPO] = useState<any>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [successModalAnimating, setSuccessModalAnimating] = useState(false)
    const [receivedPODetails, setReceivedPODetails] = useState<any>(null)
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            await Promise.all([
                fetchSentDemands(),
                fetchSuppliers(),
                fetchProducts(),
                fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
            ])
        } finally {
            setLoading(false)
        }
    }

    const fetchSentDemands = async () => {
        const response = await fetch('/api/purchase-orders')
        const data = await response.json()
        setSentDemands(Array.isArray(data) ? data : [])
    }

    const fetchSuppliers = async () => {
        const response = await fetch('/api/suppliers')
        const data = await response.json()
        setSuppliers(Array.isArray(data) ? data.filter((s: any) => s.status === 'active') : [])
    }

    const fetchProducts = async () => {
        const response = await fetch('/api/products')
        const data = await response.json()
        const productsData = Array.isArray(data) ? data : []
        setProducts(productsData)
        
        // Auto-add low and out of stock items to demand list
        const lowStockItems = productsData.filter((p: any) => {
            const qty = Number(p.actualInventory || p.quantity || 0)
            const minStock = Number(p.minStockLevel || 10)
            return qty <= minStock
        })
        
        if (lowStockItems.length > 0) {
            const autoItems = lowStockItems.map((p: any) => ({
                productId: p.id,
                productName: p.name,
                currentStock: Number(p.actualInventory || p.quantity || 0),
                requestedQuantity: Math.max(50, Number(p.minStockLevel || 10) * 5), // Order 5x min stock or 50, whichever is higher
                unit: p.unit || 'pcs',
                unitPrice: Number(p.purchasePriceCents || p.priceCents || 0), // Already in rupees
                autoAdded: true
            }))
            setDemandList(prev => {
                // Merge with existing, avoiding duplicates
                const existingIds = new Set(prev.map(item => item.productId))
                const newItems = autoItems.filter((item: any) => !existingIds.has(item.productId))
                return [...prev, ...newItems]
            })
        }
    }

    const addManualItem = () => {
        const newItem = {
            productId: '',
            productName: '',
            currentStock: 0,
            requestedQuantity: 0,
            unit: 0,
            unitPrice: 0,
            autoAdded: false
        }
        setDemandList([...demandList, newItem])
    }

    const removeItem = (index: number) => {
        setDemandList(demandList.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: string, value: any) => {
        const newList = [...demandList]
        newList[index] = { ...newList[index], [field]: value }
        
        // Auto-fill product details when product is selected
        if (field === 'productId' && value) {
            const product = products.find(p => p.id === Number(value))
            if (product) {
                newList[index].productName = product.name
                newList[index].currentStock = Number(product.actualInventory || product.quantity || 0)
                newList[index].unit = product.unit || 'pcs'
                newList[index].unitPrice = Number(product.purchasePriceCents || product.priceCents || 0) // Already in rupees
                // Suggest order quantity
                if (!newList[index].requestedQuantity) {
                    newList[index].requestedQuantity = Math.max(50, Number(product.minStockLevel || 10) * 5)
                }
            }
        }
        
        setDemandList(newList)
    }

    const openSupplierModal = () => {
        if (demandList.length === 0) {
            showError('Please add items to demand list first')
            return
        }
        
        // Check if all items have quantity
        const invalidItems = demandList.filter(item => !item.productId || !item.requestedQuantity || item.requestedQuantity <= 0)
        if (invalidItems.length > 0) {
            showError('Please fill in all item details and quantities')
            return
        }
        
        setShowSupplierModal(true)
        setSupplierModalAnimating(false)
        setTimeout(() => setSupplierModalAnimating(true), 10)
    }

    const closeSupplierModal = () => {
        setSupplierModalAnimating(false)
        setTimeout(() => {
            setShowSupplierModal(false)
            setSelectedSupplier('')
        }, 200)
    }

    const sendDemand = async () => {
        if (!selectedSupplier) {
            showError('Please select a supplier')
            return
        }

        setSendingEmail(true)
        try {
            // 1. Create purchase order
            const payload = {
                supplierId: Number(selectedSupplier),
                orderDate: new Date().toISOString().split('T')[0],
                expectedDate: null,
                status: 'pending',
                discount: 0,
                shippingCost: 0,
                notes: 'Demand request generated from low stock alert',
                items: demandList.map(item => ({
                    productId: Number(item.productId),
                    quantity: Number(item.requestedQuantity),
                    unitPrice: Number(item.unitPrice),
                    taxRate: 0,
                    discount: 0
                }))
            }

            const poResponse = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!poResponse.ok) {
                throw new Error('Failed to create purchase order')
            }

            const newPO = await poResponse.json()
            console.log('Created PO:', newPO)

            // 2. Send email to supplier
            const supplier = suppliers.find(s => s.id === Number(selectedSupplier))
            console.log('Supplier:', supplier)
            
            if (supplier?.email) {
                console.log('Sending email to:', supplier.email, 'for PO ID:', newPO.id)
                const emailResponse = await fetch('/api/purchase-orders/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        purchaseOrderId: newPO.id
                    })
                })

                console.log('Email response status:', emailResponse.status)
                const emailResult = await emailResponse.json()
                console.log('Email result:', emailResult)

                if (emailResponse.ok) {
                    showSuccess(`Demand sent successfully to ${supplier.name}! Email sent to ${supplier.email}`)
                } else {
                    showError(`Demand created but email failed: ${emailResult.error || 'Unknown error'}`)
                }
            } else {
                showInfo(`Demand created successfully! (No email - supplier has no email address)`)
            }

            // 3. Clear demand list and refresh
            setDemandList([])
            await fetchSentDemands()
            closeSupplierModal()

        } catch (error) {
            console.error('Error sending demand:', error)
            showError('Failed to send demand: ' + error)
        } finally {
            setSendingEmail(false)
        }
    }

    const deleteDemand = async (id: number) => {
        setDeleteId(id)
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        if (deleteId === null) return
        setDeleting(true)
        try {
            const response = await fetch(`/api/purchase-orders?id=${deleteId}`, { method: 'DELETE' })
            if (response.ok) {
                await fetchSentDemands()
                showSuccess('Demand deleted successfully!')
            } else {
                showError('Failed to delete demand')
            }
        } catch (error) {
            console.error('Error deleting:', error)
            showError('Failed to delete demand')
        } finally {
            setDeleting(false)
            setShowDeleteConfirm(false)
            setDeleteId(null)
        }
    }

    const openReceivingModal = (po: any) => {
        setReceivingPO({
            ...po,
            items: po.items.map((item: any) => ({
                ...item,
                receivingQuantity: item.quantity - (item.receivedQuantity || 0)
            }))
        })
        setIsReceivingModalOpen(true)
        setReceivingModalAnimating(false)
        setTimeout(() => setReceivingModalAnimating(true), 10)
    }

    const closeReceivingModal = () => {
        setReceivingModalAnimating(false)
        setTimeout(() => {
            setIsReceivingModalOpen(false)
            setReceivingPO(null)
        }, 200)
    }

    const handleReceiveGoods = async (e: any) => {
        e.preventDefault()
        
        if (!receivingPO) {
            showError('No purchase order selected')
            return
        }
        
        setReceiving(true)
        try {
            const items = receivingPO.items.map((item: any) => ({
                id: item.id,
                productId: item.productId,
                receivedQuantity: Number(item.receivingQuantity) || 0,
                unitPrice: item.unitPrice
            }))

            console.log('Sending receive goods request:', {
                id: receivingPO.id,
                status: 'received',
                receivedDate: new Date().toISOString().split('T')[0],
                items
            })

            const response = await fetch('/api/purchase-orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: receivingPO.id,
                    status: 'received',
                    receivedDate: new Date().toISOString().split('T')[0],
                    items
                })
            })

            console.log('Response status:', response.status)
            
            if (response.ok) {
                const updatedPO = await response.json()
                console.log('Updated PO:', updatedPO)
                await fetchSentDemands()
                closeReceivingModal()
                
                // Show success modal
                setReceivedPODetails(updatedPO)
                setShowSuccessModal(true)
                setSuccessModalAnimating(false)
                setTimeout(() => setSuccessModalAnimating(true), 10)
            } else {
                const error = await response.json()
                console.error('Error response:', error)
                showError('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error receiving goods:', error)
            showError('Failed to receive goods: ' + error)
        } finally {
            setReceiving(false)
        }
    }

    const closeSuccessModal = () => {
        setSuccessModalAnimating(false)
        setTimeout(() => {
            setShowSuccessModal(false)
            setReceivedPODetails(null)
        }, 300)
    }

    const filteredDemands = sentDemands.filter(demand => {
        // Filter by active tab
        if (activeTab === 'pending' && demand.status !== 'pending') return false
        if (activeTab === 'received' && demand.status !== 'received') return false
        
        const matchesSearch = searchQuery ?
            demand.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            demand.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase())
            : true
        
        const matchesSupplier = filterSupplier ?
            demand.supplierId === Number(filterSupplier)
            : true
        
        return matchesSearch && matchesSupplier
    })

    // Get stock status for display
    const getStockStatus = (qty: number) => {
        if (qty <= 0) return { label: 'OUT', color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30' }
        if (qty <= 10) return { label: 'LOW', color: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30' }
        return { label: 'OK', color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30' }
    }

    return (
        <>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchase Demands</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Build demand list and send to suppliers</p>
                    </div>
                </div>

                {/* Demand List Builder */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Current Demand List ({demandList.length} items)
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={addManualItem}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                ➕ Add Item
                            </button>
                            <button
                                onClick={openSupplierModal}
                                disabled={demandList.length === 0}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                            >
                                📧 Send Demand
                            </button>
                        </div>
                    </div>

                    {demandList.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p className="text-lg">No items in demand list</p>
                            <p className="text-sm mt-2">Add items manually or they will be auto-added from low stock products</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current Stock</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requested Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit Price</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {demandList.map((item, index) => {
                                        const stockStatus = getStockStatus(item.currentStock)
                                        const total = item.requestedQuantity * item.unitPrice
                                        
                                        return (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-4 py-3">
                                                    {item.productId ? (
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{item.productName}</div>
                                                            <div className="text-xs text-gray-500">ID: {item.productId}</div>
                                                        </div>
                                                    ) : (
                                                        <CustomSelect
                                                            value={item.productId?.toString() || ''}
                                                            onChange={(value) => updateItem(index, 'productId', value)}
                                                            options={products.map(p => ({ value: p.id.toString(), label: p.name }))}
                                                            placeholder="Select Product"
                                                            className="min-w-[200px]"
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${stockStatus.color}`}>
                                                            {stockStatus.label}
                                                        </span>
                                                        <span className="text-gray-900 dark:text-white">{item.currentStock}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.requestedQuantity}
                                                        onChange={(e) => updateItem(index, 'requestedQuantity', e.target.value)}
                                                        className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                        placeholder="Qty"
                                                        min="1"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white">{item.unit}</td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                                        className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                        placeholder="Price"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                                                    ₹{total.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${item.autoAdded ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                        {item.autoAdded ? 'Auto' : 'Manual'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => removeItem(index)}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                                    >
                                                        🗑️ Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <td colSpan={5} className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                                            Total:
                                        </td>
                                        <td className="px-4 py-3 font-bold text-lg text-green-600 dark:text-green-400">
                                            ₹{demandList.reduce((sum, item) => sum + (item.requestedQuantity * item.unitPrice), 0).toFixed(2)}
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sent Demands History */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sent Demands</h2>
                    
                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-6 py-3 font-medium transition-all ${
                                activeTab === 'pending'
                                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Pending Demands
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                activeTab === 'pending'
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                                {sentDemands.filter(d => d.status === 'pending').length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('received')}
                            className={`px-6 py-3 font-medium transition-all ${
                                activeTab === 'received'
                                    ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            Received Orders
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                activeTab === 'received'
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                                {sentDemands.filter(d => d.status === 'received').length}
                            </span>
                        </button>
                    </div>
                    
                    {/* Search and Filter */}
                    <div className="flex gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Search by PO Number or Supplier..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <CustomSelect
                            value={filterSupplier}
                            onChange={(value) => setFilterSupplier(value)}
                            options={suppliers.map(s => ({ value: s.id.toString(), label: s.name }))}
                            placeholder="All Suppliers"
                            className="w-64"
                        />
                    </div>

                    {filteredDemands.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p className="text-lg">No demands sent yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PO Number</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Items</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredDemands.map((demand) => (
                                        <tr key={demand.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{demand.poNumber}</td>
                                            <td className="px-4 py-3 text-gray-900 dark:text-white">{demand.supplier?.name}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                {demand.orderDate ? new Date(demand.orderDate).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 dark:text-white">{demand.items?.length || 0}</td>
                                            <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                                                ₹{(demand.totalAmount || 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    demand.status === 'received' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                    demand.status === 'pending' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                }`}>
                                                    {demand.status || 'pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    {demand.status === 'pending' && (
                                                        <button
                                                            onClick={() => openReceivingModal(demand)}
                                                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium"
                                                        >
                                                            📦 Receive
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteDemand(demand.id)}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                                    >
                                                        🗑️ Delete
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

            {/* Modals */}
            {/* Supplier Selection Modal */}
            {showSupplierModal && (
                <div className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${supplierModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`}>
                    <div className={`bg-white dark:bg-gray-900 rounded-lg max-w-md w-full shadow-2xl transform transition-all duration-300 ${supplierModalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Select Supplier</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Choose a supplier to send this demand to. An email will be sent automatically.
                            </p>
                            
                            <CustomSelect
                                value={selectedSupplier}
                                onChange={(value) => setSelectedSupplier(value)}
                                options={suppliers.map(s => ({ 
                                    value: s.id.toString(), 
                                    label: `${s.name}${s.email ? ` (${s.email})` : ' (No email)'}` 
                                }))}
                                placeholder="Select Supplier"
                                className="mb-6"
                            />

                            {selectedSupplier && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-blue-900 dark:text-blue-200">
                                        <strong>Demand Summary:</strong>
                                    </p>
                                    <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                                        <li>• Total Items: {demandList.length}</li>
                                        <li>• Total Amount: ₹{demandList.reduce((sum, item) => sum + (item.requestedQuantity * item.unitPrice), 0).toFixed(2)}</li>
                                        <li>• Supplier: {suppliers.find(s => s.id === Number(selectedSupplier))?.name}</li>
                                    </ul>
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={closeSupplierModal}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={sendDemand}
                                    disabled={!selectedSupplier || sendingEmail}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                                >
                                    {sendingEmail ? 'Sending...' : '📧 Send Demand'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Receiving Goods Modal */}
            {isReceivingModalOpen && receivingPO && (
                <div className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${receivingModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`}>
                    <div className={`bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full shadow-2xl transform transition-all duration-300 max-h-[90vh] overflow-y-auto ${receivingModalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                        <form onSubmit={handleReceiveGoods} className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Receive Goods - {receivingPO.poNumber}</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Supplier: <strong>{receivingPO.supplier?.name}</strong> | 
                                Order Date: <strong>{receivingPO.orderDate ? new Date(receivingPO.orderDate).toLocaleDateString() : '-'}</strong>
                            </p>

                            <div className="overflow-x-auto mb-6">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ordered</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Previously Received</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Receiving Now</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit Price</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {receivingPO.items.map((item: any, index: number) => {
                                            const receivingQty = Number(item.receivingQuantity) || 0
                                            const total = receivingQty * (item.unitPrice || 0)
                                            return (
                                                <tr key={index}>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">{item.product?.name}</td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.receivedQuantity || 0}</td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={item.receivingQuantity}
                                                            onChange={(e) => {
                                                                const newPO = { ...receivingPO }
                                                                newPO.items[index].receivingQuantity = e.target.value
                                                                setReceivingPO(newPO)
                                                            }}
                                                            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                            min="0"
                                                            max={item.quantity - (item.receivedQuantity || 0)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">₹{(item.unitPrice || 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">₹{total.toFixed(2)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <td colSpan={5} className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                                                Receiving Total:
                                            </td>
                                            <td className="px-4 py-3 font-bold text-lg text-green-600 dark:text-green-400">
                                                ₹{receivingPO.items.reduce((sum: number, item: any) => 
                                                    sum + (Number(item.receivingQuantity) || 0) * (item.unitPrice || 0), 0
                                                ).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeReceivingModal}
                                    disabled={receiving}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={receiving}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                                >
                                    {receiving ? 'Processing...' : '✓ Confirm Receipt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && receivedPODetails && (
                <div className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${successModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`}>
                    <div className={`bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full shadow-2xl transform transition-all duration-300 ${successModalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                        <div className="p-6 text-center border-b border-gray-200 dark:border-gray-700">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Goods Received Successfully!</h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">Order {receivedPODetails.poNumber} has been marked as received and inventory has been updated.</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Supplier</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{receivedPODetails.supplier?.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Received Date</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {receivedPODetails.receivedDate ? new Date(receivedPODetails.receivedDate).toLocaleDateString() : new Date().toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Items Received</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{receivedPODetails.items?.length || 0} items</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                                        <p className="font-semibold text-green-600 dark:text-green-400">₹{(receivedPODetails.totalAmount || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Received Items</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {receivedPODetails.items?.map((item: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white">{item.product?.name}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Quantity: <span className="font-semibold text-green-600">{item.receivedQuantity || item.quantity}</span> {item.product?.unit || 'pcs'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    ₹{((item.receivedQuantity || item.quantity) * item.unitPrice).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Inventory Updated</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                            Product quantities have been automatically updated in your inventory. Stock transactions have been recorded for audit tracking.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={closeSuccessModal}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Demand"
                message="Are you sure you want to delete this demand? This action cannot be undone."
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
                isOpen={loading || sendingEmail || deleting || receiving} 
                message={loading ? 'Loading...' : sendingEmail ? 'Sending demand...' : receiving ? 'Receiving goods...' : 'Deleting...'}
            />

            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </>
    )
}
