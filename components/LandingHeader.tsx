import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AppSwitcherModal from './AppSwitcherModal'

export default function LandingHeader() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [appSwitcherModalOpen, setAppSwitcherModalOpen] = useState(false)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        // Fetch user data
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => setUser(data.user))
            .catch(() => setUser(null))
    }, [])

    const [dark, setDark] = useState(false)

    useEffect(() => {
        try {
            const stored = localStorage.getItem('theme')
            if (stored) {
                setDark(stored === 'dark')
                document.documentElement.classList.toggle('dark', stored === 'dark')
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                setDark(true)
                document.documentElement.classList.add('dark')
            }
        } catch (e) { }
    }, [])

    const toggleTheme = () => {
        const next = !dark
        setDark(next)
        try {
            localStorage.setItem('theme', next ? 'dark' : 'light')
            document.documentElement.classList.toggle('dark', next)
        } catch (e) { }
    }

    return (
        <>
            <AppSwitcherModal 
                isOpen={appSwitcherModalOpen}
                onClose={() => setAppSwitcherModalOpen(false)}
                currentApp="website"
                user={user}
            />
            
            <header className="sticky top-5 z-50 w-[90%] md:w-[70%] lg:w-[75%] lg:max-w-screen-xl mx-auto rounded-2xl shadow-inner bg-white/80 dark:bg-black/15 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 py-2">
            <div className="mx-auto px-2 sm:px-4 flex justify-between items-center">
                <div className="flex items-center gap-3 sm:gap-6">
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-800 dark:text-white"
                        aria-label="Toggle menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>

                    {/* Logo and Title with App Switcher Icon */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <img src="/favicon.png" alt="LLC" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                        <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Last Leaf Care</h1>
                        
                        {/* App Switcher Icon Button */}
                        <button
                            onClick={() => setAppSwitcherModalOpen(true)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200 group"
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

                    <nav className="hidden md:flex items-center gap-1">
                        <Link href="/" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium text-sm text-gray-800 dark:text-white">Home</Link>
                        <Link href="/about" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium text-sm text-gray-800 dark:text-white">About</Link>
                        <Link href="/services" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium text-sm text-gray-800 dark:text-white">Services</Link>
                        <Link href="/gallery" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium text-sm text-gray-800 dark:text-white">Gallery</Link>
                        <Link href="/contact" className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium text-sm text-gray-800 dark:text-white">Contact</Link>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <a href="https://github.com/ku28/lastleafcare.git" target="_blank" rel="noreferrer" className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">Connect With Us</a>
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
                </div>
            </div>

            {mobileOpen && (
                <div className="md:hidden mt-4 px-4 border-t border-gray-200 dark:border-gray-700/50 pt-4">
                    <nav className="flex flex-col gap-2">
                        <Link href="/" className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium text-sm text-gray-800 dark:text-white">Home</Link>
                        <Link href="/about" className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium text-sm text-gray-800 dark:text-white">About</Link>
                        <Link href="/services" className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium text-sm text-gray-800 dark:text-white">Services</Link>
                        <Link href="/gallery" className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium text-sm text-gray-800 dark:text-white">Gallery</Link>
                        <Link href="/contact" className="px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors font-medium text-sm text-gray-800 dark:text-white">Contact</Link>
                        <div className="flex gap-2 mt-2">
                            <a href="https://github.com/ku28/lastleafcare.git" target="_blank" rel="noreferrer" className="flex-1 text-center px-4 py-3 bg-brand text-white rounded-lg hover:bg-brand-600 transition-colors">Connect</a>
                        </div>
                    </nav>
                </div>
            )}
        </header>
        </>
    )
}
