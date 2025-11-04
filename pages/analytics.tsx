import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import LoadingModal from '../components/LoadingModal'

export default function AnalyticsPage() {
    const [products, setProducts] = useState<any[]>([])
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAllData()
    }, [])

    const fetchAllData = async () => {
        setLoading(true)
        try {
            const [productsRes, suppliersRes, posRes, invoicesRes, txnRes] = await Promise.all([
                fetch('/api/products/public'),
                fetch('/api/suppliers'),
                fetch('/api/purchase-orders'),
                fetch('/api/customer-invoices'),
                fetch('/api/stock-transactions?limit=1000')
            ])

            const [productsData, suppliersData, posData, invoicesData, txnData] = await Promise.all([
                productsRes.json(),
                suppliersRes.json(),
                posRes.json(),
                invoicesRes.json(),
                txnRes.json()
            ])

            setProducts(Array.isArray(productsData) ? productsData : [])
            setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
            setPurchaseOrders(Array.isArray(posData) ? posData : [])
            setInvoices(Array.isArray(invoicesData) ? invoicesData : [])
            setTransactions(Array.isArray(txnData) ? txnData : [])
        } catch (error) {
            console.error('Error fetching analytics data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Calculate metrics
    const totalProducts = products.length
    const totalStockValue = products.reduce((sum, p) => sum + (p.quantity * (p.priceCents / 100)), 0)
    const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= (p.threshold || 10))
    const outOfStockProducts = products.filter(p => p.quantity === 0)

    const activeSuppliers = suppliers.filter(s => s.status === 'active').length
    const totalSupplierOutstanding = suppliers.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0)

    const pendingPOs = purchaseOrders.filter(po => po.status === 'pending').length
    const totalPurchaseValue = purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0)

    const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial').length
    const totalInvoiceValue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    const totalReceivables = invoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0)

    // Top selling products
    const topSellers = [...products]
        .sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
        .slice(0, 10)

    // Slow moving products
    const slowMovers = [...products]
        .filter(p => p.quantity > 0)
        .sort((a, b) => (a.totalSales || 0) - (b.totalSales || 0))
        .slice(0, 10)

    // Recent transactions
    const recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
        .slice(0, 10)

    return (
        <Layout>
            <div>
                <div className="section-header">
                    <h2 className="section-title">Analytics & Insights</h2>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Inventory Metrics */}
                    <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-sm text-muted mb-1">Total Products</div>
                                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalProducts}</div>
                            </div>
                            <div className="text-4xl">📦</div>
                        </div>
                        <div className="mt-3 text-sm">
                            <span className="text-green-600 dark:text-green-400 font-semibold">{products.filter(p => p.quantity > (p.threshold || 10)).length}</span> in stock • 
                            <span className="text-yellow-600 dark:text-yellow-400 font-semibold ml-2">{lowStockProducts.length}</span> low • 
                            <span className="text-red-600 dark:text-red-400 font-semibold ml-2">{outOfStockProducts.length}</span> out
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-sm text-muted mb-1">Stock Value</div>
                                <div className="text-3xl font-bold text-green-600 dark:text-green-400">₹{totalStockValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                            </div>
                            <div className="text-4xl">💰</div>
                        </div>
                        <div className="mt-3 text-sm text-muted">
                            Current inventory valuation
                        </div>
                    </div>

                    {/* Supplier Metrics */}
                    <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-sm text-muted mb-1">Active Suppliers</div>
                                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{activeSuppliers}</div>
                            </div>
                            <div className="text-4xl">🏭</div>
                        </div>
                        <div className="mt-3 text-sm">
                            <span className="font-semibold">{pendingPOs}</span> pending orders
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-sm text-muted mb-1">Accounts Receivable</div>
                                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">₹{totalReceivables.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                            </div>
                            <div className="text-4xl">📊</div>
                        </div>
                        <div className="mt-3 text-sm">
                            <span className="font-semibold">{unpaidInvoices}</span> unpaid invoices
                        </div>
                    </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span>💸</span>
                            <span>Purchase Summary</span>
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <span className="text-sm">Total Purchase Orders</span>
                                <span className="font-semibold">{purchaseOrders.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <span className="text-sm">Pending Orders</span>
                                <span className="font-semibold text-yellow-600">{pendingPOs}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <span className="text-sm font-semibold">Total Purchase Value</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">₹{totalPurchaseValue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <span className="text-sm font-semibold">Supplier Outstanding</span>
                                <span className="font-bold text-red-600 dark:text-red-400">₹{totalSupplierOutstanding.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span>💵</span>
                            <span>Sales Summary</span>
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <span className="text-sm">Total Invoices</span>
                                <span className="font-semibold">{invoices.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <span className="text-sm">Unpaid/Partial</span>
                                <span className="font-semibold text-red-600">{unpaidInvoices}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <span className="text-sm font-semibold">Total Revenue</span>
                                <span className="font-bold text-green-600 dark:text-green-400">₹{totalInvoiceValue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <span className="text-sm font-semibold">Amount Due</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400">₹{totalReceivables.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stock Alerts */}
                {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
                    <div className="card mb-6 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                            <span>⚠️</span>
                            <span>Stock Alerts</span>
                        </h3>
                        
                        {outOfStockProducts.length > 0 && (
                            <div className="mb-4">
                                <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">Out of Stock ({outOfStockProducts.length})</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {outOfStockProducts.slice(0, 6).map(p => (
                                        <div key={p.id} className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
                                            <div className="font-semibold">{p.name}</div>
                                            <div className="text-xs text-muted">{p.category?.name || 'Uncategorized'}</div>
                                        </div>
                                    ))}
                                </div>
                                {outOfStockProducts.length > 6 && (
                                    <div className="text-xs text-muted mt-2">+ {outOfStockProducts.length - 6} more products</div>
                                )}
                            </div>
                        )}

                        {lowStockProducts.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Low Stock ({lowStockProducts.length})</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {lowStockProducts.slice(0, 6).map(p => (
                                        <div key={p.id} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                                            <div className="font-semibold">{p.name}</div>
                                            <div className="text-xs text-muted">
                                                Stock: {p.quantity} / Threshold: {p.threshold || 10}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {lowStockProducts.length > 6 && (
                                    <div className="text-xs text-muted mt-2">+ {lowStockProducts.length - 6} more products</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Top & Slow Movers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span>🏆</span>
                            <span>Top Selling Products</span>
                        </h3>
                        {topSellers.length === 0 ? (
                            <p className="text-muted text-sm">No sales data yet</p>
                        ) : (
                            <div className="space-y-2">
                                {topSellers.map((p, index) => (
                                    <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold truncate">{p.name}</div>
                                            <div className="text-xs text-muted">{p.category?.name || 'Uncategorized'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-green-600 dark:text-green-400">{p.totalSales || 0}</div>
                                            <div className="text-xs text-muted">units sold</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span>🐌</span>
                            <span>Slow Moving Products</span>
                        </h3>
                        {slowMovers.length === 0 ? (
                            <p className="text-muted text-sm">No products in stock</p>
                        ) : (
                            <div className="space-y-2">
                                {slowMovers.map((p, index) => (
                                    <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold truncate">{p.name}</div>
                                            <div className="text-xs text-muted">{p.category?.name || 'Uncategorized'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-blue-600 dark:text-blue-400">{p.quantity}</div>
                                            <div className="text-xs text-muted">in stock</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Stock Movements */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>🔄</span>
                        <span>Recent Inventory Movements</span>
                    </h3>
                    {recentTransactions.length === 0 ? (
                        <p className="text-muted text-sm">No recent transactions</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Date</th>
                                        <th className="px-4 py-3 text-left font-semibold">Product</th>
                                        <th className="px-4 py-3 text-center font-semibold">Type</th>
                                        <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                                        <th className="px-4 py-3 text-right font-semibold">Balance</th>
                                        <th className="px-4 py-3 text-left font-semibold">Reference</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {recentTransactions.map(txn => (
                                        <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-4 py-3 text-xs">
                                                {new Date(txn.transactionDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 font-medium">{txn.product?.name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 text-xs rounded ${
                                                    txn.transactionType === 'IN' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                                                    txn.transactionType === 'OUT' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                                                    'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                                }`}>
                                                    {txn.transactionType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold">
                                                {txn.transactionType === 'IN' || txn.transactionType === 'RETURN' ? '+' : '-'}
                                                {txn.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-semibold">
                                                {txn.balanceQuantity}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted">
                                                {txn.referenceType ? `${txn.referenceType} #${txn.referenceId}` : txn.notes?.substring(0, 30)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <LoadingModal 
                isOpen={loading} 
                message="Loading analytics data..." 
            />
        </Layout>
    )
}
