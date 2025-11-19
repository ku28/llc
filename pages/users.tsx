import { useEffect, useState } from 'react'
import { useDataCache } from '../contexts/DataCacheContext'

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const { getCache, setCache } = useDataCache()

    useEffect(() => {
        // Check cache first
        const cachedUsers = getCache<any[]>('users')
        if (cachedUsers) {
            setUsers(cachedUsers)
        }
        
        // Fetch users
        fetch('/api/users').then(r => r.json()).then(data => {
            setUsers(data)
            setCache('users', data)
        })
        
        // Cleanup on unmount
        return () => {
            setUsers([])
        }
    }, [])
    
    useEffect(() => { 
        fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) 
    }, [])

    async function changeRole(id: any, role: string) {
        if (!user) return alert('Please login to change roles')
        await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role }) })
        const updatedUsers = await (await fetch('/api/users')).json()
        setUsers(updatedUsers)
        setCache('users', updatedUsers)
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
                        User Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage user roles and permissions</p>
                </div>
            </div>
            <div className="relative rounded-xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/5 backdrop-blur-sm p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                <div className="relative">
                {!user && <div className="mb-2 text-sm text-gray-600">You must <a className="text-emerald-600 underline hover:text-emerald-700" href="/login">login</a> to change user roles.</div>}
                <ul>
                    {users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(u => (
                        <li key={u.id} className="p-2 border-b border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                            <div>
                                <div className="font-medium">{u.name} · {u.email}</div>
                                <div className="text-sm text-gray-500">Role: {u.role}</div>
                            </div>
                            <div className="space-x-2">
                                <button onClick={() => changeRole(u.id, 'admin')} className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded transition-all">Admin</button>
                                <button onClick={() => changeRole(u.id, 'receptionist')} className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded transition-all">Reception</button>
                                <button onClick={() => changeRole(u.id, 'staff')} className="px-2 py-1 bg-gradient-to-r from-emerald-400 to-green-400 hover:from-emerald-500 hover:to-green-500 text-white rounded transition-all">Staff</button>
                            </div>
                        </li>
                    ))}
                </ul>

                {/* Pagination Controls */}
                {users.length > itemsPerPage && (
                    <div className="mt-6 flex items-center justify-center gap-4">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                        </button>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Page {currentPage} of {Math.ceil(users.length / itemsPerPage)}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(users.length / itemsPerPage), prev + 1))}
                            disabled={currentPage === Math.ceil(users.length / itemsPerPage)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            Next
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
                </div>
            </div>
        </div>
    )
}
