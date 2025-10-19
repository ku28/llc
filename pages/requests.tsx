import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import ToastNotification from '../components/ToastNotification'
import { useToast } from '../hooks/useToast'

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

export default function RequestsPage() {
    const router = useRouter()
    const [requests, setRequests] = useState<AppointmentRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [selectedRequest, setSelectedRequest] = useState<AppointmentRequest | null>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; action: 'decline' | 'delete'; request?: AppointmentRequest }>({ open: false, action: 'decline' })
    const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set())
    const { toasts, removeToast, showSuccess, showError, showWarning, showInfo } = useToast()
    const [editForm, setEditForm] = useState({ userName: '', userEmail: '', userPhone: '', message: '' })
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'declined'>('pending')
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        checkAuthAndFetchRequests()
    }, [])

    async function refreshRequests() {
        setRefreshing(true)
        try {
            const reqRes = await fetch('/api/appointment-requests')
            if (!reqRes.ok) throw new Error(await reqRes.text())
            const reqData = await reqRes.json()
            setRequests(reqData)
            showSuccess('Requests refreshed')
        } catch (err) {
            console.error('Failed to refresh requests:', err)
            showError('Failed to refresh requests')
        } finally {
            setRefreshing(false)
        }
    }

    async function checkAuthAndFetchRequests() {
        try {
            const authRes = await fetch('/api/auth/me')
            const authData = await authRes.json()

            if (!authData.user) {
                router.push('/login')
                return
            }

            const userRole = authData.user.role?.toLowerCase()
            if (!['admin', 'doctor', 'staff', 'reception'].includes(userRole)) {
                router.push('/dashboard')
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

    function openDetailModal(request: AppointmentRequest) {
        setSelectedRequest(request)
        setShowDetailModal(true)
    }

    function closeDetailModal() {
        setShowDetailModal(false)
        setSelectedRequest(null)
    }

    function openEditModal(request: AppointmentRequest) {
        setSelectedRequest(request)
        setEditForm({
            userName: request.userName,
            userEmail: request.userEmail,
            userPhone: request.userPhone,
            message: request.message || ''
        })
        setShowEditModal(true)
    }

    function closeEditModal() {
        setShowEditModal(false)
        setSelectedRequest(null)
        setEditForm({ userName: '', userEmail: '', userPhone: '', message: '' })
    }

    async function handleUpdateRequest(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedRequest) return

        try {
            const res = await fetch('/api/appointment-requests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedRequest.id,
                    userName: editForm.userName,
                    userEmail: editForm.userEmail,
                    userPhone: editForm.userPhone,
                    message: editForm.message
                })
            })

            if (res.ok) {
                checkAuthAndFetchRequests()
                closeEditModal()
                alert('Request updated successfully')
            }
        } catch (err) {
            console.error('Error updating request:', err)
            alert('Failed to update request')
        }
    }

    async function handleApprove(request: AppointmentRequest) {
        setLoadingIds(prev => new Set(prev).add(request.id))
        try {
            const res = await fetch('/api/appointment-requests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: request.id, status: 'approved' })
            })

            if (res.ok) {
                checkAuthAndFetchRequests()
                showSuccess('Request approved successfully')
            } else {
                const txt = await res.text()
                showError(txt || 'Failed to approve request')
            }
        } catch (err) {
            console.error('Error approving request:', err)
            showError('Failed to approve request')
        } finally {
            setLoadingIds(prev => {
                const copy = new Set(prev)
                copy.delete(request.id)
                return copy
            })
        }
    }

    function confirmDecline(request: AppointmentRequest) {
        setConfirmModal({ open: true, action: 'decline', request })
    }

    async function handleDecline(request: AppointmentRequest) {
        setConfirmModal({ open: false, action: 'decline' })
        setLoadingIds(prev => new Set(prev).add(request.id))
        try {
            const res = await fetch('/api/appointment-requests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: request.id, status: 'declined' })
            })

            if (res.ok) {
                checkAuthAndFetchRequests()
                showInfo('Request declined')
            } else {
                const txt = await res.text()
                showError(txt || 'Failed to decline request')
            }
        } catch (err) {
            console.error('Error declining request:', err)
            showError('Failed to decline request')
        } finally {
            setLoadingIds(prev => {
                const copy = new Set(prev)
                copy.delete(request.id)
                return copy
            })
        }
    }

    async function handleDeleteRequest(request: AppointmentRequest) {
        setLoadingIds(prev => new Set(prev).add(request.id))
        try {
            const res = await fetch('/api/appointment-requests', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: request.id })
            })

            if (res.ok) {
                checkAuthAndFetchRequests()
                showSuccess('Request deleted')
            } else {
                const errText = await res.text()
                console.error('Delete failed:', errText)
                showError('Failed to delete request')
            }
        } catch (err) {
            console.error('Error deleting request:', err)
            showError('Failed to delete request')
        } finally {
            setLoadingIds(prev => {
                const copy = new Set(prev)
                copy.delete(request.id)
                return copy
            })
        }
    }

    function confirmDelete(request: AppointmentRequest) {
        setConfirmModal({ open: true, action: 'delete', request })
    }

    async function handleRegisterPatient(request: AppointmentRequest) {
        // Auto-register patient: create patient via API and attach to request
        setLoadingIds(prev => new Set(prev).add(request.id))
        try {
            const profileRes = await fetch(`/api/user-profile?userId=${request.userId}`)
            const profile = profileRes.ok ? await profileRes.json() : null

            const payload: any = {
                firstName: request.userName?.split(' ')[0] || '',
                lastName: request.userName?.split(' ').slice(1).join(' ') || '',
                email: request.userEmail || '',
                phone: request.userPhone || ''
            }

            if (profile) {
                if (profile.dob) payload.dob = new Date(profile.dob).toISOString()
                if (profile.age) payload.age = Number(profile.age)
                if (profile.address) payload.address = profile.address
                if (profile.gender) payload.gender = profile.gender
                if (profile.occupation) payload.occupation = profile.occupation
                if (profile.height) payload.height = Number(profile.height)
                if (profile.weight) payload.weight = Number(profile.weight)
                if (profile.fatherHusbandGuardianName) payload.fatherHusbandGuardianName = profile.fatherHusbandGuardianName
                const imageUrl = profile.imageUrl || profile.profileImage
                if (imageUrl) payload.imageUrl = imageUrl
            }

            // Try to get an OPD from server API (legacy format OPD-XXX)
            try {
                const opdRes = await fetch('/api/opd/generate')
                if (opdRes.ok) {
                    const opdData = await opdRes.json()
                    if (opdData?.opdNo) payload.opdNo = opdData.opdNo
                }
            } catch (e) {
                console.warn('OPD generate failed, continuing without opd', e)
            }

            // Create patient
            const createRes = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!createRes.ok) {
                const txt = await createRes.text()
                showError(txt || 'Failed to create patient')
                return
            }

            const created = await createRes.json()
            // Optimistically update local state so UI reflects the new patient immediately
            if (created?.id) {
                setRequests(prev => prev.map(r => r.id === request.id ? { ...r, patientId: created.id } : r))
            }

            // Attach patientId to request on server
            const attachRes = await fetch('/api/appointment-requests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: request.id, patientId: created.id })
            })

            if (!attachRes.ok) {
                const txt = await attachRes.text()
                showWarning('Patient created but failed to attach to request: ' + (txt || 'Unknown'))
            } else {
                showSuccess('Patient registered and attached to request')
            }

            // Refresh data from server to ensure canonical state
            checkAuthAndFetchRequests()
        } catch (err) {
            console.error('Auto-register error:', err)
            showError('Failed to register patient')
        } finally {
            setLoadingIds(prev => {
                const copy = new Set(prev)
                copy.delete(request.id)
                return copy
            })
        }
    }

    function handleSetAppointment(request: AppointmentRequest) {
        // Redirect to visits page
        if (request.patientId) {
            router.push(`/visits?patientId=${request.patientId}&requestId=${request.id}`)
        } else {
            alert('Please register the patient first')
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

    if (loading) {
        return (
                <div className="flex justify-center items-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
                </div>
        )
    }

    const pendingRequests = requests.filter(r => r.status === 'pending')
    const approvedRequests = requests.filter(r => r.status === 'approved')
    const declinedRequests = requests.filter(r => r.status === 'declined')

    const displayRequests = activeTab === 'pending' ? pendingRequests : activeTab === 'approved' ? approvedRequests : declinedRequests

    return (
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Appointment Requests</h1>
                            <p className="text-sm text-muted mt-1">Manage patient appointment requests</p>
                        </div>
                        <div>
                            <button
                                onClick={refreshRequests}
                                disabled={refreshing}
                                className={`px-3 py-2 bg-gray-100 dark:bg-gray-800 text-sm rounded-lg flex items-center gap-2 ${refreshing ? 'opacity-70 cursor-wait' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                                {refreshing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700" /> : 'Refresh'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                            activeTab === 'pending'
                                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                                : 'border-transparent text-muted hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Pending ({pendingRequests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('approved')}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                            activeTab === 'approved'
                                ? 'border-green-500 text-green-600 dark:text-green-400'
                                : 'border-transparent text-muted hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Approved ({approvedRequests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('declined')}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                            activeTab === 'declined'
                                ? 'border-red-500 text-red-600 dark:text-red-400'
                                : 'border-transparent text-muted hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Declined ({declinedRequests.length})
                    </button>
                </div>

                {/* Table */}
                {displayRequests.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                        <p className="text-muted">No {activeTab} requests</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Contact</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {displayRequests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="font-medium">{request.userName}</div>
                                                {request.message && (
                                                    <div className="text-xs text-muted mt-1 truncate max-w-xs">
                                                        {request.message}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm">{request.userEmail}</div>
                                                {request.userPhone && (
                                                    <div className="text-xs text-muted mt-1">{request.userPhone}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm">{new Date(request.createdAt).toLocaleDateString()}</div>
                                                <div className="text-xs text-muted mt-1">{new Date(request.createdAt).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                </span>
                                                {request.status === 'approved' && (
                                                    <div className="mt-2 space-y-1">
                                                        {request.patientId && (
                                                            <div className="text-xs text-green-600 dark:text-green-400">✓ Patient Registered</div>
                                                        )}
                                                        {request.appointmentId && (
                                                            <div className="text-xs text-green-600 dark:text-green-400">✓ Appointment Set</div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openDetailModal(request)}
                                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(request)}
                                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    {request.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(request)}
                                                                disabled={loadingIds.has(request.id)}
                                                                className={`px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded transition-colors ${loadingIds.has(request.id) ? 'opacity-70 cursor-wait' : ''}`}
                                                            >
                                                                {loadingIds.has(request.id) ? 'Working…' : 'Approve'}
                                                            </button>
                                                            <button
                                                                onClick={() => confirmDecline(request)}
                                                                disabled={loadingIds.has(request.id)}
                                                                className={`px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors ${loadingIds.has(request.id) ? 'opacity-70 cursor-wait' : ''}`}
                                                            >
                                                                {loadingIds.has(request.id) ? 'Working…' : 'Decline'}
                                                            </button>
                                                        </>
                                                    )}
                                                    {request.status === 'approved' && !request.patientId && (
                                                        <button
                                                            onClick={() => handleRegisterPatient(request)}
                                                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors whitespace-nowrap"
                                                        >
                                                            Register Patient
                                                        </button>
                                                    )}
                                                    {request.status === 'approved' && request.patientId && !request.appointmentId && (
                                                        <button
                                                            onClick={() => handleSetAppointment(request)}
                                                            className="px-3 py-1.5 text-xs font-medium text-white bg-brand hover:bg-brand-600 rounded transition-colors whitespace-nowrap"
                                                        >
                                                            Set Appointment
                                                        </button>
                                                    )}
                                                    {request.status === 'approved' && (
                                                        <button
                                                            onClick={() => confirmDelete(request)}
                                                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                                                        >
                                                            {loadingIds.has(request.id) ? 'Working…' : 'Delete'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Confirm Modal */}
                {confirmModal.open && confirmModal.request && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold">Confirm {confirmModal.action === 'decline' ? 'Decline' : 'Delete'}</h3>
                                <p className="text-sm text-muted mt-2">Are you sure you want to {confirmModal.action === 'decline' ? 'decline' : 'delete'} the request from <strong>{confirmModal.request.userName}</strong>?</p>
                                <div className="mt-4 flex justify-end gap-3">
                                    <button onClick={() => setConfirmModal({ open: false, action: 'decline' })} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                                    {confirmModal.action === 'decline' ? (
                                        <button onClick={() => handleDecline(confirmModal.request!)} className="px-4 py-2 bg-red-600 text-white rounded">Yes, Decline</button>
                                    ) : (
                                        <button onClick={() => handleDeleteRequest(confirmModal.request!)} className="px-4 py-2 bg-red-600 text-white rounded">Yes, Delete</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toasts */}
                <ToastNotification toasts={toasts} removeToast={removeToast} />

                {/* Detail Modal */}
                {showDetailModal && selectedRequest && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold">Request Details</h2>
                                <button
                                    onClick={closeDetailModal}
                                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-muted">Name</label>
                                    <p className="mt-1">{selectedRequest.userName}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-muted">Email</label>
                                    <p className="mt-1">{selectedRequest.userEmail}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-muted">Phone</label>
                                    <p className="mt-1">{selectedRequest.userPhone || 'Not provided'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-muted">Message</label>
                                    <p className="mt-1 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                        {selectedRequest.message || 'No message provided'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-muted">Status</label>
                                    <div className="mt-1">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedRequest.status)}`}>
                                            {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-muted">Requested On</label>
                                    <p className="mt-1">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                                </div>
                                {selectedRequest.status !== 'pending' && (
                                    <div>
                                        <label className="text-sm font-semibold text-muted">Updated On</label>
                                        <p className="mt-1">{new Date(selectedRequest.updatedAt).toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
                                <button
                                    onClick={closeDetailModal}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {showEditModal && selectedRequest && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold">Edit Request</h2>
                                <button
                                    onClick={closeEditModal}
                                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleUpdateRequest} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Name *</label>
                                    <input
                                        type="text"
                                        value={editForm.userName}
                                        onChange={(e) => setEditForm({ ...editForm, userName: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Email *</label>
                                    <input
                                        type="email"
                                        value={editForm.userEmail}
                                        onChange={(e) => setEditForm({ ...editForm, userEmail: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Phone *</label>
                                    <input
                                        type="text"
                                        value={editForm.userPhone}
                                        onChange={(e) => setEditForm({ ...editForm, userPhone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Message</label>
                                    <textarea
                                        value={editForm.message}
                                        onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-600 transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
    )
}
