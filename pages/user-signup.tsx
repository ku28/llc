import { useState } from 'react'
import { useRouter } from 'next/router'
import ToastNotification from '../components/ToastNotification'
import { useToast } from '../hooks/useToast'
import Link from 'next/link'

export default function UserSignupPage() {
    const [emailOrPhone, setEmailOrPhone] = useState('')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [otpLoading, setOtpLoading] = useState(false)
    const router = useRouter()
    const { toasts, removeToast, showError, showSuccess } = useToast()

    async function sendOTP(e: any) {
        e.preventDefault()
        
        if (!name || !emailOrPhone || !password) {
            showError('Please fill all fields before requesting OTP')
            return
        }

        setOtpLoading(true)
        const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrPhone, name })
        })
        setOtpLoading(false)

        const data = await res.json()

        if (res.ok) {
            setOtpSent(true)
            showSuccess(`OTP sent to ${emailOrPhone}`)
        } else {
            showError(data.error || 'Failed to send OTP')
        }
    }

    async function submit(e: any) {
        e.preventDefault()
        
        if (!otpSent) {
            showError('Please request OTP first')
            return
        }

        if (!otp || otp.length !== 4) {
            showError('Please enter the 4-digit OTP')
            return
        }
        
        setLoading(true)
        const res = await fetch('/api/auth/user-signup', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ emailOrPhone, name, password, otp }) 
        })
        setLoading(false)
        
        const data = await res.json()
        
        if (res.ok) {
            showSuccess('Account created successfully!')
            setTimeout(() => {
                router.push('/login')
            }, 1500)
        } else {
            showError(data.error || 'Signup failed')
        }
    }

    return (
        <>
            <ToastNotification toasts={toasts} removeToast={removeToast} />
            <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center p-3 sm:p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 p-4 sm:p-6 md:p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800">
                    <div className="text-center mb-4 sm:mb-6">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h2>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            Join Last Leaf Care to book appointments
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-3 sm:space-y-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium mb-2 text-gray-900 dark:text-white">Full Name *</label>
                            <input 
                                required 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="John Doe" 
                                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand" 
                            />
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium mb-2 text-gray-900 dark:text-white">Email or Phone Number *</label>
                            <input 
                                required 
                                value={emailOrPhone} 
                                onChange={e => setEmailOrPhone(e.target.value)} 
                                placeholder="john@example.com or 9876543210" 
                                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand" 
                            />
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Enter your email address or 10-digit phone number
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium mb-2 text-gray-900 dark:text-white">Password *</label>
                            <input 
                                required 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                placeholder="••••••••" 
                                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand"
                                minLength={6}
                                disabled={otpSent}
                            />
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 6 characters</p>
                        </div>

                        {!otpSent ? (
                            <button 
                                onClick={sendOTP}
                                disabled={otpLoading || !name || !emailOrPhone || !password}
                                className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-brand text-white rounded-lg text-sm sm:text-base font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {otpLoading ? 'Sending OTP...' : 'Send OTP'}
                            </button>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium mb-2 text-gray-900 dark:text-white">Enter OTP *</label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={otp} 
                                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                                        placeholder="Enter 4-digit OTP" 
                                        maxLength={4}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand text-center text-xl sm:text-2xl tracking-widest"
                                    />
                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        OTP sent to {emailOrPhone}
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                    <button 
                                        type="button"
                                        onClick={sendOTP}
                                        disabled={otpLoading}
                                        className="px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                                    >
                                        {otpLoading ? 'Resending...' : 'Resend OTP'}
                                    </button>
                                    <button 
                                        disabled={loading || otp.length !== 4} 
                                        className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-brand text-white rounded-lg text-sm sm:text-base font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Creating Account...' : 'Verify & Create Account'}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    <p className="text-xs sm:text-sm text-center text-gray-600 dark:text-gray-400 mt-4 sm:mt-6">
                        Already have an account?{' '}
                        <Link href="/login" className="text-brand hover:text-brand-600 font-medium">
                            Login
                        </Link>
                    </p>

                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-[10px] sm:text-xs text-center text-gray-500 dark:text-gray-400">
                            Are you staff?{' '}
                            <Link href="/signup" className="text-brand hover:text-brand-600">
                                Register as Admin/Reception
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
