import { useState } from 'react'
import { useRouter } from 'next/router'
import CustomSelect from '../components/CustomSelect'
import dropdownOptions from '../data/dropdownOptions.json'
import ToastNotification from '../components/ToastNotification'
import { useToast } from '../hooks/useToast'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const { toasts, removeToast, showError, showWarning } = useToast()

    async function submit(e: any) {
        e.preventDefault()
        
        if (!role) {
            showWarning('Please select a role')
            return
        }
        
        setLoading(true)
        const res = await fetch('/api/auth/signup', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ email, name, password, role }) 
        })
        setLoading(false)
        
        const data = await res.json()
        
        if (res.ok) {
            setSuccess(true)
        } else {
            showError(data.error || 'Signup failed')
        }
    }

    if (success) {
        return (
            <div className="max-w-2xl mx-auto mt-12 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
                <div className="text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">Registration Submitted!</h2>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                        <p className="text-lg mb-3">Your signup request has been sent to the administrator for approval.</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            You will receive an email at <strong>{email}</strong> once your account is verified and activated.
                        </p>
                    </div>
                    <div className="space-y-2 text-left bg-gray-50 dark:bg-gray-900 p-4 rounded">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>📧 What happens next?</strong>
                        </p>
                        <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-2">
                            <li>Admin receives your signup request via email</li>
                            <li>Admin reviews and verifies your information</li>
                            <li>You receive a welcome email when approved</li>
                            <li>You can then log in with your credentials</li>
                        </ol>
                    </div>
                    <button 
                        onClick={() => router.push('/login')} 
                        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <ToastNotification toasts={toasts} removeToast={removeToast} />
            <div className="max-w-md mx-auto mt-12 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-2">Sign up</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Create a new account. Your request will be sent to the administrator for approval.
                </p>
                <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1.5">Full Name *</label>
                    <input 
                        required 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="John Doe" 
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Email *</label>
                    <input 
                        required 
                        type="email"
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="john@example.com" 
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Password *</label>
                    <input 
                        required 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        minLength={6}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 6 characters</p>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Role *</label>
                    <CustomSelect
                        value={role}
                        onChange={(val) => setRole(val)}
                        options={dropdownOptions.role}
                        placeholder="Select your role"
                        allowCustom={false}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Select the role that matches your responsibilities
                    </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-sm">
                    <strong>⚠️ Note:</strong> Your account will be activated only after admin approval.
                </div>
                <div className="text-right">
                    <button 
                        disabled={loading} 
                        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </form>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-4">
                Already have an account? <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Login</a>
            </p>
        </div>
        </>
    )
}
