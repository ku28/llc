import { useEffect, useState } from 'react'

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    useEffect(() => { fetch('/api/users').then(r => r.json()).then(setUsers) }, [])
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    async function changeRole(id: any, role: string) {
        if (!user) return alert('Please login to change roles')
        await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role }) })
        setUsers(await (await fetch('/api/users')).json())
    }

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Users</h2>
            <div className="bg-white p-4 rounded shadow">
                {!user && <div className="mb-2 text-sm text-gray-600">You must <a className="text-blue-600 underline" href="/login">login</a> to change user roles.</div>}
                <ul>
                    {users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(u => (
                        <li key={u.id} className="p-2 border-b flex justify-between items-center">
                            <div>
                                <div className="font-medium">{u.name} · {u.email}</div>
                                <div className="text-sm text-gray-500">Role: {u.role}</div>
                            </div>
                            <div className="space-x-2">
                                <button onClick={() => changeRole(u.id, 'admin')} className="px-2 py-1 bg-green-500 text-white rounded">Admin</button>
                                <button onClick={() => changeRole(u.id, 'receptionist')} className="px-2 py-1 bg-blue-500 text-white rounded">Reception</button>
                                <button onClick={() => changeRole(u.id, 'staff')} className="px-2 py-1 bg-gray-500 text-white rounded">Staff</button>
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
    )
}
