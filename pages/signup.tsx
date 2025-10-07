import { useState } from 'react'
import { useRouter } from 'next/router'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState<'admin'|'staff'|'user'>('staff')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function submit(e: any) {
        e.preventDefault(); setLoading(true)
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, password, role }) })
        setLoading(false)
        if (res.ok) router.push('/')
        else alert('Signup failed')
    }

    return (
        <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded shadow">
            <h2 className="text-lg font-bold mb-4">Sign up</h2>
            <form onSubmit={submit} className="space-y-3">
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full p-2 border rounded" />
                <input required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded" />
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-2 border rounded" />
                <div className="mt-2">
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <div className="inline-flex rounded-md bg-gray-100 p-1">
                        <button type="button" onClick={() => setRole('admin')} className={`px-3 py-1 rounded ${role==='admin' ? 'bg-green-600 text-white' : 'text-gray-700'}`}>Admin</button>
                        <button type="button" onClick={() => setRole('staff')} className={`px-3 py-1 rounded ${role==='staff' ? 'bg-green-600 text-white' : 'text-gray-700'}`}>Staff</button>
                        <button type="button" onClick={() => setRole('user')} className={`px-3 py-1 rounded ${role==='user' ? 'bg-green-600 text-white' : 'text-gray-700'}`}>User</button>
                    </div>
                </div>
                <div className="text-right">
                    <button disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">{loading ? 'Signing up...' : 'Create account'}</button>
                </div>
            </form>
        </div>
    )
}
