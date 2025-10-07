import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    async function submit(e: any) {
        e.preventDefault()
        setLoading(true)
        setError('')
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
        setLoading(false)
        if (res.ok) {
            // Dispatch custom event to notify components of login
            window.dispatchEvent(new Event('user-login'))
            router.push('/')
        }
        else setError('Invalid email or password. Please try again.')
    }

    return (
        <div className="min-h-[70vh] flex items-center justify-center">
            <div className="max-w-md w-full mx-4">
                <div className="card">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
                        <p className="text-muted text-sm">Sign in to access LLC ERP</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email</label>
                            <input 
                                required 
                                type="email"
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                placeholder="demo@email.com" 
                                className="w-full p-2 border rounded" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Password</label>
                            <input 
                                required 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                placeholder="••••••••" 
                                className="w-full p-2 border rounded" 
                            />
                        </div>
                        <button 
                            disabled={loading} 
                            className="w-full btn btn-primary"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-muted">
                        Don't have an account? <Link href="/signup" className="text-brand hover:underline font-medium">Sign up</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
