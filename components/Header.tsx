import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { canAccessRoute } from '../lib/permissions'
import ImportNotifications from './ImportNotifications'

interface HeaderProps {
  title?: string
  onOpenTokenSidebar?: () => void
}

export default function Header({ title = 'LLC ERP', onOpenTokenSidebar }: HeaderProps) {
  const [user, setUser] = useState<any>(null)
  const [dark, setDark] = useState<boolean>(false)
  const [accountingOpen, setAccountingOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [appDropdownOpen, setAppDropdownOpen] = useState(false)
  const router = useRouter()

  // Helper to check if user can access a route
  const canAccess = (route: string) => {
    if (!user) return false
    return canAccessRoute(user.role, route)
  }

  // Helper to check if user is reception
  const isReception = user?.role === 'reception'
  
  // Helper to check if user is a patient (user role)
  const isPatient = user?.role?.toLowerCase() === 'user'

  // Function to fetch user data
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user)
    } catch (err) {
      console.error('Failed to fetch user:', err)
    }
  }

  useEffect(() => {
    // Fetch user on mount
    fetchUser()

    // Re-fetch user when page becomes visible (handles navigation/refresh)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUser()
      }
    }

    // Re-fetch user when window gains focus (handles returning to tab)
    const handleFocus = () => {
      fetchUser()
    }

    // Re-fetch user when custom login event is dispatched
    const handleUserLogin = () => {
      fetchUser()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('user-login', handleUserLogin)

    // initialize theme from localStorage or prefers-color-scheme
    try {
      const stored = localStorage.getItem('theme')
      if (stored) {
        setDark(stored === 'dark')
        document.documentElement.classList.toggle('dark', stored === 'dark')
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setDark(true)
        document.documentElement.classList.add('dark')
      }
    } catch (e) {
      // ignore (SSR)
    }

    // Cleanup listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('user-login', handleUserLogin)
    }
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
      // add a transient class to animate the transition
      document.documentElement.classList.add('theme-transition')
      document.documentElement.classList.toggle('dark', next)
      window.setTimeout(() => document.documentElement.classList.remove('theme-transition'), 300)
    } catch (e) {
      // ignore
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setUserDropdownOpen(false)
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Navigate to the main ERP app (dashboard) but ensure auth is checked first.
  const handleLLCERPClick = async () => {
    setAppDropdownOpen(false)
    let u = user
    // If we don't have a user yet, try to fetch latest auth state before deciding
    if (!u) {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        u = data.user
        setUser(u)
      } catch (e) {
        // ignore and treat as unauthenticated
        u = null
      }
    }

    if (u) {
      router.push('/dashboard')
    } else {
      router.push(`/login?next=${encodeURIComponent('/dashboard')}`)
    }
  }

  return (
    <header className="panel shadow-sm py-4 mb-8 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex justify-between items-center">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Logo and Title with Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setAppDropdownOpen(true)}
            onMouseLeave={() => setAppDropdownOpen(false)}
          >
            <button className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity pb-2">
              <img 
                src="/favicon.png" 
                alt="LLC Logo" 
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              />
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-brand to-green-600 bg-clip-text text-transparent">{title}</h1>
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* App Dropdown Menu */}
            {appDropdownOpen && (
              <div className="absolute left-0 top-full pt-2 z-50">
                <div className="w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                  {(() => {
                    const current = router.pathname === '/' ? 'website' : 'erp'
                    const items = [
                      { key: 'website', label: 'LLC Website', href: '/' },
                      { key: 'erp', label: 'LLC ERP', action: handleLLCERPClick },
                    ]
                    items.sort((a, b) => (a.key === current ? -1 : b.key === current ? 1 : 0))

                    return items.map((it) => {
                      const selected = it.key === current
                      const base = 'flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 transition-colors w-full text-left'
                      const hover = 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      const selCls = selected ? 'bg-gray-100 dark:bg-gray-700 font-medium' : hover

                      if (it.href) {
                        return (
                          <Link
                            href={it.href}
                            key={it.key}
                            className={`${base} ${selCls}`}
                            onClick={() => setAppDropdownOpen(false)}
                          >
                            <img src="/favicon.png" alt="logo" className="w-6 h-6 object-contain" />
                            <span className="font-medium">{it.label}</span>
                            {selected && <span className="ml-auto text-brand">✓</span>}
                          </Link>
                        )
                      }

                      return (
                        <button
                          key={it.key}
                          onClick={() => {
                            setAppDropdownOpen(false)
                            it.action && it.action()
                          }}
                          className={`${base} ${selCls}`}
                        >
                          <img src="/favicon.png" alt="logo" className="w-6 h-6 object-contain" />
                          <span className="font-medium">{it.label}</span>
                          {selected && <span className="ml-auto text-brand">✓</span>}
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* main nav - hidden on small screens */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Patient/User Navigation */}
            {isPatient && (
              <>
                <Link href="/user-dashboard" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Dashboard</Link>
                <Link href="/visits" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Appointments</Link>
                <Link href="/prescriptions" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Prescriptions</Link>
              </>
            )}
            
            {/* Staff/Admin/Doctor/Reception Navigation */}
            {!isPatient && (
              <>
                {canAccess('/dashboard') && <Link href="/dashboard" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Dashboard</Link>}
                {canAccess('/patients') && <Link href="/patients" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Patients</Link>}
                {canAccess('/treatments') && <Link href="/treatments" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Treatments</Link>}
                {canAccess('/products') && <Link href="/products" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Inventory</Link>}
                {canAccess('/visits') && <Link href="/visits" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Visits</Link>}
                
                {/* Show Invoices link directly for reception, or in dropdown for others */}
                {isReception && canAccess('/invoices') && (
                  <Link href="/invoices" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Invoices</Link>
                )}
                
                {/* Accounting Dropdown - only show for non-reception users who can access accounting features */}
                {!isReception && (canAccess('/suppliers') || canAccess('/purchase-orders') || canAccess('/invoices') || canAccess('/stock-transactions') || canAccess('/analytics')) && (
                <div className="relative">
                  <button
                    onMouseEnter={() => setAccountingOpen(true)}
                    onClick={() => setAccountingOpen(!accountingOpen)}
                    className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm flex items-center gap-1"
                  >
                    Accounting
                    <svg className={`w-4 h-4 transition-transform ${accountingOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {accountingOpen && (
                    <div 
                      className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                      onMouseEnter={() => setAccountingOpen(true)}
                      onMouseLeave={() => setAccountingOpen(false)}
                    >
                      {canAccess('/suppliers') && (
                        <Link 
                          href="/suppliers" 
                          className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                          onClick={() => setAccountingOpen(false)}
                        >
                          Suppliers
                        </Link>
                      )}
                      {canAccess('/purchase-orders') && (
                        <Link 
                          href="/purchase-orders" 
                          className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                          onClick={() => setAccountingOpen(false)}
                        >
                          Purchase Orders
                        </Link>
                      )}
                      {canAccess('/invoices') && (
                        <Link 
                          href="/invoices" 
                          className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                          onClick={() => setAccountingOpen(false)}
                        >
                          Invoices
                        </Link>
                      )}
                      {canAccess('/stock-transactions') && (
                        <Link 
                          href="/stock-transactions" 
                          className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                          onClick={() => setAccountingOpen(false)}
                        >
                          Inventory History
                        </Link>
                      )}
                      {canAccess('/analytics') && (
                        <Link 
                          href="/analytics" 
                          className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                          onClick={() => setAccountingOpen(false)}
                        >
                          Analytics
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                )}
              </>
            )}
          </nav>

        </div>
        <div className="flex items-center gap-3">
          {/* Import Notifications - only for admin/reception */}
          {user && !isPatient && <ImportNotifications />}

          {/* Tokens button for admin/reception */}
          {user && !isPatient && (
            <button 
              onClick={onOpenTokenSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
              title="Token Queue"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </button>
          )}

          {/* Requests button for admin/reception */}
          {user && !isPatient && (
            <Link 
              href="/requests"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
              title="Appointment Requests"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </Link>
          )}
          
          {/* My Requests button for patients */}
          {user && isPatient && (
            <Link 
              href="/my-requests"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
              title="My Appointment Requests"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </Link>
          )}
          
          {/* theme toggle (sun/moon) - shows both icons with a sliding knob */}
          <button
            aria-label="Toggle theme"
            aria-pressed={dark}
            onClick={toggleTheme}
            title={dark ? 'Switch to light' : 'Switch to dark'}
            className={`theme-toggle ${dark ? 'is-dark' : ''}`}
          >
            <span className="toggle-icon toggle-sun" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.8 1.8-1.8zM1 13h3v-2H1v2zm10-9h2V1h-2v3zm7.03 1.05l1.8-1.8-1.8-1.79-1.79 1.79 1.79 1.8zM17 13h3v-2h-3v2zM6.76 19.16l-1.8 1.79L3.17 19.16l1.79-1.79 1.8 1.79zM12 20a1 1 0 110 2 1 1 0 010-2zm0-6a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </span>
            <span className="toggle-icon toggle-moon" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </span>
            <span className="toggle-knob" aria-hidden />
          </button>

          {user ? (
            <div 
              className="relative"
              onMouseEnter={() => setUserDropdownOpen(true)}
              onMouseLeave={() => setUserDropdownOpen(false)}
            >
              <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
                {user.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
                    <span className="text-sm font-bold text-white">
                      {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="text-sm hidden sm:block">
                  <div className="font-medium">{user.name || user.email}</div>
                  <div className="text-xs text-muted">{user.role}</div>
                </div>
              </Link>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <Link 
                    href="/profile" 
                    className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      <span>👤</span>
                      <span>View Profile</span>
                    </div>
                  </Link>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>🚪</span>
                      <span>Logout</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-600 transition-all hover:shadow-lg font-medium text-sm">Login</Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 px-2 sm:px-4">
          <nav className="flex flex-col space-y-1">
            {/* Patient/User Mobile Navigation */}
            {isPatient && (
              <>
                <Link 
                  href="/user-dashboard" 
                  className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/visits" 
                  className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Appointments
                </Link>
                <Link 
                  href="/prescriptions" 
                  className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Prescriptions
                </Link>
              </>
            )}
            
            {/* Staff/Admin/Doctor/Reception Mobile Navigation */}
            {!isPatient && (
              <>
                {canAccess('/dashboard') && (
                  <Link 
                    href="/" 
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
                {canAccess('/patients') && (
                  <Link 
                    href="/patients" 
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Patients
                  </Link>
                )}
                {canAccess('/treatments') && (
                  <Link 
                    href="/treatments" 
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Treatments
                  </Link>
                )}
                {canAccess('/products') && (
                  <Link 
                    href="/products" 
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Inventory
                  </Link>
                )}
                {canAccess('/visits') && (
                  <Link 
                    href="/visits" 
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Visits
                  </Link>
                )}
                {canAccess('/invoices') && (
                  <Link 
                    href="/invoices" 
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Invoices
                  </Link>
                )}
                {canAccess('/suppliers') && (
                  <Link 
                    href="/suppliers" 
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Suppliers
                  </Link>
                )}
                {canAccess('/purchase-orders') && (
                  <Link 
                    href="/purchase-orders" 
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Purchase Orders
                  </Link>
                )}
                {canAccess('/stock-transactions') && (
                  <Link 
                    href="/stock-transactions" 
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Inventory History
                  </Link>
                )}
                {canAccess('/analytics') && (
                  <Link 
                    href="/analytics" 
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Analytics
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
