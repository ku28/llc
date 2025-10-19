import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Link from 'next/link'

interface DashboardStats {
  lowStockProducts: any[]
  recentSales: number
  pendingPurchaseOrders: number
  totalRevenue: number
  unpaidInvoices: number
  expiringProducts: any[]
  topSellingProducts: any[]
  recentActivities: any[]
}

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    lowStockProducts: [],
    recentSales: 0,
    pendingPurchaseOrders: 0,
    totalRevenue: 0,
    unpaidInvoices: 0,
    expiringProducts: [],
    topSellingProducts: [],
    recentActivities: []
  })
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // Check authentication first
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        
        if (!data.user) {
          // Not authenticated, redirect to login
          router.push('/login')
          return
        }
        
        // If user role is 'user', redirect to user dashboard
        if (data.user.role?.toLowerCase() === 'user') {
          router.push('/user-dashboard')
          return
        }
        
        setAuthChecked(true)
        fetchDashboardData()
      } catch (err) {
        // Error checking auth, redirect to login
        router.push('/login')
      }
    }
    
    checkAuth()
  }, [router])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      const [productsRes, poisRes, invoicesRes, stockTxRes, visitsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/purchase-orders'),
        fetch('/api/customer-invoices'),
        fetch('/api/stock-transactions'),
        fetch('/api/visits')
      ])

      const products = await productsRes.json()
      const purchaseOrders = await poisRes.json()
      const invoices = await invoicesRes.json()
      const stockTransactions = await stockTxRes.json()
      const visits = await visitsRes.json()

      // Calculate low stock products (quantity <= 10 or below reorder point)
      const lowStock = products.filter((p: any) => {
        const reorderPoint = p.category?.reorderLevel || 10
        return p.quantity <= reorderPoint
      }).sort((a: any, b: any) => a.quantity - b.quantity)

      // Pending purchase orders
      const pendingPOs = purchaseOrders.filter((po: any) => po.status === 'pending').length

      // Unpaid invoices
      const unpaid = invoices.filter((inv: any) => inv.status === 'unpaid' || inv.status === 'partial')

      // Calculate revenue from paid invoices
      const revenue = invoices
        .filter((inv: any) => inv.status === 'paid' || inv.status === 'partial')
        .reduce((sum: number, inv: any) => sum + (inv.paidAmount || 0), 0)

      // Top selling products from stock OUT transactions
      const outTransactions = stockTransactions.filter((tx: any) => tx.transactionType === 'OUT')
      const productSales: { [key: number]: { product: any; quantity: number } } = {}
      
      outTransactions.forEach((tx: any) => {
        if (!productSales[tx.productId]) {
          productSales[tx.productId] = { product: tx.product, quantity: 0 }
        }
        productSales[tx.productId].quantity += tx.quantity
      })

      const topSelling = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      // Recent activities (last 10 stock transactions and visits)
      const recentTx = stockTransactions.slice(0, 5)
      const recentVisits = visits.slice(0, 5)
      const activities = [
        ...recentTx.map((tx: any) => ({
          type: 'stock',
          icon: tx.transactionType === 'IN' ? '📦' : '📤',
          message: `${tx.transactionType} - ${tx.product?.name || 'Product'} (${tx.quantity} units)`,
          date: tx.transactionDate
        })),
        ...recentVisits.map((v: any) => ({
          type: 'visit',
          icon: '🏥',
          message: `Patient visit - OPD ${v.opdNo}`,
          date: v.date
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

      // Check for expiring products (within 60 days)
      const sixtyDaysFromNow = new Date()
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
      
      // Note: This would need batch data with expiry dates
      // For now, we'll leave it empty until batches are properly used
      const expiring: any[] = []

      setStats({
        lowStockProducts: lowStock,
        recentSales: outTransactions.length,
        pendingPurchaseOrders: pendingPOs,
        totalRevenue: revenue,
        unpaidInvoices: unpaid.length,
        expiringProducts: expiring,
        topSellingProducts: topSelling,
        recentActivities: activities
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked || loading) {
    return (
        <div className="py-6 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-brand rounded-full" />
          <p className="mt-4 text-muted">Loading dashboard...</p>
        </div>
    )
  }

  return (
      <div className="py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-green-600 transition-all text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted mb-1">Total Revenue</p>
                <p className="text-2xl font-bold">₹{(stats.totalRevenue / 100).toFixed(2)}</p>
              </div>
              <span className="text-4xl">💰</span>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted mb-1">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.lowStockProducts.length}</p>
              </div>
              <span className="text-4xl">⚠️</span>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted mb-1">Pending Purchase Orders</p>
                <p className="text-2xl font-bold">{stats.pendingPurchaseOrders}</p>
              </div>
              <span className="text-4xl">📋</span>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted mb-1">Unpaid Invoices</p>
                <p className="text-2xl font-bold">{stats.unpaidInvoices}</p>
              </div>
              <span className="text-4xl">📄</span>
            </div>
          </div>
        </div>

        {/* Alert Cards */}
        {stats.lowStockProducts.length > 0 && (
          <div className="card border-l-4 border-red-500">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🚨</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Low Stock Alert!</h3>
                <p className="text-sm text-muted mb-3">
                  {stats.lowStockProducts.length} product(s) are running low on stock and need reordering.
                </p>
                <div className="space-y-2 mb-4">
                  {stats.lowStockProducts.slice(0, 5).map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-sm">
                        <span className="text-red-600 font-bold">{product.quantity}</span>
                        <span className="text-muted"> units left</span>
                      </span>
                    </div>
                  ))}
                  {stats.lowStockProducts.length > 5 && (
                    <p className="text-sm text-muted">+ {stats.lowStockProducts.length - 5} more</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link 
                    href="/products"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm"
                  >
                    View All Products
                  </Link>
                  <Link 
                    href="/purchase-orders"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm"
                  >
                    Create Purchase Order
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🏆</span>
              <span>Top Selling Products</span>
            </h3>
            {stats.topSellingProducts.length === 0 ? (
              <p className="text-muted text-sm">No sales data available</p>
            ) : (
              <div className="space-y-3">
                {stats.topSellingProducts.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '📦'}</span>
                      <span className="font-medium">{item.product?.name || 'Unknown'}</span>
                    </div>
                    <span className="text-brand font-bold">{item.quantity} sold</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activities */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📊</span>
              <span>Recent Activities</span>
            </h3>
            {stats.recentActivities.length === 0 ? (
              <p className="text-muted text-sm">No recent activities</p>
            ) : (
              <div className="space-y-2">
                {stats.recentActivities.map((activity: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors">
                    <span className="text-xl">{activity.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted">{new Date(activity.date).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link 
              href="/visits"
              className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:shadow-md transition-all text-center"
            >
              <span className="text-3xl block mb-2">🏥</span>
              <span className="text-sm font-medium">New Visit</span>
            </Link>
            <Link 
              href="/prescriptions"
              className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:shadow-md transition-all text-center"
            >
              <span className="text-3xl block mb-2">💊</span>
              <span className="text-sm font-medium">Prescriptions</span>
            </Link>
            <Link 
              href="/purchase-orders"
              className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:shadow-md transition-all text-center"
            >
              <span className="text-3xl block mb-2">📦</span>
              <span className="text-sm font-medium">Purchase Order</span>
            </Link>
            <Link 
              href="/invoices"
              className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:shadow-md transition-all text-center"
            >
              <span className="text-3xl block mb-2">💳</span>
              <span className="text-sm font-medium">Invoices</span>
            </Link>
          </div>
        </div>
      </div>
  )
}
