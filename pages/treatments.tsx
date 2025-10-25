import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { requireDoctorOrAdmin } from '../lib/withAuth'
import ConfirmationModal from '../components/ConfirmationModal'
import LoadingModal from '../components/LoadingModal'
import ImportTreatmentModal from '../components/ImportTreatmentModal'

function TreatmentsPage() {
    const router = useRouter()
    const [items, setItems] = useState<any[]>([])
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [selectedPlanByDiagnosis, setSelectedPlanByDiagnosis] = useState<{[key: string]: number}>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
    const [deleteAllDiagnosis, setDeleteAllDiagnosis] = useState<string>('')
    const [deleteAllIds, setDeleteAllIds] = useState<number[]>([])
    const [deleteAllProgress, setDeleteAllProgress] = useState({ current: 0, total: 0 })
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])
    useEffect(() => { 
        fetchTreatments()
    }, [])

    function fetchTreatments() {
        setLoading(true)
        fetch('/api/treatments').then(r => r.json()).then(treatmentsData => {
            setItems(Array.isArray(treatmentsData) ? treatmentsData : [])
            setLoading(false)
        }).catch(() => setLoading(false))
    }

    function handleImportSuccess() {
        fetchTreatments()
    }

    function toggleRowExpansion(id: string) {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
    }

    function openDeleteConfirmation(id: number) {
        setDeleteId(id)
        setShowDeleteConfirm(true)
    }

    async function confirmDelete() {
        if (deleteId === null) return
        
        setShowDeleteConfirm(false)
        setDeleting(true)
        
        try {
            const response = await fetch('/api/treatments', { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ id: deleteId }) 
            })
            if (response.ok) {
                setItems(await (await fetch('/api/treatments')).json())
            } else {
                const error = await response.json()
                alert('Failed to delete treatment: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Delete error:', error)
            alert('Failed to delete treatment')
        } finally {
            setDeleting(false)
            setDeleteId(null)
        }
    }

    function cancelDelete() {
        setShowDeleteConfirm(false)
        setDeleteId(null)
    }

    function openDeleteAllConfirmation(diagnosis: string, treatmentIds: number[]) {
        setDeleteAllDiagnosis(diagnosis)
        setDeleteAllIds(treatmentIds)
        setShowDeleteAllConfirm(true)
    }

    async function confirmDeleteAll() {
        if (deleteAllIds.length === 0) return
        
        setShowDeleteAllConfirm(false)
        setDeleting(true)
        
        const totalPlans = deleteAllIds.length
        setDeleteAllProgress({ current: 0, total: totalPlans })
        
        try {
            // Use bulk delete endpoint for much faster deletion
            const response = await fetch('/api/treatments/bulk', { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ ids: deleteAllIds }) 
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(`Failed to delete treatments: ${error.error || 'Unknown error'}`)
            }

            const result = await response.json()
            
            // Quick animation to show completion
            const steps = Math.min(10, totalPlans)
            for (let i = 1; i <= steps; i++) {
                setDeleteAllProgress({ 
                    current: Math.floor((i / steps) * totalPlans), 
                    total: totalPlans 
                })
                await new Promise(resolve => setTimeout(resolve, 30))
            }
            setDeleteAllProgress({ current: totalPlans, total: totalPlans })
            
            // Small delay to show completion
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Refresh the list
            await fetchTreatments()
        } catch (error: any) {
            console.error('Delete all error:', error)
            alert('Failed to delete all treatments: ' + error.message)
        } finally {
            setDeleting(false)
            setDeleteAllDiagnosis('')
            setDeleteAllIds([])
            setDeleteAllProgress({ current: 0, total: 0 })
        }
    }

    function cancelDeleteAll() {
        setShowDeleteAllConfirm(false)
        setDeleteAllDiagnosis('')
        setDeleteAllIds([])
    }

    return (
        <div>
            {/* Import Modal */}
            <ImportTreatmentModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportSuccess={handleImportSuccess}
            />

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title="Delete Treatment Plan"
                message="Are you sure you want to delete this treatment plan? This action will soft-delete the plan and renumber the remaining plans."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                type="danger"
            />

            {/* Delete All Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteAllConfirm}
                title="Delete All Plans"
                message={`Are you sure you want to delete ALL ${deleteAllIds.length} treatment plan${deleteAllIds.length > 1 ? 's' : ''} for "${deleteAllDiagnosis}"? This action will soft-delete all plans in this diagnosis group.`}
                confirmText={`Delete All ${deleteAllIds.length} Plans`}
                cancelText="Cancel"
                onConfirm={confirmDeleteAll}
                onCancel={cancelDeleteAll}
                type="danger"
            />

            {/* Deleting Loading Modal */}
            {deleting && deleteAllProgress.total > 0 ? (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
                        <div className="text-center">
                            <div className="mb-6">
                                <svg className="w-16 h-16 mx-auto text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Deleting Treatment Plans
                            </h3>
                            
                            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                                {deleteAllProgress.current} / {deleteAllProgress.total}
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                {Math.round((deleteAllProgress.current / deleteAllProgress.total) * 100)}% Complete
                            </p>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                                <div 
                                    className="bg-red-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                                    style={{ width: `${(deleteAllProgress.current / deleteAllProgress.total) * 100}%` }}
                                >
                                    <span className="text-xs text-white font-medium">
                                        {deleteAllProgress.current > 0 && `${Math.round((deleteAllProgress.current / deleteAllProgress.total) * 100)}%`}
                                    </span>
                                </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                                Please wait, deleting plan {deleteAllProgress.current} of {deleteAllProgress.total}...
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <LoadingModal isOpen={deleting} message="Deleting treatment plan..." />
            )}

            <div className="section-header flex justify-between items-center">
                <h2 className="section-title">Treatment Management</h2>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowImportModal(true)}
                        className="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Import Treatment Plans
                    </button>
                    <button 
                        onClick={() => router.push('/treatments/new')}
                        className="btn btn-primary"
                    >
                        + Add New Treatment
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="card mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="🔍 Search treatments by diagnosis or treatment plan..."
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

            {/* Treatments Table */}
            <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                    <span>Treatment Plans</span>
                    <span className="badge">
                        {(() => {
                            const filtered = items.filter((t: any) => {
                                if (!searchQuery) return true
                                const diagnosis = (t.provDiagnosis || '').toLowerCase()
                                const treatmentPlan = (t.treatmentPlan || '').toLowerCase()
                                const search = searchQuery.toLowerCase()
                                return diagnosis.includes(search) || treatmentPlan.includes(search)
                            })
                            return filtered.length
                        })()} treatments
                    </span>
                </h3>
                {(() => {
                    const filteredItems = items.filter((t: any) => {
                        if (!searchQuery) return true
                        const diagnosis = (t.provDiagnosis || '').toLowerCase()
                        const treatmentPlan = (t.treatmentPlan || '').toLowerCase()
                        const search = searchQuery.toLowerCase()
                        return diagnosis.includes(search) || treatmentPlan.includes(search)
                    })
                    
                    if (loading) {
                        return (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                <p className="text-muted">Loading treatments...</p>
                            </div>
                        )
                    }
                    
                    if (filteredItems.length === 0 && searchQuery) {
                        return (
                            <div className="text-center py-12 text-muted">
                                <p className="text-lg mb-2">No treatments found</p>
                                <p className="text-sm">Try adjusting your search query</p>
                            </div>
                        )
                    }
                    
                    if (filteredItems.length === 0) {
                        return (
                            <div className="text-center py-12 text-muted">
                                <p className="text-lg mb-2">No treatments available yet</p>
                                <p className="text-sm">Click "Add New Treatment" to get started</p>
                            </div>
                        )
                    }
                    
                    return (
                        <div className="space-y-2">
                            {(() => {
                                // Group treatments by provDiagnosis
                                const groupedByDiagnosis = filteredItems.reduce((acc: any, t: any) => {
                                const key = t.provDiagnosis || 'Unknown'
                                if (!acc[key]) {
                                    acc[key] = []
                                }
                                acc[key].push(t)
                                return acc
                            }, {})

                            // Sort each group by plan number
                            Object.keys(groupedByDiagnosis).forEach(key => {
                                groupedByDiagnosis[key].sort((a: any, b: any) => {
                                    const aNum = a.planNumber || '00'
                                    const bNum = b.planNumber || '00'
                                    return aNum.localeCompare(bNum)
                                })
                            })

                            const groupedEntries = Object.entries(groupedByDiagnosis)
                            const paginatedEntries = groupedEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

                            return (
                                <>
                                {paginatedEntries.map(([diagnosis, treatments]: [string, any]) => {
                                const firstTreatment = treatments[0]
                                const groupKey = `diagnosis-${diagnosis}`
                                const isExpanded = expandedRows.has(groupKey as any)
                                
                                return (
                                    <div key={groupKey} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                        {/* Summary Row */}
                                        <div className="bg-gray-50 dark:bg-gray-800 p-3 flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm">{diagnosis}</div>
                                                <div className="text-xs text-muted mt-0.5">
                                                    {firstTreatment.speciality} • {firstTreatment.organ} • {firstTreatment.diseaseAction}
                                                    <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                                        {treatments.length} plan{treatments.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        const params = new URLSearchParams({
                                                            diagnosis: firstTreatment.provDiagnosis || '',
                                                            speciality: firstTreatment.speciality || '',
                                                            organ: firstTreatment.organ || '',
                                                            diseaseAction: firstTreatment.diseaseAction || ''
                                                        })
                                                        router.push(`/treatments/new?${params.toString()}`)
                                                    }}
                                                    className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                                                    title="Add Plan"
                                                >
                                                    + Add Plan
                                                </button>
                                                <button
                                                    onClick={() => openDeleteAllConfirmation(diagnosis, treatments.map((t: any) => t.id))}
                                                    className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1"
                                                    title="Delete All Plans"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Delete All
                                                </button>
                                                <button
                                                    onClick={() => toggleRowExpansion(groupKey as any)}
                                                    className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                                                    title={isExpanded ? "Hide Details" : "View More"}
                                                >
                                                    {isExpanded ? '▲ Hide' : '▼ View More'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Details - Show all plans */}
                                        {isExpanded && (() => {
                                            // Get or set the selected plan index for this diagnosis
                                            const selectedIndex = selectedPlanByDiagnosis[groupKey] ?? 0
                                            const selectedTreatment = treatments[selectedIndex] || treatments[0]
                                            
                                            return (
                                                <div className="p-4 bg-white dark:bg-gray-900 space-y-4">
                                                    {/* Basic Info (common across all plans) */}
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Speciality</div>
                                                            <div className="text-sm font-medium">{firstTreatment.speciality || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Organ</div>
                                                            <div className="text-sm font-medium">{firstTreatment.organ || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Disease Action</div>
                                                            <div className="text-sm font-medium">{firstTreatment.diseaseAction || '-'}</div>
                                                        </div>
                                                    </div>

                                                    {/* Plan Selector Dropdown */}
                                                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                                        <label className="text-sm font-semibold">Select Plan:</label>
                                                        <select
                                                            value={selectedIndex}
                                                            onChange={(e) => {
                                                                setSelectedPlanByDiagnosis({
                                                                    ...selectedPlanByDiagnosis,
                                                                    [groupKey]: parseInt(e.target.value)
                                                                })
                                                            }}
                                                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            {treatments.map((t: any, idx: number) => (
                                                                <option key={t.id} value={idx}>
                                                                    Plan {t.planNumber || (idx + 1).toString().padStart(2, '0')} - {t.treatmentPlan || diagnosis}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="flex-1"></div>
                                                        <button
                                                            onClick={() => router.push(`/treatments/${selectedTreatment.id}`)}
                                                            className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                                            title="Edit"
                                                        >
                                                            ✏️ Edit Plan
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteConfirmation(selectedTreatment.id)}
                                                            className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                                                            title="Delete"
                                                        >
                                                            🗑️ Delete Plan
                                                        </button>
                                                    </div>

                                                    {/* Selected Treatment Plan Details */}
                                                    <div>
                                                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                            {/* Plan Header */}
                                                            <div className="mb-3">
                                                                <div className="font-semibold text-base mb-2">
                                                                    Plan {selectedTreatment.planNumber || '-'}: {selectedTreatment.treatmentPlan || diagnosis}
                                                                </div>
                                                            </div>

                                                            {/* Plan Details */}
                                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                                {selectedTreatment.administration && (
                                                                    <div>
                                                                        <div className="text-xs text-muted mb-1">Administration</div>
                                                                        <div className="text-sm font-medium">{selectedTreatment.administration}</div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Notes */}
                                                            {selectedTreatment.notes && (
                                                                <div className="mb-3">
                                                                    <div className="text-xs text-muted mb-1">Notes</div>
                                                                    <div className="text-sm p-2 bg-white dark:bg-gray-900 rounded border">
                                                                        {selectedTreatment.notes}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Medicines */}
                                                            <div>
                                                                <div className="text-xs font-semibold mb-2">Medicines ({selectedTreatment.treatmentProducts?.length || 0})</div>
                                                                {selectedTreatment.treatmentProducts && selectedTreatment.treatmentProducts.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        {selectedTreatment.treatmentProducts.map((tp: any, idx: number) => (
                                                                            <div key={tp.id} className="p-2 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600">
                                                                                <div className="flex items-start justify-between mb-1">
                                                                                    <div className="font-semibold text-xs">{tp.product?.name || 'Unknown Medicine'}</div>
                                                                                    <div className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                                                                        Qty: {tp.quantity || '-'}
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-[10px]">
                                                                                    {(tp.comp1 || tp.comp2 || tp.comp3 || tp.comp4 || tp.comp5) && (
                                                                                        <div className="col-span-2 md:col-span-3">
                                                                                            <span className="text-muted">Compositions: </span>
                                                                                            <span className="font-medium">
                                                                                                {[tp.comp1, tp.comp2, tp.comp3, tp.comp4, tp.comp5].filter(Boolean).join(', ')}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                    {tp.timing && (
                                                                                        <div>
                                                                                            <span className="text-muted">Timing: </span>
                                                                                            <span className="font-medium">{tp.timing}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {tp.dosage && (
                                                                                        <div>
                                                                                            <span className="text-muted">Dosage: </span>
                                                                                            <span className="font-medium">{tp.dosage}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {tp.additions && (
                                                                                        <div>
                                                                                            <span className="text-muted">Additions: </span>
                                                                                            <span className="font-medium">{tp.additions}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {tp.procedure && (
                                                                                        <div>
                                                                                            <span className="text-muted">Procedure: </span>
                                                                                            <span className="font-medium">{tp.procedure}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {tp.presentation && (
                                                                                        <div>
                                                                                            <span className="text-muted">Presentation: </span>
                                                                                            <span className="font-medium">{tp.presentation}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {tp.droppersToday !== null && tp.droppersToday !== undefined && (
                                                                                        <div>
                                                                                            <span className="text-muted">Droppers Today: </span>
                                                                                            <span className="font-medium">{tp.droppersToday}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {tp.medicineQuantity !== null && tp.medicineQuantity !== undefined && (
                                                                                        <div>
                                                                                            <span className="text-muted">Medicine Qty: </span>
                                                                                            <span className="font-medium">{tp.medicineQuantity}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-muted italic p-2 bg-white dark:bg-gray-900 rounded">
                                                                        No medicines added
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )
                            })}

                            {/* Pagination Controls */}
                            {groupedEntries.length > itemsPerPage && (
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
                                        Page {currentPage} of {Math.ceil(groupedEntries.length / itemsPerPage)}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(groupedEntries.length / itemsPerPage), prev + 1))}
                                        disabled={currentPage === Math.ceil(groupedEntries.length / itemsPerPage)}
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
                    )
                })()}
            </div>
        </div>
    )
}

// Protect this page - only doctors and admins can access
export default requireDoctorOrAdmin(TreatmentsPage)
