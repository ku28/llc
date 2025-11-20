import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { canAccessRoute } from '../lib/permissions'
import ImportNotifications from './ImportNotifications'
import AppSwitcherModal from './AppSwitcherModal'

interface HeaderProps {
  title?: string
  onOpenTokenSidebar?: () => void
}

export default function Header({ onOpenTokenSidebar }: HeaderProps) {
  const [user, setUser] = useState<any>(null)
  const [dark, setDark] = useState<boolean>(false)
  const [accountingOpen, setAccountingOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [appSwitcherModalOpen, setAppSwitcherModalOpen] = useState(false)
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Determine current app and title
  const landingPages = ['/', '/about', '/services', '/gallery', '/contact']
  const isWebsite = landingPages.includes(router.pathname)
  const currentApp = isWebsite ? 'website' : 'erp'
  const title = isWebsite ? 'Last Leaf Care' : 'LLC ERP'

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

  // Update indicator position when route changes
  useEffect(() => {
    const updateIndicator = () => {
      if (!navRef.current) return
      
      const activeLink = navRef.current.querySelector('[data-active="true"]') as HTMLElement
      if (activeLink) {
        const navRect = navRef.current.getBoundingClientRect()
        const linkRect = activeLink.getBoundingClientRect()
        setIndicatorStyle({
          left: linkRect.left - navRect.left,
          width: linkRect.width
        })
      } else {
        setIndicatorStyle(null)
      }
    }

    // Update on mount and route change
    updateIndicator()
    
    // Update after a small delay to ensure DOM is ready
    const timer = setTimeout(updateIndicator, 50)
    
    return () => clearTimeout(timer)
  }, [router.pathname, user])

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

  return (
    <>
      <AppSwitcherModal 
        isOpen={appSwitcherModalOpen}
        onClose={() => setAppSwitcherModalOpen(false)}
        currentApp={currentApp}
        user={user}
      />
      
      <header className="border-b border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-r from-white via-emerald-50/20 to-green-50/10 dark:from-gray-900 dark:via-emerald-950/10 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-md py-4 mb-8 sticky top-0 z-50">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/3 via-transparent to-green-500/3 pointer-events-none"></div>
      <div className="relative max-w-7xl mx-auto px-2 sm:px-4 flex justify-between items-center">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
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

          {/* Logo and Title with App Switcher Icon */}
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src="/favicon.png" 
              alt="LLC Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
            />
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-brand to-green-600 bg-clip-text text-transparent">{title}</h1>
            
            {/* App Switcher Icon Button */}
            <button
              onClick={() => setAppSwitcherModalOpen(true)}
              className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-all duration-200 group"
              aria-label="Switch application"
              title="Switch between Last Leaf Care and LLC ERP"
            >
              <svg 
                className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>

          {/* main nav - hidden on small screens */}
          <nav ref={navRef} className="hidden md:flex items-center gap-1 relative">
            {/* Sliding indicator */}
            {indicatorStyle && (
              <span 
                className="absolute bottom-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-300 ease-out"
                style={{ 
                  left: `${indicatorStyle.left}px`, 
                  width: `${indicatorStyle.width}px` 
                }}
              />
            )}
            
            {/* Patient/User Navigation */}
            {isPatient && (
              <>
                <Link href="/user-dashboard" data-active={router.pathname === '/user-dashboard'} className={`px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm relative ${router.pathname === '/user-dashboard' ? 'text-green-600 dark:text-green-400' : ''}`}>
                  Dashboard
                </Link>
                <Link href="/visits" data-active={router.pathname === '/visits'} className={`px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm relative ${router.pathname === '/visits' ? 'text-green-600 dark:text-green-400' : ''}`}>
                  Appointments
                </Link>
                <Link href="/prescriptions" data-active={router.pathname === '/prescriptions'} className={`px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm relative ${router.pathname === '/prescriptions' ? 'text-green-600 dark:text-green-400' : ''}`}>
                  Prescriptions
                </Link>
              </>
            )}
            
            {/* Staff/Admin/Doctor/Reception Navigation */}
            {!isPatient && (
              <>
                {canAccess('/dashboard') && (
                  <Link href="/dashboard" data-active={router.pathname === '/dashboard'} className={`px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm relative ${router.pathname === '/dashboard' ? 'text-green-600 dark:text-green-400' : ''}`}>
                    Dashboard
                  </Link>
                )}
                {canAccess('/patients') && (
                  <Link href="/patients" data-active={router.pathname === '/patients'} className={`px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm relative ${router.pathname === '/patients' ? 'text-green-600 dark:text-green-400' : ''}`}>
                    Patients
                  </Link>
                )}
                {canAccess('/treatments') && (
                  <Link href="/treatments" data-active={router.pathname === '/treatments'} className={`px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm relative ${router.pathname === '/treatments' ? 'text-green-600 dark:text-green-400' : ''}`}>
                    Treatments
                  </Link>
                )}
                {canAccess('/products') && (
                  <Link href="/products" data-active={router.pathname === '/products'} className={`px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm relative ${router.pathname === '/products' ? 'text-green-600 dark:text-green-400' : ''}`}>
                    Inventory
                  </Link>
                )}
                {canAccess('/visits') && (
                  <Link href="/visits" data-active={router.pathname === '/visits'} className={`px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm relative ${router.pathname === '/visits' ? 'text-green-600 dark:text-green-400' : ''}`}>
                    Visits
                  </Link>
                )}
                
                {/* Show Invoices link directly for reception, or in dropdown for others */}
                {isReception && canAccess('/invoices') && (
                  <Link href="/invoices" data-active={router.pathname === '/invoices'} className={`px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm relative ${router.pathname === '/invoices' ? 'text-green-600 dark:text-green-400' : ''}`}>
                    Invoices
                  </Link>
                )}
                
                {/* Accounting Dropdown - only show for non-reception users who can access accounting features */}
                {!isReception && (canAccess('/suppliers') || canAccess('/purchase-orders') || canAccess('/invoices') || canAccess('/stock-transactions') || canAccess('/analytics')) && (
                <div className="relative">
                  <button
                    data-active={['/suppliers', '/purchase-orders', '/invoices', '/stock-transactions', '/analytics'].includes(router.pathname)}
                    onMouseEnter={() => setAccountingOpen(true)}
                    onClick={() => setAccountingOpen(!accountingOpen)}
                    className={`px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm flex items-center gap-1 relative ${['/suppliers', '/purchase-orders', '/invoices', '/stock-transactions', '/analytics'].includes(router.pathname) ? 'text-green-600 dark:text-green-400' : ''}`}
                  >
                    Accounting
                    <svg className={`w-4 h-4 transition-transform ${accountingOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {accountingOpen && (
                    <div 
                      className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/10 backdrop-blur-sm py-1 z-50 overflow-hidden"
                      onMouseEnter={() => setAccountingOpen(true)}
                      onMouseLeave={() => setAccountingOpen(false)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-lg"></div>
                      <div className="relative">
                      {canAccess('/suppliers') && (
                        <Link 
                          href="/suppliers" 
                          className={`block px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm ${router.pathname === '/suppliers' ? 'text-green-600 dark:text-green-400 font-semibold' : ''}`}
                          onClick={() => setAccountingOpen(false)}
                        >
                          Suppliers
                        </Link>
                      )}
                      {canAccess('/purchase-orders') && (
                        <Link 
                          href="/purchase-orders" 
                          className={`block px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm ${router.pathname === '/purchase-orders' ? 'text-green-600 dark:text-green-400 font-semibold' : ''}`}
                          onClick={() => setAccountingOpen(false)}
                        >
                          Purchase Orders
                        </Link>
                      )}
                      {canAccess('/invoices') && (
                        <Link 
                          href="/invoices" 
                          className={`block px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm ${router.pathname === '/invoices' ? 'text-green-600 dark:text-green-400 font-semibold' : ''}`}
                          onClick={() => setAccountingOpen(false)}
                        >
                          Invoices
                        </Link>
                      )}
                      {canAccess('/stock-transactions') && (
                        <Link 
                          href="/stock-transactions" 
                          className={`block px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm ${router.pathname === '/stock-transactions' ? 'text-green-600 dark:text-green-400 font-semibold' : ''}`}
                          onClick={() => setAccountingOpen(false)}
                        >
                          Inventory History
                        </Link>
                      )}
                      {canAccess('/analytics') && (
                        <Link 
                          href="/analytics" 
                          className={`block px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-sm ${router.pathname === '/analytics' ? 'text-green-600 dark:text-green-400 font-semibold' : ''}`}
                          onClick={() => setAccountingOpen(false)}
                        >
                          Analytics
                        </Link>
                      )}
                      </div>
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
              className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors relative"
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
              className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors relative"
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
              className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors relative"
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
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm py-2 z-50 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                  <div className="relative">
                  <Link 
                    href="/profile" 
                    className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
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
                  className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/visits" 
                  className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Appointments
                </Link>
                <Link 
                  href="/prescriptions" 
                  className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
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
                    className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
                {canAccess('/patients') && (
                  <Link 
                    href="/patients" 
                    className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Patients
                  </Link>
                )}
                {canAccess('/treatments') && (
                  <Link 
                    href="/treatments" 
                    className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Treatments
                  </Link>
                )}
                {canAccess('/products') && (
                  <Link 
                    href="/products" 
                    className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Inventory
                  </Link>
                )}
                {canAccess('/visits') && (
                  <Link 
                    href="/visits" 
                    className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Visits
                  </Link>
                )}
                {canAccess('/invoices') && (
                  <Link 
                    href="/invoices" 
                    className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Invoices
                  </Link>
                )}
                {canAccess('/suppliers') && (
                  <Link 
                    href="/suppliers" 
                    className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Suppliers
                  </Link>
                )}
                {canAccess('/purchase-orders') && (
                  <Link 
                    href="/purchase-orders" 
                    className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Purchase Orders
                  </Link>
                )}
                {canAccess('/stock-transactions') && (
                  <Link 
                    href="/stock-transactions" 
                    className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Inventory History
                  </Link>
                )}
                {canAccess('/analytics') && (
                  <Link 
                    href="/analytics" 
                    className="px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium text-sm"
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
    </>
  )
}
