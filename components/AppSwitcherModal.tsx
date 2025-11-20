import { useRouter } from 'next/router'
import { useEffect } from 'react'

interface AppSwitcherModalProps {
    isOpen: boolean
    onClose: () => void
    currentApp: 'website' | 'erp'
    user: any
}

export default function AppSwitcherModal({ isOpen, onClose, currentApp, user }: AppSwitcherModalProps) {
    const router = useRouter()

    // Close modal on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const handleWebsiteClick = () => {
        onClose()
        router.push('/')
    }

    const handleERPClick = async () => {
        onClose()
        let u = user
        // If we don't have a user yet, try to fetch latest auth state before deciding
        if (!u) {
            try {
                const res = await fetch('/api/auth/me')
                const data = await res.json()
                u = data.user
            } catch (e) {
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
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
            onClick={onClose}
            style={{
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

            <div
                className="relative max-w-2xl w-full"
                onClick={(e) => e.stopPropagation()}
                style={{
                    animation: 'slideUp 0.3s ease-out'
                }}
            >
                {/* Modal Card */}
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-700 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-2xl shadow-emerald-500/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>

                    {/* Header */}
                    <div className="relative border-b border-emerald-200/50 dark:border-emerald-700/50 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Switch Application</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Choose which app you want to use</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors"
                            aria-label="Close modal"
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="relative p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Website Box */}
                            <button
                                onClick={handleWebsiteClick}
                                className={`group relative overflow-hidden rounded-xl p-6 transition-all duration-300 ${currentApp === 'website'
                                        ? 'bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/20'
                                        : 'bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-2 border-emerald-200/50 dark:border-emerald-700/50 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-500/10'
                                    }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                                <div className="relative flex flex-col items-center gap-4">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${currentApp === 'website'
                                            ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 scale-110'
                                            : 'bg-gradient-to-br from-emerald-400 to-green-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/30'
                                        }`}>
                                        <img
                                            src="/favicon.png"
                                            alt="Website Logo"
                                            className="w-10 h-10 object-contain"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Last Leaf Care</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Public website & information</p>
                                    </div>
                                    {currentApp === 'website' && (
                                        <div className="absolute top-3 right-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                Active
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>

                            {/* ERP Box */}
                            <button
                                onClick={handleERPClick}
                                className={`group relative overflow-hidden rounded-xl p-6 transition-all duration-300 ${currentApp === 'erp'
                                        ? 'bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/20'
                                        : 'bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-2 border-emerald-200/50 dark:border-emerald-700/50 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-500/10'
                                    }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                                <div className="relative flex flex-col items-center gap-4">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${currentApp === 'erp'
                                            ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 scale-110'
                                            : 'bg-gradient-to-br from-emerald-400 to-green-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/30'
                                        }`}>
                                        <img
                                            src="/favicon.png"
                                            alt="ERP Logo"
                                            className="w-10 h-10 object-contain"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">LLC ERP</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Management & operations</p>
                                    </div>
                                    {currentApp === 'erp' && (
                                        <div className="absolute top-3 right-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                Active
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        </div>

                        <div className="mt-6 pt-4 border-t border-emerald-200/50 dark:border-emerald-700/50">
                            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                Click on an app to switch. Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Esc</kbd> to close.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
