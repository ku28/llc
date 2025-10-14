import { useState, useEffect } from 'react'
import { requireDoctorOrAdmin } from '../lib/withAuth'

function TreatmentsPage() {
    const [items, setItems] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [selectedPlanByDiagnosis, setSelectedPlanByDiagnosis] = useState<{[key: string]: number}>({})
    const [searchQuery, setSearchQuery] = useState('')
    
    // Treatment plans array - each can have different medicines and details
    const [treatmentPlans, setTreatmentPlans] = useState<any[]>([])
    
    const emptyForm = {
        srNo: '',
        speciality: '',
        organ: '',
        diseaseAction: '',
        provDiagnosis: ''
    }
    
    const [form, setForm] = useState(emptyForm)
    const [user, setUser] = useState<any>(null)
    
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])
    useEffect(() => { 
        fetch('/api/treatments').then(r => r.json()).then(data => setItems(Array.isArray(data) ? data : []))
    }, [])
    useEffect(() => { 
        fetch('/api/products').then(r => r.json()).then(data => setProducts(Array.isArray(data) ? data : []))
    }, [])

    function updateProvDiagnosis(newDiagnosis: string) {
        setForm({ ...form, provDiagnosis: newDiagnosis })
        // Update all existing treatment plan details with new diagnosis
        if (treatmentPlans.length > 0) {
            const updatedPlans = treatmentPlans.map(plan => ({
                ...plan,
                treatmentPlan: newDiagnosis ? `${newDiagnosis} ${plan.planNumber}` : ''
            }))
            setTreatmentPlans(updatedPlans)
        }
    }

    function addTreatmentPlan() {
        const newPlanNumber = String(treatmentPlans.length + 1).padStart(2, '0')
        const treatmentPlanDetails = form.provDiagnosis ? `${form.provDiagnosis} ${newPlanNumber}` : ''
        
        setTreatmentPlans([...treatmentPlans, { 
            planNumber: newPlanNumber,
            treatmentPlan: treatmentPlanDetails,
            administration: '',
            notes: '',
            medicines: []
        }])
    }

    function removeTreatmentPlan(index: number) {
        setTreatmentPlans(treatmentPlans.filter((_, i) => i !== index))
    }

    function updateTreatmentPlan(index: number, field: string, value: any) {
        const updated = [...treatmentPlans]
        updated[index] = { ...updated[index], [field]: value }
        setTreatmentPlans(updated)
    }

    function addMedicineToPlan(planIndex: number) {
        const updated = [...treatmentPlans]
        updated[planIndex].medicines.push({ 
            productId: '', 
            comp1: '', 
            comp2: '', 
            comp3: '', 
            quantity: 1,
            timing: '',
            dosage: '',
            additions: '',
            procedure: '',
            presentation: '',
            droppersToday: '',
            medicineQuantity: ''
        })
        setTreatmentPlans(updated)
    }

    function removeMedicineFromPlan(planIndex: number, medicineIndex: number) {
        const updated = [...treatmentPlans]
        updated[planIndex].medicines = updated[planIndex].medicines.filter((_: any, i: number) => i !== medicineIndex)
        setTreatmentPlans(updated)
    }

    function updateMedicineInPlan(planIndex: number, medicineIndex: number, field: string, value: any) {
        const updated = [...treatmentPlans]
        updated[planIndex].medicines[medicineIndex] = { 
            ...updated[planIndex].medicines[medicineIndex], 
            [field]: value 
        }
        setTreatmentPlans(updated)
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

    function editTreatment(treatment: any) {
        setEditingId(treatment.id)
        setForm({
            srNo: treatment.srNo || '',
            speciality: treatment.speciality || '',
            organ: treatment.organ || '',
            diseaseAction: treatment.diseaseAction || '',
            provDiagnosis: treatment.provDiagnosis || ''
        })
        // Load existing treatment plan (for edit mode, convert single plan to array format)
        if (treatment.treatmentProducts && treatment.treatmentProducts.length > 0) {
            setTreatmentPlans([{
                planNumber: treatment.planNumber || '01',
                treatmentPlan: treatment.treatmentPlan || '',
                administration: treatment.administration || '',
                notes: treatment.notes || '',
                medicines: treatment.treatmentProducts.map((tp: any) => ({
                    id: tp.id,
                    productId: tp.productId.toString(),
                    comp1: tp.comp1 || '',
                    comp2: tp.comp2 || '',
                    comp3: tp.comp3 || '',
                    quantity: tp.quantity || 1,
                    timing: tp.timing || '',
                    dosage: tp.dosage || '',
                    additions: tp.additions || '',
                    procedure: tp.procedure || '',
                    presentation: tp.presentation || '',
                    droppersToday: tp.droppersToday?.toString() || '',
                    medicineQuantity: tp.medicineQuantity?.toString() || ''
                }))
            }])
        } else {
            setTreatmentPlans([])
        }
        setIsModalOpen(true)
        setIsAnimating(false)
        // Small delay to trigger opening animation
        setTimeout(() => setIsAnimating(true), 10)
    }

    function openModal() {
        setIsModalOpen(true)
        setIsAnimating(false)
        setTimeout(() => setIsAnimating(true), 10)
    }

    function closeModal() {
        setIsAnimating(false)
        setTimeout(() => {
            setIsModalOpen(false)
            setEditingId(null)
            setForm(emptyForm)
            setTreatmentPlans([])
        }, 300) // Match the animation duration
    }

    function cancelEdit() {
        closeModal()
    }

    async function create(e: any) {
        e.preventDefault()
        
        // Save each treatment plan as a separate treatment entry
        for (let i = 0; i < treatmentPlans.length; i++) {
            const plan = treatmentPlans[i]
            const treatmentData = {
                srNo: form.srNo,
                speciality: form.speciality,
                organ: form.organ,
                diseaseAction: form.diseaseAction,
                provDiagnosis: form.provDiagnosis,
                planNumber: plan.planNumber,
                treatmentPlan: plan.treatmentPlan,
                administration: plan.administration,
                notes: plan.notes,
                products: plan.medicines.filter((p: any) => p.productId).map((p: any) => ({
                    productId: p.productId,
                    comp1: p.comp1,
                    comp2: p.comp2,
                    comp3: p.comp3,
                    quantity: p.quantity,
                    timing: p.timing,
                    dosage: p.dosage,
                    additions: p.additions,
                    procedure: p.procedure,
                    presentation: p.presentation,
                    droppersToday: p.droppersToday ? parseInt(p.droppersToday) : null,
                    medicineQuantity: p.medicineQuantity ? parseInt(p.medicineQuantity) : null
                }))
            }
            
            // Only use PUT for the first plan if editing, POST for all others
            const method = (editingId && i === 0) ? 'PUT' : 'POST'
            const body = (editingId && i === 0) ? { id: editingId, ...treatmentData } : treatmentData
            
            const res = await fetch('/api/treatments', { 
                method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(body) 
            })
            
            if (!res.ok) {
                const err = await res.text()
                console.error('Save treatment failed:', err)
                alert('Failed to save treatment')
                return
            }
        }
        
        // refresh full list after successful create/update
        const list = await (await fetch('/api/treatments')).json()
        setItems(list)
        closeModal()
    }

    async function deleteTreatment(id: number) {
        if (!confirm('Are you sure you want to delete this treatment?')) return
        try {
            const response = await fetch('/api/treatments', { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ id }) 
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
        }
    }

    return (
        <div>
            <div className="section-header flex justify-between items-center">
                <h2 className="section-title">Treatment Management</h2>
                <button 
                    onClick={openModal}
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

            {/* Modal/Dialog */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-200 ease-out"
                    style={{
                        opacity: isAnimating ? 1 : 0,
                        backgroundColor: isAnimating ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)'
                    }}
                    onClick={cancelEdit}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out"
                        style={{
                            opacity: isAnimating ? 1 : 0,
                            transform: isAnimating ? 'scale(1)' : 'scale(0.95)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">
                                    {editingId ? 'Edit Treatment' : 'Add New Treatment'}
                                </h3>
                                <button 
                                    onClick={closeModal}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={create} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Sr No</label>
                                        <input 
                                            placeholder="001" 
                                            value={form.srNo} 
                                            onChange={e => setForm({ ...form, srNo: e.target.value })} 
                                            className="p-2 border rounded w-full" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Speciality</label>
                                        <input 
                                            placeholder="Cardiology" 
                                            value={form.speciality} 
                                            onChange={e => setForm({ ...form, speciality: e.target.value })} 
                                            className="p-2 border rounded w-full" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Organ</label>
                                        <input 
                                            placeholder="Heart" 
                                            value={form.organ} 
                                            onChange={e => setForm({ ...form, organ: e.target.value })} 
                                            className="p-2 border rounded w-full" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Disease Action</label>
                                        <input 
                                            placeholder="Anti-inflammatory" 
                                            value={form.diseaseAction} 
                                            onChange={e => setForm({ ...form, diseaseAction: e.target.value })} 
                                            className="p-2 border rounded w-full" 
                                        />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-4">
                                        <label className="block text-sm font-medium mb-1.5">Provisional Diagnosis *</label>
                                        <input 
                                            required 
                                            placeholder="e.g., ABSCESS RENAL" 
                                            value={form.provDiagnosis} 
                                            onChange={e => updateProvDiagnosis(e.target.value)} 
                                            className="p-2 border rounded w-full" 
                                        />
                                        <p className="text-xs text-muted mt-1">Enter the main diagnosis, then add treatment plan variations below. Treatment plan names will be auto-generated.</p>
                                    </div>
                                </div>
                                
                                {/* Treatment Plans Section */}
                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-base font-semibold">Treatment Plans</h4>
                                        <button type="button" onClick={addTreatmentPlan} className="btn btn-secondary text-sm">
                                            + Add Treatment Plan
                                        </button>
                                    </div>
                                    
                                    {treatmentPlans.length === 0 ? (
                                        <p className="text-sm text-muted">No treatment plans added yet. Click "Add Treatment Plan" to create variations.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {treatmentPlans.map((plan, planIndex) => (
                                                <div key={planIndex} className="border-2 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                                                    {/* Plan Header */}
                                                    <div className="flex items-center justify-between mb-4 pb-3 border-b">
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-sm font-medium">Plan Number:</label>
                                                            <input 
                                                                type="text"
                                                                value={plan.planNumber} 
                                                                readOnly
                                                                disabled
                                                                className="p-1.5 border rounded w-20 text-sm font-semibold bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                                                            />
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeTreatmentPlan(planIndex)}
                                                            className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                                        >
                                                            × Remove Plan
                                                        </button>
                                                    </div>

                                                    {/* Plan Details Form */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                                                        <div className="sm:col-span-2 lg:col-span-3">
                                                            <label className="block text-xs font-medium mb-1">Treatment Plan Details (Auto-generated)</label>
                                                            <input 
                                                                value={plan.treatmentPlan} 
                                                                readOnly
                                                                disabled
                                                                className="p-2 border rounded w-full text-sm bg-gray-100 dark:bg-gray-700 cursor-not-allowed font-semibold" 
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1">Administration</label>
                                                            <input 
                                                                placeholder="Oral" 
                                                                value={plan.administration} 
                                                                onChange={e => updateTreatmentPlan(planIndex, 'administration', e.target.value)}
                                                                className="p-2 border rounded w-full text-sm" 
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-xs font-medium mb-1">Notes</label>
                                                            <textarea 
                                                                rows={2} 
                                                                placeholder="Additional notes" 
                                                                value={plan.notes} 
                                                                onChange={e => updateTreatmentPlan(planIndex, 'notes', e.target.value)}
                                                                className="p-2 border rounded w-full text-sm" 
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Medicines Section for this Plan */}
                                                    <div className="border-t pt-3 mt-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h5 className="text-sm font-semibold">Medicines for Plan {plan.planNumber}</h5>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => addMedicineToPlan(planIndex)}
                                                                className="btn btn-secondary text-xs"
                                                            >
                                                                + Add Medicine
                                                            </button>
                                                        </div>
                                                        
                                                        {plan.medicines.length === 0 ? (
                                                            <p className="text-xs text-muted">No medicines in this plan. Click "Add Medicine" to add products.</p>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {plan.medicines.map((medicine: any, medicineIndex: number) => (
                                                                    <div key={medicineIndex} className="border rounded p-3 bg-white dark:bg-gray-700">
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                                                                            <div className="sm:col-span-2">
                                                                                <label className="block text-xs font-medium mb-1">Medicine</label>
                                                                                <select 
                                                                                    value={medicine.productId} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'productId', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                >
                                                                                    <option value="">Select medicine</option>
                                                                                    {products.map(p => (
                                                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Comp 1</label>
                                                                                <input 
                                                                                    placeholder="Component 1" 
                                                                                    value={medicine.comp1} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'comp1', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Comp 2</label>
                                                                                <input 
                                                                                    placeholder="Component 2" 
                                                                                    value={medicine.comp2} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'comp2', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Comp 3</label>
                                                                                <input 
                                                                                    placeholder="Component 3" 
                                                                                    value={medicine.comp3} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'comp3', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Qty (Drops)</label>
                                                                                <input 
                                                                                    type="number" 
                                                                                    min="1"
                                                                                    placeholder="0"
                                                                                    value={medicine.quantity} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'quantity', parseInt(e.target.value))}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Timing</label>
                                                                                <select 
                                                                                    value={medicine.timing} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'timing', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                >
                                                                                    <option value="">Select timing</option>
                                                                                    <option value="BM">Before Meal</option>
                                                                                    <option value="AM">After Meal</option>
                                                                                    <option value="WM">With Meal</option>
                                                                                    <option value="HS">At Bedtime</option>
                                                                                    <option value="EMPTY">Empty Stomach</option>
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Dosage</label>
                                                                                <input 
                                                                                    placeholder="5 drops, 3x daily"
                                                                                    value={medicine.dosage} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'dosage', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Additions</label>
                                                                                <input 
                                                                                    placeholder="Additional notes"
                                                                                    value={medicine.additions} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'additions', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Procedure</label>
                                                                                <input 
                                                                                    placeholder="Procedure"
                                                                                    value={medicine.procedure} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'procedure', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Presentation</label>
                                                                                <input 
                                                                                    placeholder="Tablet, Drops, etc."
                                                                                    value={medicine.presentation} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'presentation', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Droppers Today</label>
                                                                                <input 
                                                                                    type="number"
                                                                                    placeholder="0"
                                                                                    value={medicine.droppersToday} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'droppersToday', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium mb-1">Quantity</label>
                                                                                <input 
                                                                                    type="number"
                                                                                    placeholder="0"
                                                                                    value={medicine.medicineQuantity} 
                                                                                    onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'medicineQuantity', e.target.value)}
                                                                                    className="p-1.5 border rounded w-full text-xs"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex justify-end">
                                                                            <button 
                                                                                type="button" 
                                                                                onClick={() => removeMedicineFromPlan(planIndex, medicineIndex)}
                                                                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                                                                            >
                                                                                × Remove Medicine
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <button type="button" onClick={closeModal} className="btn btn-secondary">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {editingId ? 'Update Treatment' : 'Add Treatment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

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
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">SR No</div>
                                                            <div className="text-sm font-medium">{firstTreatment.srNo || '-'}</div>
                                                        </div>
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
                                                            onClick={() => editTreatment(selectedTreatment)}
                                                            className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                                            title="Edit"
                                                        >
                                                            ✏️ Edit Plan
                                                        </button>
                                                        <button
                                                            onClick={() => deleteTreatment(selectedTreatment.id)}
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
                                                                                    {(tp.comp1 || tp.comp2 || tp.comp3) && (
                                                                                        <div className="col-span-2 md:col-span-3">
                                                                                            <span className="text-muted">Compositions: </span>
                                                                                            <span className="font-medium">
                                                                                                {[tp.comp1, tp.comp2, tp.comp3].filter(Boolean).join(', ')}
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
