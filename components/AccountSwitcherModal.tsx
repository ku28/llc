import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

interface AccountSwitcherModalProps {
    isOpen: boolean
    onClose: () => void
    currentUser: any
}

interface SavedAccount {
    id: number
    name: string
    email: string
    role: string
    profileImage?: string
    sessionToken: string
    lastActive: number
}

export default function AccountSwitcherModal({ isOpen, onClose, currentUser }: AccountSwitcherModalProps) {
    const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
    const [isAnimating, setIsAnimating] = useState(false)
    const [expandedAccountId, setExpandedAccountId] = useState<number | null>(null)
    const [password, setPassword] = useState('')
    const [reAuthLoading, setReAuthLoading] = useState(false)
    const [isSwitching, setIsSwitching] = useState(false)
    const [switchSuccess, setSwitchSuccess] = useState(false)
    const [switchedUserName, setSwitchedUserName] = useState('')
    const [activeTab, setActiveTab] = useState<'admin' | 'receptionist' | 'doctor'>('admin')
    const router = useRouter()

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(false)
            setIsSwitching(false)
            setSwitchSuccess(false)
            setTimeout(() => setIsAnimating(true), 10)
            loadSavedAccounts()
        } else {
            setIsAnimating(false)
            setIsSwitching(false)
            setSwitchSuccess(false)
        }
    }, [isOpen, currentUser])

    const loadSavedAccounts = () => {
        try {
            const stored = localStorage.getItem('savedAccounts')
            console.log('Raw stored accounts:', stored)
            if (stored) {
                const accounts: SavedAccount[] = JSON.parse(stored)
                console.log('Parsed accounts:', accounts)
                console.log('Current user ID:', currentUser?.id)
                // Filter out the current user and sort by last active
                const filteredAccounts = accounts
                    .filter(acc => acc.id !== currentUser?.id)
                    .sort((a, b) => b.lastActive - a.lastActive)
                console.log('Filtered accounts:', filteredAccounts)
                setSavedAccounts(filteredAccounts)
            } else {
                console.log('No saved accounts found in localStorage')
            }
        } catch (e) {
            console.error('Failed to load saved accounts:', e)
        }
    }

    const saveCurrentAccount = async () => {
        if (!currentUser) return

        try {
            // Get session token from server-side API (HttpOnly cookie)
            const response = await fetch('/api/auth/get-session-token')
            if (!response.ok) {
                console.error('Failed to get session token')
                return
            }

            const { sessionToken } = await response.json()
            if (!sessionToken) {
                console.error('No session token returned')
                return
            }

            const stored = localStorage.getItem('savedAccounts')
            const accounts: SavedAccount[] = stored ? JSON.parse(stored) : []

            // Check if current account is already saved
            const existingIndex = accounts.findIndex(acc => acc.id === currentUser.id)

            const accountData: SavedAccount = {
                id: currentUser.id,
                name: currentUser.name || currentUser.email,
                email: currentUser.email,
                role: currentUser.role,
                profileImage: currentUser.profileImage,
                sessionToken,
                lastActive: Date.now()
            }

            if (existingIndex >= 0) {
                // Update existing account
                accounts[existingIndex] = accountData
            } else {
                // Add new account
                accounts.push(accountData)
            }

            // Keep only last 10 accounts
            const limitedAccounts = accounts.slice(-10)
            localStorage.setItem('savedAccounts', JSON.stringify(limitedAccounts))
        } catch (e) {
            console.error('Failed to save current account:', e)
        }
    }

    const switchToAccount = async (account: SavedAccount) => {
        try {
            setIsSwitching(true)
            
            // Save current account before switching
            await saveCurrentAccount()

            console.log('=== SWITCHING ACCOUNT ===')
            console.log('Target account:', account.email, 'ID:', account.id)
            console.log('Session token length:', account.sessionToken?.length)

            // Call the API to switch sessions server-side
            const response = await fetch('/api/auth/switch-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken: account.sessionToken })
            })

            console.log('Switch session API response:', response.status, response.ok)

            if (response.ok) {
                const data = await response.json()
                console.log('Switched to user:', data.user?.email)
                console.log('Account object:', account)
                console.log('Account role from saved data:', account.role)

                // Update last active time
                updateAccountLastActive(account.id)

                // Clear any cached user data to force fresh load
                sessionStorage.removeItem('currentUser')
                sessionStorage.removeItem('authChecked')

                // Determine redirect path based on role FIRST
                const redirectPath = account.role?.toLowerCase() === 'receptionist' ? '/patients' : '/dashboard'
                console.log('Will redirect to:', redirectPath, 'because role is:', account.role)

                // Cache the user data with role before redirect
                sessionStorage.setItem('currentUser', JSON.stringify(data.user))

                // Show success message briefly
                setSwitchedUserName(account.name)
                setSwitchSuccess(true)
                
                // Redirect immediately without delay to prevent dashboard flash
                setTimeout(() => {
                    console.log('Executing redirect to:', redirectPath)
                    window.location.replace(redirectPath)
                }, 500)
            } else {
                const error = await response.json()
                console.error('Failed to switch session:', error)
                // Session expired, remove from saved accounts
                removeAccount(account.id)
                setIsSwitching(false)
                alert('This session has expired. Please log in again.')
            }
        } catch (error) {
            console.error('Failed to switch account:', error)
            setIsSwitching(false)
            alert('Failed to switch account. Please try again.')
        }
    }

    const updateAccountLastActive = (accountId: number) => {
        try {
            const stored = localStorage.getItem('savedAccounts')
            if (stored) {
                const accounts: SavedAccount[] = JSON.parse(stored)
                const accountIndex = accounts.findIndex(acc => acc.id === accountId)
                if (accountIndex >= 0) {
                    accounts[accountIndex].lastActive = Date.now()
                    localStorage.setItem('savedAccounts', JSON.stringify(accounts))
                }
            }
        } catch (e) {
            console.error('Failed to update last active:', e)
        }
    }

    const removeAccount = (accountId: number) => {
        try {
            const stored = localStorage.getItem('savedAccounts')
            if (stored) {
                const accounts: SavedAccount[] = JSON.parse(stored)
                const filteredAccounts = accounts.filter(acc => acc.id !== accountId)
                localStorage.setItem('savedAccounts', JSON.stringify(filteredAccounts))
                setSavedAccounts(filteredAccounts.filter(acc => acc.id !== currentUser?.id))
            }
        } catch (e) {
            console.error('Failed to remove account:', e)
        }
    }

    const handleAccountClick = (account: SavedAccount) => {
        if (isAccountExpired(account.lastActive)) {
            // Expand to show password input
            setExpandedAccountId(expandedAccountId === account.id ? null : account.id)
            setPassword('')
        } else {
            // Switch directly
            switchToAccount(account)
        }
    }

    const handleReAuthenticate = async (account: SavedAccount) => {
        if (!password) {
            alert('Please enter your password')
            return
        }

        setReAuthLoading(true)
        setIsSwitching(true)
        try {
            // Try to login with email and password
            const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailOrPhone: account.email, password })
            })

            if (!loginRes.ok) {
                alert('Invalid password')
                setReAuthLoading(false)
                setIsSwitching(false)
                return
            }

            // Get new session token
            await new Promise(resolve => setTimeout(resolve, 200))
            const tokenRes = await fetch('/api/auth/get-session-token')
            if (!tokenRes.ok) {
                alert('Failed to get session token')
                setReAuthLoading(false)
                setIsSwitching(false)
                return
            }

            const { sessionToken } = await tokenRes.json()

            // Update the account with new token and timestamp
            const stored = localStorage.getItem('savedAccounts')
            if (stored) {
                const accounts: SavedAccount[] = JSON.parse(stored)
                const accountIndex = accounts.findIndex(acc => acc.id === account.id)
                if (accountIndex >= 0) {
                    accounts[accountIndex].sessionToken = sessionToken
                    accounts[accountIndex].lastActive = Date.now()
                    localStorage.setItem('savedAccounts', JSON.stringify(accounts))
                }
            }

            // Clear any cached user data
            sessionStorage.removeItem('currentUser')
            sessionStorage.removeItem('authChecked')

            // Show success message
            setSwitchedUserName(account.name)
            setSwitchSuccess(true)

            // Redirect immediately
            setTimeout(() => {
                const redirectPath = account.role?.toLowerCase() === 'receptionist' ? '/patients' : '/dashboard'
                console.log('Re-auth redirect to:', redirectPath, 'for role:', account.role)
                window.location.replace(redirectPath)
            }, 500)
        } catch (error) {
            console.error('Re-authentication failed:', error)
            alert('Failed to re-authenticate. Please try again.')
            setIsSwitching(false)
        } finally {
            setReAuthLoading(false)
        }
    }

    const addNewAccount = () => {
        // Save current account before adding new
        saveCurrentAccount()
        onClose()
        router.push('/login?mode=add')
    }

    const isAccountExpired = (timestamp: number) => {
        const now = Date.now()
        const diff = now - timestamp
        const hours = diff / 3600000
        return hours >= 24
    }

    const getTimeSinceActive = (timestamp: number) => {
        const now = Date.now()
        const diff = now - timestamp
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (days > 0) return `${days}d ago`
        if (hours > 0) return `${hours}h ago`
        if (minutes > 0) return `${minutes}m ago`
        return 'Just now'
    }

    if (!isOpen) return null

    // Loading/Success overlay
    if (isSwitching) {
        return (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
            >
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-2xl backdrop-blur-sm max-w-md w-full p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                    
                    <div className="relative flex flex-col items-center justify-center space-y-4">
                        {!switchSuccess ? (
                            <>
                                {/* Loading Spinner */}
                                <div className="relative w-16 h-16">
                                    <div className="absolute inset-0 border-4 border-emerald-200 dark:border-emerald-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-transparent border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin"></div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        Switching Account...
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Please wait
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Success Check Mark */}
                                <div className="relative w-16 h-16">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center animate-scale-in">
                                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
                                        Success!
                                    </h3>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 font-medium">
                                        Logged in as {switchedUserName}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 z-[9999] ${isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`}
            onClick={onClose}
        >
            <div
                className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-300 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-2xl backdrop-blur-sm max-w-md w-full max-h-[80vh]">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>

                    {/* Header */}
                    <div className="relative flex items-center justify-between px-6 py-4 border-b border-emerald-200/30 dark:border-emerald-700/30">
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
                            Switch Account
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label="Close"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="relative overflow-y-auto max-h-[calc(80vh-140px)]">
                        <div className="p-6 space-y-4">
                            {/* Current Account */}
                            {currentUser && (
                                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-2 border-emerald-300 dark:border-emerald-600">
                                    <div className="flex items-center gap-3">
                                        {currentUser.profileImage ? (
                                            <img
                                                src={currentUser.profileImage}
                                                alt={currentUser.name || currentUser.email}
                                                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center border-2 border-emerald-400">
                                                <span className="text-lg font-bold text-white">
                                                    {currentUser.name?.[0]?.toUpperCase() || currentUser.email?.[0]?.toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {currentUser.name || currentUser.email}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                {currentUser.email}
                                            </div>
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                                                Current Account
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 capitalize">
                                                {currentUser.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            {savedAccounts.length > 0 && (
                                <>
                                    <div className="flex gap-2 border-b border-emerald-200 dark:border-emerald-700 overflow-x-auto">
                                        <button
                                            onClick={() => setActiveTab('admin')}
                                            className={`px-4 py-2 font-medium transition-all text-sm whitespace-nowrap ${
                                                activeTab === 'admin'
                                                    ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                                            }`}
                                        >
                                            Admin
                                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                                activeTab === 'admin'
                                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                                {savedAccounts.filter(acc => acc.role?.toLowerCase() === 'admin').length}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('receptionist')}
                                            className={`px-4 py-2 font-medium transition-all text-sm whitespace-nowrap ${
                                                activeTab === 'receptionist'
                                                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                                            }`}
                                        >
                                            Receptionist
                                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                                activeTab === 'receptionist'
                                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                                {savedAccounts.filter(acc => acc.role?.toLowerCase() === 'receptionist').length}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('doctor')}
                                            className={`px-4 py-2 font-medium transition-all text-sm whitespace-nowrap ${
                                                activeTab === 'doctor'
                                                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
                                            }`}
                                        >
                                            Doctor
                                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                                activeTab === 'doctor'
                                                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                                {savedAccounts.filter(acc => acc.role?.toLowerCase() === 'doctor').length}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Saved Accounts - Filtered by Tab */}
                                    <div className="space-y-2">
                                        {savedAccounts.filter(acc => acc.role?.toLowerCase() === activeTab).map((account) => {
                                            const expired = isAccountExpired(account.lastActive)
                                            const isExpanded = expandedAccountId === account.id
                                            return (
                                                <div key={account.id} className="space-y-2">
                                                    <div
                                                        className={`group relative p-4 rounded-xl bg-white dark:bg-gray-800 border ${expired ? 'border-orange-300 dark:border-orange-600' : 'border-gray-200 dark:border-gray-700'} hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-lg transition-all duration-200 cursor-pointer`}
                                                        onClick={() => handleAccountClick(account)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {account.profileImage ? (
                                                                <img
                                                                    src={account.profileImage}
                                                                    alt={account.name}
                                                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 group-hover:border-emerald-400 transition-colors"
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 group-hover:border-emerald-400 transition-colors">
                                                                    <span className="text-lg font-bold text-white">
                                                                        {account.name?.[0]?.toUpperCase() || account.email?.[0]?.toUpperCase() || 'U'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                                    {account.name}
                                                                </div>
                                                                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                                    {account.email}
                                                                </div>
                                                                <div className={`text-xs mt-1 ${expired ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-500 dark:text-gray-500'}`}>
                                                                    {expired ? 'Session expired - Enter password' : `Active ${getTimeSinceActive(account.lastActive)}`}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2">
                                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                                                                    {account.role}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        removeAccount(account.id)
                                                                    }}
                                                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Remove account"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Password Input for Expired Accounts */}
                                                    {expired && isExpanded && (
                                                        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                                Enter Password
                                                            </label>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="password"
                                                                    value={password}
                                                                    onChange={(e) => setPassword(e.target.value)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleReAuthenticate(account)}
                                                                    placeholder="••••••••"
                                                                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleReAuthenticate(account)
                                                                    }}
                                                                    disabled={reAuthLoading}
                                                                    className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 rounded-md transition-colors"
                                                                >
                                                                    {reAuthLoading ? 'Loading...' : 'Sign In'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            )}

                            {/* No Saved Accounts Message */}
                            {savedAccounts.length === 0 && (
                                <div className="text-center py-8">
                                    <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        No saved accounts yet
                                    </p>
                                    <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                                        Sign in with another account to switch between them
                                    </p>
                                </div>
                            )}

                            {/* Add Account Button */}
                            <button
                                onClick={addNewAccount}
                                className="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all duration-200 group"
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                                            Add Another Account
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Sign in with a different account
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
