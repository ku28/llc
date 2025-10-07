import { useEffect, useState } from 'react'

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)

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
                    {users.map(u => (
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
            </div>
        </div>
    )
}
