import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { requireDoctorOrAdmin } from '../lib/withAuth'
import ConfirmationModal from '../components/ConfirmationModal'
import LoadingModal from '../components/LoadingModal'

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
    
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])
    useEffect(() => { 
        setLoading(true)
        fetch('/api/treatments').then(r => r.json()).then(treatmentsData => {
            setItems(Array.isArray(treatmentsData) ? treatmentsData : [])
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [])

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

    return (
        <div>
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

            {/* Deleting Loading Modal */}
            <LoadingModal isOpen={deleting} message="Deleting treatment plan..." />

            <div className="section-header flex justify-between items-center">
                <h2 className="section-title">Treatment Management</h2>
                <button 
                    onClick={() => router.push('/treatments/new')}
                    className="btn btn-primary"
                >
                    + Add New Treatment
                </button>
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

                            return Object.entries(groupedByDiagnosis).map(([diagnosis, treatments]: [string, any]) => {
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
                            })
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
