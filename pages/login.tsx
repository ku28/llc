import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ToastNotification from '../components/ToastNotification';
import { useToast } from '../hooks/useToast';

export default function LoginPage() {
    const [emailOrPhone, setEmailOrPhone] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { toasts, removeToast, showError } = useToast()
    // Forgot password modal state
    const [showForgot, setShowForgot] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotLoading, setForgotLoading] = useState(false)
    const [forgotError, setForgotError] = useState('')
    const [forgotSuccess, setForgotSuccess] = useState('')

    async function submit(e: any) {
        e.preventDefault()
        setLoading(true)
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailOrPhone, password }) })
        setLoading(false)
        if (res.ok) {
            // Dispatch custom event to notify components of login
            window.dispatchEvent(new Event('user-login'))
            router.push('/dashboard')
        }
        else showError('Invalid email/phone or password. Please try again.')
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
                            <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome Back</h2>
                            <p className="text-muted text-xs sm:text-sm">Sign in to access LLC ERP</p>
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
                            <div className="mt-2 text-right">
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
