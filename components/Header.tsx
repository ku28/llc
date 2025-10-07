import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Header({ title = 'LLC ERP' }: { title?: string }) {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/'
  }

  return (
    <header className="bg-white shadow py-3 mb-6">
      <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
        <h1 className="text-lg font-bold">{title}</h1>
        <div className="flex items-center gap-4">
          {/* quick access to prescriptions page */}
          <Link href="/prescriptions" className="px-3 py-1 bg-indigo-600 text-white rounded">Prescriptions</Link>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-sm">{user.name || user.email} <span className="text-xs text-gray-500">({user.role})</span></div>
              <button onClick={logout} className="px-3 py-1 bg-red-500 text-white rounded">Logout</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="px-3 py-1 bg-blue-600 text-white rounded">Login</Link>
              <Link href="/signup" className="px-3 py-1 bg-green-600 text-white rounded">Signup</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
