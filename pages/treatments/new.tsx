import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import CustomSelect from '../../components/CustomSelect'
import { requireDoctorOrAdmin } from '../../lib/withAuth'

function NewTreatmentPage() {
    const router = useRouter()
    const [products, setProducts] = useState<any[]>([])
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
        fetch('/api/products').then(r => r.json()).then(data => {
            setProducts(Array.isArray(data) ? data : [])
        })
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
            // comp4/comp5 are optional and should be undefined until explicitly added
            comp4: undefined,
            comp5: undefined,
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
                    comp4: p.comp4,
                    comp5: p.comp5,
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
            
            const res = await fetch('/api/treatments', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(treatmentData) 
            })
            
            if (!res.ok) {
                const err = await res.text()
                console.error('Save treatment failed:', err)
                alert('Failed to save treatment')
                return
            }
        }
        
        // Navigate back to treatments page after successful create
        router.push('/treatments')
    }

    return (
        <div>
            <div className="section-header">
                <h2 className="section-title">Add New Treatment</h2>
                <button 
                    onClick={() => router.push('/treatments')}
                    className="btn btn-secondary"
                >
                    ← Back to Treatments
                </button>
            </div>

            <form onSubmit={create} className="space-y-6">
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
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
                </div>
                
                {/* Treatment Plans Section */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Treatment Plans</h3>
                        <button type="button" onClick={addTreatmentPlan} className="btn btn-secondary">
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
                                                                <CustomSelect
                                                                    value={medicine.productId}
                                                                    onChange={(value) => updateMedicineInPlan(planIndex, medicineIndex, 'productId', value)}
                                                                    options={[
                                                                        { value: '', label: 'Select medicine' },
                                                                        ...products.map(p => ({
                                                                            value: String(p.id),
                                                                            label: `${p.name} · Stock: ${p.quantity}`
                                                                        }))
                                                                    ]}
                                                                    placeholder="Select medicine"
                                                                    className="w-full"
                                                                />
                                                            </div>
                                                            
                                                            {/* Components Section - All in one line */}
                                                            <div className="lg:col-span-3">
                                                                <label className="block text-xs font-medium mb-1">Components</label>
                                                                <div className="flex items-center gap-1.5">
                                                                    <input 
                                                                        placeholder="Component 1" 
                                                                        value={medicine.comp1 || ''} 
                                                                        onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'comp1', e.target.value)}
                                                                        className="flex-1 p-1.5 border rounded text-xs"
                                                                    />
                                                                    <input 
                                                                        placeholder="Component 2" 
                                                                        value={medicine.comp2 || ''} 
                                                                        onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'comp2', e.target.value)}
                                                                        className="flex-1 p-1.5 border rounded text-xs"
                                                                    />
                                                                    <input 
                                                                        placeholder="Component 3" 
                                                                        value={medicine.comp3 || ''} 
                                                                        onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'comp3', e.target.value)}
                                                                        className="flex-1 p-1.5 border rounded text-xs"
                                                                    />
                                                                    
                                                                    {/* Show comp4 if it exists */}
                                                                    {medicine.comp4 !== undefined && (
                                                                        <div className="flex-1 flex items-center gap-1">
                                                                            <input 
                                                                                placeholder="Component 4" 
                                                                                value={medicine.comp4 || ''} 
                                                                                onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'comp4', e.target.value)}
                                                                                className="flex-1 p-1.5 border rounded text-xs"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const updated = [...treatmentPlans]
                                                                                    updated[planIndex].medicines[medicineIndex].comp4 = undefined
                                                                                    updated[planIndex].medicines[medicineIndex].comp5 = undefined
                                                                                    setTreatmentPlans(updated)
                                                                                }}
                                                                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                                                                                title="Remove component 4"
                                                                            >
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Show comp5 if it exists */}
                                                                    {medicine.comp5 !== undefined && (
                                                                        <div className="flex-1 flex items-center gap-1">
                                                                            <input 
                                                                                placeholder="Component 5" 
                                                                                value={medicine.comp5 || ''} 
                                                                                onChange={e => updateMedicineInPlan(planIndex, medicineIndex, 'comp5', e.target.value)}
                                                                                className="flex-1 p-1.5 border rounded text-xs"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const updated = [...treatmentPlans]
                                                                                    updated[planIndex].medicines[medicineIndex].comp5 = undefined
                                                                                    setTreatmentPlans(updated)
                                                                                }}
                                                                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                                                                                title="Remove component 5"
                                                                            >
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Plus button */}
                                                                    {medicine.comp5 === undefined && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const updated = [...treatmentPlans]
                                                                                if (medicine.comp4 === undefined) {
                                                                                    updated[planIndex].medicines[medicineIndex].comp4 = ''
                                                                                } else {
                                                                                    updated[planIndex].medicines[medicineIndex].comp5 = ''
                                                                                }
                                                                                setTreatmentPlans(updated)
                                                                            }}
                                                                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600"
                                                                            title="Add component"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
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
                
                <div className="flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={() => router.push('/treatments')} 
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                        Add Treatment
                    </button>
                </div>
            </form>
        </div>
    )
}

export default requireDoctorOrAdmin(NewTreatmentPage)
