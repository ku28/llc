import { useState, useEffect } from 'react'
import Link from 'next/link'
import CustomSelect from '../components/CustomSelect'
import ImportVisitsModal from '../components/ImportVisitsModal'
import PatientSelectionModal from '../components/PatientSelectionModal'
import LoadingModal from '../components/LoadingModal'
import { useToast } from '../hooks/useToast'

export default function VisitsPage() {
    const [visits, setVisits] = useState<any[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [form, setForm] = useState({ patientId: '', opdNo: '', diagnoses: '' })
    const [searchQuery, setSearchQuery] = useState('')
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [visitToDelete, setVisitToDelete] = useState<any>(null)
    const [confirmModalAnimating, setConfirmModalAnimating] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showPatientModal, setShowPatientModal] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const isPatient = user?.role?.toLowerCase() === 'user'
    const { toasts, removeToast, showSuccess, showError } = useToast()
    
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    useEffect(() => { 
        setLoading(true)
        Promise.all([
            fetch('/api/visits').then(r => r.json()),
            fetch('/api/patients').then(r => r.json())
        ]).then(([visitsData, patientsData]) => {
            // Filter visits for user role - show only their own visits
            let filteredVisits = visitsData
            if (user?.role?.toLowerCase() === 'user') {
                filteredVisits = visitsData.filter((v: any) => 
                    v.patient?.email === user.email || v.patient?.phone === user.phone
                )
            }
            setVisits(filteredVisits)
            setPatients(patientsData)
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [user])

    async function create(e: any) {
        e.preventDefault()
        await fetch('/api/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        setVisits(await (await fetch('/api/visits')).json())
        setForm({ patientId: '', opdNo: '', diagnoses: '' })
    }

    function openDeleteModal(visit: any) {
        setVisitToDelete(visit)
        setConfirmModalAnimating(false)
    }

    function closeConfirmModal() {
        setConfirmModalAnimating(true)
        setTimeout(() => {
            setVisitToDelete(null)
            setConfirmModalAnimating(false)
        }, 300)
    }

    async function handleConfirmDelete() {
        if (!visitToDelete) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/visits?id=${visitToDelete.id}`, { method: 'DELETE' })
            if (res.ok) {
                setVisits(visits.filter(v => v.id !== visitToDelete.id))
                showSuccess('Visit deleted successfully')
                closeConfirmModal()
            } else {
                const error = await res.json().catch(() => ({ error: 'Failed to delete visit' }))
                showError(error.error || 'Failed to delete visit')
            }
        } catch (err) {
            console.error(err)
            showError('Failed to delete visit')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div>
            <LoadingModal isOpen={loading} message="Loading visits..." />
            <div className="section-header flex justify-between items-center">
                <h2 className="section-title">{isPatient ? 'My Appointments' : 'Patient Visits'}</h2>
                <div className="flex items-center gap-3">
                    {!isPatient && (
                        <button 
                            onClick={() => setShowImportModal(true)} 
                            className="btn bg-green-600 hover:bg-green-700 text-white"
                        >
                            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Import Visits
                        </button>
                    )}
                    <span className="badge">
                        {visits.filter(v => {
                            if (!searchQuery) return true
                            const patientName = (v.patient ? `${v.patient.firstName || ''} ${v.patient.lastName || ''}` : '').toLowerCase()
                            const opdNo = (v.opdNo || '').toLowerCase()
                            const search = searchQuery.toLowerCase()
                            return patientName.includes(search) || opdNo.includes(search)
                        }).length} total {isPatient ? 'appointments' : 'visits'}
                    </span>
                    {!isPatient && (
                        <button
                            onClick={() => setShowPatientModal(true)}
                            className="btn btn-primary text-sm"
                        >
                            Create Visit with Prescriptions
                        </button>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="card mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="🔍 Search visits by patient name or OPD number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                        <svg className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="card">
                <h3 className="text-lg font-semibold mb-4">{isPatient ? 'My Appointment History' : 'Visit History'}</h3>
                {(() => {
                    const filteredVisits = visits.filter(v => {
                        if (!searchQuery) return true
                        const patientName = (v.patient ? `${v.patient.firstName || ''} ${v.patient.lastName || ''}` : '').toLowerCase()
                        const opdNo = (v.opdNo || '').toLowerCase()
                        const search = searchQuery.toLowerCase()
                        return patientName.includes(search) || opdNo.includes(search)
                    })
                    
                    if (loading) {
                        return (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                <p className="text-muted">Loading visits...</p>
                            </div>
                        )
                    }
                    
                    if (filteredVisits.length === 0 && searchQuery) {
                        return (
                            <div className="text-center py-8 text-muted">
                                <p className="text-lg mb-2">No visits found</p>
                                <p className="text-sm">Try adjusting your search query</p>
                            </div>
                        )
                    }
                    
                    if (filteredVisits.length === 0) {
                        return (
                            <div className="text-center py-8 text-muted">
                                {isPatient ? 'You have no appointments yet' : 'No visits recorded yet'}
                            </div>
                        )
                    }
                    
                    return (
                        <>
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredVisits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(v => (
                            <li key={v.id} className="list-item">
                                <div className="flex items-start gap-4">
                                    {/* Patient Image Circle */}
                                    <div className="flex-shrink-0">
                                        <img 
                                            src={v.patient?.imageUrl || process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || ''} 
                                            alt="Patient" 
                                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                                        />
                                    </div>
                                    
                                    {/* Visit Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-semibold text-base">
                                                {v.patient?.firstName} {v.patient?.lastName}
                                            </h4>
                                            <span className="badge">OPD: {v.opdNo}</span>
                                        </div>
                                        <div className="text-sm text-muted space-y-1">
                                            <div><span className="font-medium">Date:</span> {new Date(v.date).toLocaleString()}</div>
                                            {v.diagnoses && <div><span className="font-medium">Diagnosis:</span> {v.diagnoses}</div>}
                                            {v.prescriptions && v.prescriptions.length > 0 && (
                                                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                                    <span className="font-medium">Prescriptions:</span> {v.prescriptions.length} item(s)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-2 self-start flex-shrink-0">
                                        <Link href={`/visits/${v.id}`} className="btn btn-primary text-sm">
                                            View Details
                                        </Link>
                                        {!isPatient && (
                                            <>
                                                <Link href={`/prescriptions?visitId=${v.id}&edit=true`} className="btn btn-secondary text-sm">
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => openDeleteModal(v)}
                                                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    
                    {/* Pagination Controls */}
                    {filteredVisits.length > itemsPerPage && (
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
                                Page {currentPage} of {Math.ceil(filteredVisits.length / itemsPerPage)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredVisits.length / itemsPerPage), prev + 1))}
                                disabled={currentPage === Math.ceil(filteredVisits.length / itemsPerPage)}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Next
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                    </>
                    )
                })()}
            </div>

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slideIn ${
                        toast.type === 'success' ? 'bg-green-500 text-white' :
                        toast.type === 'error' ? 'bg-red-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                        <span className="flex-1">{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} className="text-white hover:text-gray-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* Delete Confirmation Modal */}
            {visitToDelete && (
                <div 
                    className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${
                        confirmModalAnimating ? 'opacity-0' : 'opacity-100'
                    }`}
                    onClick={closeConfirmModal}
                >
                    <div 
                        className={`bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl transition-transform duration-300 ${
                            confirmModalAnimating ? 'scale-95' : 'scale-100'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Visit</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                            Are you sure you want to delete the visit for <span className="font-semibold">{visitToDelete.patient?.firstName} {visitToDelete.patient?.lastName}</span> (OPD: {visitToDelete.opdNo})?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={closeConfirmModal}
                                disabled={deleting}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleting && (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {deleting ? 'Deleting...' : 'Delete Visit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ImportVisitsModal 
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportSuccess={() => {
                    fetch('/api/visits')
                        .then(r => r.json())
                        .then(data => setVisits(data))
                    showSuccess('Visits imported successfully!')
                }}
            />

            <PatientSelectionModal
                isOpen={showPatientModal}
                onClose={() => setShowPatientModal(false)}
            />

            {/* Floating Button */}
            <button
                onClick={() => setShowPatientModal(true)}
                className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50"
                title="Create Visit with Prescription"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    )
}
