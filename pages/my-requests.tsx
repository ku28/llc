import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

interface AppointmentRequest {
    id: number
    userId: number
    userName: string
    userEmail: string
    userPhone: string
    message: string
    status: string
    patientId: number | null
    appointmentId: number | null
    createdAt: string
    updatedAt: string
}

export default function MyRequestsPage() {
    const router = useRouter()
    const [requests, setRequests] = useState<AppointmentRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

    useEffect(() => {
        checkAuthAndFetchRequests()
    }, [])

    async function checkAuthAndFetchRequests() {
        try {
            const authRes = await fetch('/api/auth/me')
            const authData = await authRes.json()

            if (!authData.user) {
                router.push('/login')
                return
            }

            setUser(authData.user)

            const reqRes = await fetch('/api/appointment-requests')
            const reqData = await reqRes.json()
            setRequests(reqData)
        } catch (err) {
            console.error('Error:', err)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            declined: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }
        return colors[status as keyof typeof colors] || colors.pending
    }

    const getStatusIcon = (status: string) => {
        if (status === 'pending') {
            return (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        } else if (status === 'approved') {
            return (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        } else {
            return (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }
    }

    if (loading) {
        return (
                <div className="flex justify-center items-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
                </div>
        )
    }

    return (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">My Appointment Requests</h1>
                    <p className="text-muted">Track the status of your appointment requests</p>
                </div>

                {requests.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No appointment requests yet</h3>
                        <p className="text-muted mb-4">Click the "Book Appointment" button to submit your first request</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Request</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Contact</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {requests.map((request) => (
                                        <>
                                        <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="font-medium">Appointment Request</div>
                                                {request.message && <div className="text-xs text-muted mt-1 truncate max-w-xs">{request.message}</div>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm">{request.userEmail}</div>
                                                {request.userPhone && <div className="text-xs text-muted mt-1">{request.userPhone}</div>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                </span>
                                                {request.status === 'approved' && request.appointmentId && (
                                                    <div className="mt-2 text-xs text-green-600 dark:text-green-400">Appointment scheduled</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm">{new Date(request.createdAt).toLocaleDateString()}</div>
                                                <div className="text-xs text-muted mt-1">{new Date(request.createdAt).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const copy = new Set(expandedRows)
                                                            if (copy.has(request.id)) copy.delete(request.id)
                                                            else copy.add(request.id)
                                                            setExpandedRows(copy)
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                                                    >
                                                        {expandedRows.has(request.id) ? 'Hide' : 'View More'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedRows.has(request.id) && (
                                            <tr key={`${request.id}-details`} className="bg-white dark:bg-gray-900">
                                                <td colSpan={5} className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <p className="text-xs font-semibold text-muted mb-1">Requester</p>
                                                            <div className="text-sm font-medium">{request.userName}</div>
                                                            <div className="text-xs text-muted">{request.userEmail}{request.userPhone ? ` • ${request.userPhone}` : ''}</div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-muted mb-1">Message</p>
                                                            <div className="text-sm">{request.message || 'No message provided'}</div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-muted mb-1">Status Details</p>
                                                            <div className="text-sm">
                                                                {request.status === 'pending' && '⏳ Waiting for review'}
                                                                {request.status === 'approved' && request.appointmentId && '✅ Appointment scheduled'}
                                                                {request.status === 'approved' && !request.appointmentId && '✅ Approved - Scheduling in progress'}
                                                                {request.status === 'declined' && '❌ Request declined'}
                                                            </div>
                                                            <div className="mt-2 text-xs text-muted">Updated: {new Date(request.updatedAt).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
    )
}
