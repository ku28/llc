import { useState, useEffect } from 'react'
import CustomSelect from './CustomSelect'

interface AddDemandItemsModalProps {
    isOpen: boolean
    onClose: () => void
    products: any[]
    onAddItems: (items: any[]) => void
}

export default function AddDemandItemsModal({ isOpen, onClose, products, onAddItems }: AddDemandItemsModalProps) {
    const [animating, setAnimating] = useState(false)
    const [selectedItems, setSelectedItems] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (isOpen) {
            setAnimating(false)
            setTimeout(() => setAnimating(true), 10)
            
            // Auto-add low stock and out of stock items
            const autoAddItems = products
                .filter(p => (p.quantity || 0) < 50)
                .map(p => ({
                    productId: p.id,
                    productName: p.name,
                    currentStock: p.quantity || 0,
                    requestedQuantity: Math.max(100 - (p.quantity || 0), 10),
                    unitPrice: p.purchasePriceRupees || 0,
                    unit: p.unit || '',
                    source: (p.quantity || 0) === 0 ? 'Out of Stock' : 'Low Stock'
                }))
            
            setSelectedItems(autoAddItems)
        } else {
            setSelectedItems([])
            setSearchQuery('')
        }
    }, [isOpen, products])

    if (!isOpen) return null

    const closeModal = () => {
        setAnimating(false)
        setTimeout(onClose, 300)
    }

    const handleAddItem = (productId: string) => {
        const product = products.find(p => p.id.toString() === productId)
        if (!product) return

        // Check if already added
        if (selectedItems.some(item => item.productId === product.id)) {
            return
        }

        const newItem = {
            productId: product.id,
            productName: product.name,
            currentStock: product.quantity || 0,
            requestedQuantity: Math.max(100 - (product.quantity || 0), 10),
            unitPrice: product.purchasePriceRupees || 0,
            unit: product.unit || '',
            source: 'Manual'
        }

        setSelectedItems([...selectedItems, newItem])
    }

    const handleRemoveItem = (productId: number) => {
        setSelectedItems(selectedItems.filter(item => item.productId !== productId))
    }

    const handleQuantityChange = (productId: number, quantity: number) => {
        setSelectedItems(selectedItems.map(item => 
            item.productId === productId ? { ...item, requestedQuantity: quantity } : item
        ))
    }

    const handleAddAllItems = () => {
        onAddItems(selectedItems)
        closeModal()
    }

    const handleRefresh = () => {
        // Refresh low stock and out of stock items
        const autoAddItems = products
            .filter(p => (p.quantity || 0) < 50)
            .map(p => ({
                productId: p.id,
                productName: p.name,
                currentStock: p.quantity || 0,
                requestedQuantity: Math.max(100 - (p.quantity || 0), 10),
                unitPrice: p.purchasePriceRupees || 0,
                unit: p.unit || '',
                source: (p.quantity || 0) === 0 ? 'Out of Stock' : 'Low Stock'
            }))
        
        // Merge with manual items
        const manualItems = selectedItems.filter(item => item.source === 'Manual')
        const mergedItems = [...autoAddItems]
        
        manualItems.forEach(manual => {
            if (!mergedItems.some(item => item.productId === manual.productId)) {
                mergedItems.push(manual)
            }
        })
        
        setSelectedItems(mergedItems)
    }

    // Sort and filter products for dropdown
    const getFilteredProducts = () => {
        let filtered = products.filter(p => 
            !selectedItems.some(item => item.productId === p.id) &&
            (searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        )

        // Sort: suggested first (stock < 70), then by stock level
        return filtered.sort((a, b) => {
            const aStock = a.quantity || 0
            const bStock = b.quantity || 0
            const aSuggested = aStock < 70
            const bSuggested = bStock < 70

            if (aSuggested && !bSuggested) return -1
            if (!aSuggested && bSuggested) return 1
            
            return aStock - bStock
        })
    }

    const getStockBadge = (stock: number) => {
        if (stock === 0) {
            return <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full font-medium">Out of Stock</span>
        }
        if (stock < 50) {
            return <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full font-medium">Low Stock</span>
        }
        if (stock < 70) {
            return <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium">Suggested</span>
        }
        return null
    }

    const filteredProducts = getFilteredProducts()

    return (
        <div 
            className={`fixed inset-0 bg-black flex items-center justify-center p-4 transition-opacity duration-300 ${animating ? 'bg-opacity-50' : 'bg-opacity-0'}`} 
            style={{ zIndex: 10000 }}
            onClick={closeModal}
        >
            <div 
                className={`relative overflow-hidden rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/20 backdrop-blur-sm max-w-5xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${animating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                
                <div className="relative p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
                                Add Items to Demand List
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Select products to add to your purchase order
                            </p>
                        </div>
                        <button
                            onClick={closeModal}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Add Medicine Section */}
                    <div className="mb-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-1">
                                <CustomSelect
                                    value=""
                                    onChange={handleAddItem}
                                    options={filteredProducts.map(p => {
                                        const stock = p.quantity || 0
                                        const badge = stock < 70 ? ' 🔮' : stock < 50 ? ' ⚠️' : ''
                                        return {
                                            value: p.id.toString(),
                                            label: `${p.name}${badge} · Stock: ${stock}`
                                        }
                                    })}
                                    placeholder="Select Medicine to Add..."
                                    className="text-sm"
                                />
                            </div>
                            <button
                                onClick={handleRefresh}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                title="Refresh low stock items"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-1"></span> Suggested items have stock &lt; 70
                            <span className="ml-3 inline-block w-3 h-3 bg-orange-500 rounded-full mr-1"></span> Low stock items have stock &lt; 50
                            <span className="ml-3 inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span> Out of stock items
                        </p>
                    </div>

                    {/* Selected Items List */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                Selected Items ({selectedItems.length})
                            </h3>
                        </div>

                        {selectedItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No items selected. Add items from the dropdown above.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current Stock</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requested Qty</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {selectedItems.map((item) => (
                                            <tr key={item.productId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900 dark:text-white">{item.productName}</span>
                                                        {getStockBadge(item.currentStock)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white">{item.currentStock}</td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.requestedQuantity}
                                                        onChange={(e) => handleQuantityChange(item.productId, Number(e.target.value))}
                                                        className="w-24 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                                        min="1"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        item.source === 'Out of Stock' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                                        item.source === 'Low Stock' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                                        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                    }`}>
                                                        {item.source}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.productId)}
                                                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                        title="Remove item"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={closeModal}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddAllItems}
                            disabled={selectedItems.length === 0}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add All Items ({selectedItems.length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
