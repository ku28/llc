import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ToastNotification from '../components/ToastNotification';
import { useToast } from '../hooks/useToast';

export default function LoginPage() {
    const [emailOrPhone, setEmailOrPhone] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [saveLoginInfo, setSaveLoginInfo] = useState(true) // Default to checked
    const router = useRouter()
    const { toasts, removeToast, showError, showSuccess } = useToast()
    const [isAddMode, setIsAddMode] = useState(false)
    // Forgot password modal state
    const [showForgot, setShowForgot] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotLoading, setForgotLoading] = useState(false)
    const [forgotError, setForgotError] = useState('')
    const [forgotSuccess, setForgotSuccess] = useState('')

    useEffect(() => {
        // Check if we're in "add account" mode
        if (router.query.mode === 'add') {
            setIsAddMode(true)
        }
    }, [router.query])

    async function submit(e: any) {
        e.preventDefault()
        console.log('=== LOGIN SUBMIT STARTED ===')
        console.log('saveLoginInfo checkbox state:', saveLoginInfo)
        setLoading(true)
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailOrPhone, password }) })
        setLoading(false)
        console.log('Login response OK:', res.ok)
        if (res.ok) {
            // Dispatch custom event to notify components of login
            window.dispatchEvent(new Event('user-login'))
            
            // Get user data to determine redirect path
            let userRole: string | undefined
            
            // Save account info if checkbox is checked - WAIT for this to complete
            if (saveLoginInfo) {
                console.log('Checkbox is checked, saving account info...')
                try {
                    userRole = await saveAccountToLocalStorage()
                    console.log('Account save completed')
                    // Verify it was saved
                    const saved = localStorage.getItem('savedAccounts')
                    console.log('Verification - accounts in localStorage:', saved)
                } catch (error) {
                    console.error('Error during save:', error)
                }
            } else {
                console.log('Checkbox is NOT checked, skipping save')
                // Still need to fetch user role for redirect
                try {
                    const tokenRes = await fetch('/api/auth/get-session-token')
                    if (tokenRes.ok) {
                        const tokenData = await tokenRes.json()
                        userRole = tokenData.user?.role
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error)
                }
            }
            
            if (isAddMode) {
                showSuccess('Account added successfully!')
            }
            
            // Navigate after save is complete - receptionist goes to patients page
            const redirectPath = userRole?.toLowerCase() === 'receptionist' ? '/patients' : '/dashboard'
            router.push(redirectPath)
        }
        else showError('Invalid email/phone or password. Please try again.')
    }

    async function saveAccountToLocalStorage() {
        try {
            console.log('=== SAVE ACCOUNT STARTED ===')
            
            // Add a small delay to ensure cookies are set
            await new Promise(resolve => setTimeout(resolve, 200))
            
            // Get session token from API (since the cookie is HttpOnly)
            console.log('Fetching session token from API...')
            const tokenRes = await fetch('/api/auth/get-session-token')
            console.log('Session token API response:', tokenRes.status, tokenRes.ok)
            
            if (!tokenRes.ok) {
                console.error('Failed to get session token from API')
                alert('Warning: Could not save login info - failed to get session token')
                return undefined
            }
            
            const tokenData = await tokenRes.json()
            const sessionToken = tokenData.sessionToken
            const user = tokenData.user
            
            console.log('Session token retrieved from API')
            console.log('Token length:', sessionToken?.length)
            console.log('User data:', user)
            
            console.log('Session token retrieved from API')
            console.log('Token length:', sessionToken?.length)
            console.log('User data:', user)
            
            if (!sessionToken) {
                console.error('CRITICAL: No session token in API response!')
                alert('Warning: Could not save login info - no session token')
                return undefined
            }

            if (!user) {
                console.error('No user data in API response')
                alert('Warning: Could not save login info - no user data')
                return undefined
            }

            console.log('User loaded successfully:', {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            })

            // Load existing saved accounts
            const stored = localStorage.getItem('savedAccounts')
            console.log('Existing savedAccounts in localStorage:', stored)
            
            const accounts = stored ? JSON.parse(stored) : []
            console.log('Parsed existing accounts:', accounts)
            
            // Check if account already exists
            const existingIndex = accounts.findIndex((acc: any) => acc.id === user.id)
            console.log('Existing account index:', existingIndex)
            
            const accountData = {
                id: user.id,
                name: user.name || user.email,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage,
                sessionToken,
                lastActive: Date.now()
            }

            console.log('Account data to save:', accountData)

            if (existingIndex >= 0) {
                // Update existing account
                console.log('Updating existing account at index:', existingIndex)
                accounts[existingIndex] = accountData
            } else {
                // Add new account
                console.log('Adding new account to array')
                accounts.push(accountData)
            }

            // Keep only last 10 accounts
            const limitedAccounts = accounts.slice(-10)
            console.log('Final accounts array (limited to 10):', limitedAccounts)
            console.log('Total accounts to save:', limitedAccounts.length)
            
            // Save to localStorage
            const jsonString = JSON.stringify(limitedAccounts)
            console.log('JSON string to save:', jsonString)
            localStorage.setItem('savedAccounts', jsonString)
            console.log('Successfully saved to localStorage')
            
            // Verify it was saved
            const verification = localStorage.getItem('savedAccounts')
            console.log('Verification - data in localStorage:', verification)
            console.log('Verification - can parse:', !!verification && JSON.parse(verification).length)
            
            // Test if the saved token can be verified
            console.log('Testing saved token validity...')
            const testResponse = await fetch('/api/auth/switch-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken })
            })
            console.log('Token test result:', testResponse.status, testResponse.ok)
            if (!testResponse.ok) {
                const errorData = await testResponse.json()
                console.error('Token test failed:', errorData)
                alert('Warning: Saved token may not work. Error: ' + JSON.stringify(errorData))
            } else {
                console.log('Token test passed - token is valid!')
            }
            
            console.log('=== SAVE ACCOUNT COMPLETED SUCCESSFULLY ===')
            return user.role // Return the user role for redirect
        } catch (error) {
            console.error('=== SAVE ACCOUNT FAILED ===')
            console.error('Error details:', error)
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
            alert('Error saving login info: ' + (error instanceof Error ? error.message : String(error)))
            return undefined
        }
    }

    async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError('');
        setForgotSuccess('');
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: forgotEmail })
        });
        const data = await res.json();
        setForgotLoading(false);
        if (res.ok) {
            setForgotSuccess('Reset link sent to your email and admin email.');
        } else {
            setForgotError(data.error || 'Error sending reset link');
        }
    }

    return (
        <>
            <ToastNotification toasts={toasts} removeToast={removeToast} />
            <div className="min-h-[70vh] flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
                <div className="max-w-md w-full">
                    <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                        <div className="relative">
                        <div className="text-center mb-4 sm:mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold mb-2">
                                {isAddMode ? 'Add Another Account' : 'Welcome Back'}
                            </h2>
                            <p className="text-muted text-xs sm:text-sm">
                                {isAddMode ? 'Sign in with a different account' : 'Sign in to access LLC ERP'}
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-3 sm:space-y-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium mb-1.5">Email or Phone Number</label>
                            <input 
                                required 
                                value={emailOrPhone} 
                                onChange={e => setEmailOrPhone(e.target.value)} 
                                placeholder="demo@email.com or 9876543210" 
                                className="w-full p-2 sm:p-2.5 text-sm sm:text-base border rounded" 
                            />
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Enter your email address or 10-digit phone number
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium mb-1.5">Password</label>
                            <input 
                                required 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                placeholder="••••••••" 
                                className="w-full p-2 sm:p-2.5 text-sm sm:text-base border rounded" 
                            />
                            <div className="mt-2 flex items-center justify-between">
                                <label className="relative group/checkbox cursor-pointer flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={saveLoginInfo}
                                        onChange={(e) => setSaveLoginInfo(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="w-5 h-5 border-2 border-green-400 dark:border-green-600 rounded-md bg-white dark:bg-gray-700 peer-checked:bg-gradient-to-br peer-checked:from-green-500 peer-checked:to-emerald-600 peer-checked:border-green-500 transition-all duration-200 flex items-center justify-center shadow-sm peer-checked:shadow-lg peer-checked:shadow-green-500/50 group-hover/checkbox:border-green-500 group-hover/checkbox:scale-110 flex-shrink-0">
                                        <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div className="absolute left-0 top-0 w-5 h-5 rounded-md bg-green-400 opacity-0 peer-checked:opacity-20 blur-md transition-opacity duration-200 pointer-events-none"></div>
                                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 select-none">
                                        Save login info
                                    </span>
                                </label>
                                <button type="button" className="text-blue-600 hover:underline text-xs sm:text-sm" onClick={() => setShowForgot(true)}>
                                    Forgot Password?
                                </button>
                            </div>
                        </div>
                        <button 
                            disabled={loading} 
                            className="w-full btn btn-primary text-sm sm:text-base py-2 sm:py-2.5"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-muted">
                        Don't have an account? <Link href="/user-signup" className="text-brand hover:underline font-medium">Sign up as User</Link>
                        {' or '}
                        <Link href="/signup" className="text-brand hover:underline font-medium">Sign up as Staff</Link>
                    </div>
                </div>
            </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgot && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-sm relative">
                        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none" onClick={() => setShowForgot(false)}>&times;</button>
                        <h3 className="text-base sm:text-lg font-bold mb-2">Forgot Password</h3>
                        <form onSubmit={handleForgot}>
                            <label className="block text-xs sm:text-sm font-medium mb-1.5">Enter your registered email</label>
                            <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="w-full p-2 text-sm sm:text-base border rounded mb-3" placeholder="your@email.com" />
                            {forgotError && <div className="text-red-600 mb-2 text-xs sm:text-sm">{forgotError}</div>}
                            {forgotSuccess && <div className="text-green-600 mb-2 text-xs sm:text-sm">{forgotSuccess}</div>}
                            <button type="submit" className="w-full btn btn-primary text-sm sm:text-base" disabled={forgotLoading}>{forgotLoading ? 'Sending...' : 'Send Reset Link'}</button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
