import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Header({ title = 'LLC ERP' }: { title?: string }) {
  const [user, setUser] = useState<any>(null)
  const [dark, setDark] = useState<boolean>(false)
  const router = useRouter()

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

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      // Use Next.js router instead of window.location to preserve theme
      router.push('/')
    } catch (err) {
      console.error('Logout failed:', err)
      // Fallback to window.location if router fails
      window.location.href = '/'
    }
  }

  return (
    <header className="panel shadow-sm py-4 mb-8 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
  <div className="max-w-6xl mx-auto px-2 sm:px-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-brand to-green-600 bg-clip-text text-transparent">{title}</h1>

          {/* main nav - hidden on small screens */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Dashboard</Link>
            <Link href="/patients" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Patients</Link>
            <Link href="/treatments" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Treatments</Link>
            <Link href="/products" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Inventory</Link>
            <Link href="/visits" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm">Visits</Link>
          </nav>

        </div>
        <div className="flex items-center gap-3">
          {/* quick access to prescriptions page */}
          <Link href="/prescriptions" className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-green-600 transition-all hover:shadow-lg font-medium text-sm">Prescriptions</Link>

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
            <div className="flex items-center gap-3">
              <div className="text-sm hidden sm:block">
                <div className="font-medium">{user.name || user.email}</div>
                <div className="text-xs text-muted">{user.role}</div>
              </div>
              <button onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all hover:shadow-lg font-medium text-sm">Logout</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-green-600 transition-all hover:shadow-lg font-medium text-sm">Login</Link>
              <Link href="/signup" className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-green-600 transition-all hover:shadow-lg font-medium text-sm hidden sm:inline-block">Signup</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
