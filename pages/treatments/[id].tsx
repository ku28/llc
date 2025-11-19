import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import CustomSelect from '../../components/CustomSelect'
import LoadingModal from '../../components/LoadingModal'
import ConfirmationModal from '../../components/ConfirmationModal'
import { requireDoctorOrAdmin } from '../../lib/withAuth'
import components from '../../data/components.json'
import timing from '../../data/timing.json'
import dosage from '../../data/dosage.json'
import additions from '../../data/additions.json'
import procedure from '../../data/procedure.json'
import presentation from '../../data/presentation.json'
import administration from '../../data/administration.json'

function EditTreatmentPage() {
    const router = useRouter()
    const { id } = router.query
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState('')
    const [selectedMedicines, setSelectedMedicines] = useState<string[]>([])
    const [medicines, setMedicines] = useState<any[]>([])
    const [planNumber, setPlanNumber] = useState('01')
    const [allTreatments, setAllTreatments] = useState<any[]>([])
    const [uniqueDiagnoses, setUniqueDiagnoses] = useState<string[]>([])
    
    const emptyForm = {
        speciality: '',
        organ: '',
        diseaseAction: '',
        provDiagnosis: '',
        treatmentPlan: '',
        administration: '',
        notes: ''
    }
    
    const [form, setForm] = useState(emptyForm)
    const [user, setUser] = useState<any>(null)
    
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])
    useEffect(() => { 
        fetch('/api/products').then(r => r.json()).then(data => {
            setProducts(Array.isArray(data) ? data : [])
        })
        
        // Fetch all treatments to get unique diagnoses
        fetch('/api/treatments').then(r => r.json()).then(treatments => {
            setAllTreatments(Array.isArray(treatments) ? treatments : [])
            
            // Get unique diagnoses
            const diagnoses = Array.from(new Set(
                treatments
                    .filter((t: any) => t.provDiagnosis && !t.deleted)
                    .map((t: any) => t.provDiagnosis)
            )) as string[]
            setUniqueDiagnoses(diagnoses.sort())
        })
    }, [])

    // Load treatment data when id is available
    useEffect(() => {
        if (!id) return
        
        setLoading(true)
        fetch('/api/treatments')
            .then(r => r.json())
            .then(treatments => {
                const treatment = treatments.find((t: any) => t.id === parseInt(id as string))
                if (!treatment) {
                    alert('Treatment not found')
                    router.push('/treatments')
                    return
                }
                
                // Load treatment data - convert to uppercase
                setForm({
                    speciality: treatment.speciality?.toUpperCase() || '',
                    organ: treatment.organ?.toUpperCase() || '',
                    diseaseAction: treatment.diseaseAction?.toUpperCase() || '',
                    provDiagnosis: treatment.provDiagnosis?.toUpperCase() || '',
                    treatmentPlan: treatment.treatmentPlan?.toUpperCase() || '',
                    administration: treatment.administration?.toUpperCase() || '',
                    notes: treatment.notes?.toUpperCase() || ''
                })
                
                setPlanNumber(treatment.planNumber || '01')
                
                // Load existing medicines
                if (treatment.treatmentProducts && treatment.treatmentProducts.length > 0) {
                    setMedicines(treatment.treatmentProducts.map((tp: any) => ({
                        id: tp.id,
                        productId: tp.productId.toString(),
                        comp1: tp.comp1 || '',
                        comp2: tp.comp2 || '',
                        comp3: tp.comp3 || '',
                        // Treat empty strings as undefined to hide comp4/comp5
                        comp4: (tp.comp4 && tp.comp4.trim()) ? tp.comp4 : undefined,
                        comp5: (tp.comp5 && tp.comp5.trim()) ? tp.comp5 : undefined,
                        quantity: tp.quantity || 1,
                        timing: tp.timing || '',
                        dosage: tp.dosage || '',
                        additions: tp.additions || '',
                        procedure: tp.procedure || '',
                        presentation: tp.presentation || '',
                        droppersToday: tp.droppersToday?.toString() || '',
                        medicineQuantity: tp.medicineQuantity?.toString() || ''
                    })))
                }
                
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                alert('Failed to load treatment')
                router.push('/treatments')
            })
    }, [id])

    function updateProvDiagnosis(newDiagnosis: string) {
        const upperDiagnosis = newDiagnosis.toUpperCase()
        // Auto-fill other fields based on selected diagnosis
        if (upperDiagnosis && allTreatments.length > 0) {
            const matchingTreatment = allTreatments.find((t: any) => 
                t.provDiagnosis?.toUpperCase() === upperDiagnosis
            )
            if (matchingTreatment) {
                setForm({
                    provDiagnosis: upperDiagnosis,
                    speciality: matchingTreatment.speciality?.toUpperCase() || '',
                    organ: matchingTreatment.organ?.toUpperCase() || '',
                    diseaseAction: matchingTreatment.diseaseAction?.toUpperCase() || '',
                    treatmentPlan: upperDiagnosis,
                    administration: form.administration.toUpperCase(),
                    notes: form.notes.toUpperCase()
                })
                return
            }
        }
        
        setForm({ 
            ...form, 
            provDiagnosis: upperDiagnosis,
            treatmentPlan: upperDiagnosis
        })
    }

    // Medicine list functionality
    function removeFromSelectedMedicines(productId: string) {
        setSelectedMedicines(selectedMedicines.filter(id => id !== productId))
    }

    function removeAllSelectedMedicines() {
        setSelectedMedicines([])
    }

    function addAllSelectedMedicinesToTreatment() {
        const newMedicines = selectedMedicines.map(productId => ({
            productId: productId,
            comp1: '',
            comp2: '',
            comp3: '',
            quantity: 0,
            timing: '',
            dosage: '',
            additions: '',
            procedure: '',
            presentation: '',
            droppersToday: '',
            medicineQuantity: ''
        }))
        setMedicines([...medicines, ...newMedicines])
        setSelectedMedicines([])
    }

    function addMedicine(productId: string) {
        if (!productId || productId === '') return
        
        // Add medicine to the list
        setMedicines([...medicines, {
            productId: productId,
            comp1: '',
            comp2: '',
            comp3: '',
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
        }])
        
        // Clear selection
        setSelectedProductId('')
    }

    function removeMedicine(index: number) {
        setMedicines(medicines.filter((_, i) => i !== index))
    }

    function updateMedicine(index: number, field: string, value: any) {
        const updated = [...medicines]
        // Convert specific fields to uppercase
        if (['comp1', 'comp2', 'comp3', 'comp4', 'comp5', 'dosage', 'additions', 'procedure', 'presentation'].includes(field)) {
            value = typeof value === 'string' ? value.toUpperCase() : value
        }
        updated[index] = { ...updated[index], [field]: value }
        setMedicines(updated)
    }

    async function update(e: any) {
        e.preventDefault()
        
        setSaving(true)
        
        try {
            const treatmentData = {
                id: parseInt(id as string),
                speciality: form.speciality.toUpperCase(),
                organ: form.organ.toUpperCase(),
                diseaseAction: form.diseaseAction.toUpperCase(),
                provDiagnosis: form.provDiagnosis.toUpperCase(),
                planNumber: planNumber,
                treatmentPlan: (form.treatmentPlan || form.provDiagnosis).toUpperCase(),
                administration: form.administration.toUpperCase(),
                notes: form.notes.toUpperCase(),
                products: medicines.filter((p: any) => p.productId).map((p: any) => ({
                    productId: p.productId,
                    comp1: p.comp1?.toUpperCase() || '',
                    comp2: p.comp2?.toUpperCase() || '',
                    comp3: p.comp3?.toUpperCase() || '',
                    comp4: p.comp4?.toUpperCase() || '',
                    comp5: p.comp5?.toUpperCase() || '',
                    quantity: p.quantity,
                    timing: p.timing,
                    dosage: p.dosage?.toUpperCase() || '',
                    additions: p.additions?.toUpperCase() || '',
                    procedure: p.procedure?.toUpperCase() || '',
                    presentation: p.presentation?.toUpperCase() || '',
                    droppersToday: p.droppersToday ? parseInt(p.droppersToday) : null,
                    medicineQuantity: p.medicineQuantity ? parseInt(p.medicineQuantity) : null
                }))
            }
            
            const res = await fetch('/api/treatments', { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(treatmentData) 
            })
            
            if (!res.ok) {
                const err = await res.text()
                console.error('Update treatment failed:', err)
                alert('Failed to update treatment')
                setSaving(false)
                return
            }
            
            // Show success modal after update
            setSaving(false)
            setShowSuccessModal(true)
        } catch (error) {
            console.error('Update error:', error)
            alert('Failed to update treatment')
            setSaving(false)
        }
    }

    function handleAddAnotherPlan() {
        setShowSuccessModal(false)
        // Redirect to add page with basic information prefilled
        const params = new URLSearchParams({
            diagnosis: form.provDiagnosis,
            speciality: form.speciality,
            organ: form.organ,
            diseaseAction: form.diseaseAction
        })
        router.push(`/treatments/new?${params.toString()}`)
    }

    function handleNoThanks() {
        setShowSuccessModal(false)
        router.push('/treatments')
    }

    return (
        <div>
            {/* Loading Modal */}
            <LoadingModal isOpen={loading} message="Loading treatment..." />
            
            {/* Saving Loading Modal */}
            <LoadingModal isOpen={saving} message="Updating treatment plan..." />
            
            {/* Success Modal */}
            <ConfirmationModal
                isOpen={showSuccessModal}
                title="Treatment Plan Updated Successfully!"
                message="Would you like to add another plan for this diagnosis?"
                confirmText="Add Another Plan"
                cancelText="No Thanks"
                onConfirm={handleAddAnotherPlan}
                onCancel={handleNoThanks}
                type="info"
            />
            
            <div className="section-header">
                <h2 className="section-title">Edit Treatment</h2>
                <button 
                    onClick={() => router.push('/treatments')}
                    className="btn btn-secondary"
                >
                    ← Back to Treatments
                </button>
            </div>

            <form onSubmit={update} className="space-y-6">
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Provisional Diagnosis *</label>
                            <CustomSelect
                                value={form.provDiagnosis}
                                onChange={(val) => updateProvDiagnosis(val)}
                                options={[
                                    { value: '', label: 'Select diagnosis' },
                                    ...uniqueDiagnoses.map(d => ({
                                        value: d,
                                        label: d
                                    }))
                                ]}
                                placeholder="Select diagnosis"
                                allowCustom={true}
                                className="w-full"
                            />
                            <p className="text-xs text-muted mt-1">Select or enter the main diagnosis. Treatment plan names will be auto-generated.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Speciality</label>
                            <input 
                                placeholder="CARDIOLOGY" 
                                value={form.speciality} 
                                onChange={e => setForm({ ...form, speciality: e.target.value.toUpperCase() })} 
                                className="p-2 border rounded w-full uppercase" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Organ</label>
                            <input 
                                placeholder="HEART" 
                                value={form.organ} 
                                onChange={e => setForm({ ...form, organ: e.target.value.toUpperCase() })} 
                                className="p-2 border rounded w-full uppercase" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Disease Action</label>
                            <input 
                                placeholder="ANTI-INFLAMMATORY" 
                                value={form.diseaseAction} 
                                onChange={e => setForm({ ...form, diseaseAction: e.target.value.toUpperCase() })} 
                                className="p-2 border rounded w-full uppercase" 
                            />
                        </div>
                    </div>
                </div>
                
                {/* Treatment Plan Section (Single Plan - Edit Mode) */}
                <div className="card">
                    <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                        {/* Plan Header */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-300 dark:border-blue-700">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Plan Number:</span>
                                <span className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-bold">
                                    {planNumber}
                                </span>
                            </div>
                        </div>

                        {/* Plan Details Form */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="block text-sm font-medium mb-1.5">Treatment Plan Details</label>
                                <input 
                                    placeholder="TREATMENT PLAN DESCRIPTION"
                                    value={form.treatmentPlan} 
                                    onChange={e => setForm({ ...form, treatmentPlan: e.target.value.toUpperCase() })}
                                    className="p-2 border rounded-lg w-full text-sm uppercase" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Administration</label>
                                <CustomSelect
                                    value={form.administration}
                                    onChange={(val) => setForm({ ...form, administration: val.toUpperCase() })}
                                    options={administration}
                                    placeholder="Select administration"
                                    allowCustom={true}
                                    className="w-full"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium mb-1.5">Notes</label>
                                <textarea 
                                    rows={2} 
                                    placeholder="ADDITIONAL NOTES" 
                                    value={form.notes} 
                                    onChange={e => setForm({ ...form, notes: e.target.value.toUpperCase() })}
                                    className="p-2 border rounded-lg w-full text-sm uppercase" 
                                />
                            </div>
                        </div>

                        {/* Medicine Selection with List */}
                        <div className="border-t border-blue-300 dark:border-blue-700 pt-4 mt-3">
                            <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Select Medicines from Inventory</h5>
                            
                            {/* Medicine Dropdown */}
                            <div className="mb-3">
                                <CustomSelect
                                    value={selectedProductId}
                                    onChange={(value) => {
                                        setSelectedProductId(value)
                                        if (value && value !== '') {
                                            // Check if already in selected medicines
                                            if (!selectedMedicines.includes(value)) {
                                                setSelectedMedicines([...selectedMedicines, value])
                                            }
                                            setSelectedProductId('')
                                        }
                                    }}
                                    options={[
                                        { value: '', label: '-- select medicine from inventory --' },
                                        ...products.map(p => {
                                            const rl = (p as any).reorderLevel ?? 0
                                            const low = p.quantity <= rl
                                            return {
                                                value: String(p.id),
                                                label: `${p.name} · Stock: ${p.quantity}${rl ? ' · Reorder: ' + rl : ''}${low ? ' · ⚠️ LOW' : ''}`
                                            }
                                        })
                                    ]}
                                    placeholder="-- select medicine from inventory --"
                                    className="w-full"
                                />
                            </div>

                            {/* Selected Medicines List */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                        Selected Medicines ({selectedMedicines.length})
                                    </span>
                                    {selectedMedicines.length > 0 && (
                                        <div className="flex gap-2">
                                            <button 
                                                type="button" 
                                                onClick={removeAllSelectedMedicines}
                                                className="btn btn-secondary text-xs py-1 px-2"
                                            >
                                                Remove All
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={addAllSelectedMedicinesToTreatment}
                                                className="btn btn-primary text-xs py-1 px-2"
                                            >
                                                Add All to Treatment
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {selectedMedicines.length === 0 ? (
                                    <div className="text-center py-3 text-gray-500 dark:text-gray-400 text-xs">
                                        No medicines selected yet. Select medicines from the dropdown above.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedMedicines.map((productId) => {
                                            const product = products.find(p => String(p.id) === productId)
                                            if (!product) return null
                                            return (
                                                <div key={productId} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2 text-xs">
                                                    <span className="font-medium">{product.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFromSelectedMedicines(productId)}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold px-2"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            {/* Added Medicines in Treatment */}
                            {medicines.length === 0 ? (
                                <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-center">
                                    <p className="text-muted">No medicines added to treatment yet. Select medicines and click "Add All to Treatment".</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {medicines.map((medicine: any, medicineIndex: number) => (
                                        <div key={medicineIndex} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 shadow-sm">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Medicine</label>
                                                    <CustomSelect
                                                        value={medicine.productId}
                                                        onChange={(value) => updateMedicine(medicineIndex, 'productId', value)}
                                                        options={[
                                                            { value: '', label: '-- select medicine --' },
                                                            ...products.map(p => ({
                                                                value: String(p.id),
                                                                label: `${p.name} · Stock: ${p.quantity}`
                                                            }))
                                                        ]}
                                                        placeholder="-- select medicine --"
                                                        className="w-full"
                                                    />
                                                </div>
                                                
                                                {/* Spagyrics Section */}
                                                <div className="sm:col-span-2 lg:col-span-3">
                                                    <label className="block text-xs font-medium mb-1">Spagyrics</label>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <CustomSelect
                                                            value={medicine.comp1 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'comp1', val.toUpperCase())}
                                                            options={components}
                                                            placeholder="Spy1"
                                                            allowCustom={true}
                                                            className="flex-1 min-w-[100px]"
                                                        />
                                                        <CustomSelect
                                                            value={medicine.comp2 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'comp2', val.toUpperCase())}
                                                            options={components}
                                                            placeholder="Spy2"
                                                            allowCustom={true}
                                                            className="flex-1 min-w-[100px]"
                                                        />
                                                        <CustomSelect
                                                            value={medicine.comp3 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'comp3', val.toUpperCase())}
                                                            options={components}
                                                            placeholder="Spy3"
                                                            allowCustom={true}
                                                            className="flex-1 min-w-[100px]"
                                                        />
                                                        
                                                        {/* Show comp4 if it exists */}
                                                        {medicine.comp4 !== undefined && (
                                                            <div className="flex-1 min-w-[100px] flex items-center gap-1">
                                                                <CustomSelect
                                                                    value={medicine.comp4 || ''}
                                                                    onChange={(val) => updateMedicine(medicineIndex, 'comp4', val.toUpperCase())}
                                                                    options={components}
                                                                    placeholder="Spy4"
                                                                    allowCustom={true}
                                                                    className="flex-1"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = [...medicines]
                                                                        updated[medicineIndex].comp4 = undefined
                                                                        updated[medicineIndex].comp5 = undefined
                                                                        setMedicines(updated)
                                                                    }}
                                                                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                                                                    title="Remove spagyric 4"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Show comp5 if it exists */}
                                                        {medicine.comp5 !== undefined && (
                                                            <div className="flex-1 min-w-[100px] flex items-center gap-1">
                                                                <CustomSelect
                                                                    value={medicine.comp5 || ''}
                                                                    onChange={(val) => updateMedicine(medicineIndex, 'comp5', val.toUpperCase())}
                                                                    options={components}
                                                                    placeholder="Spy5"
                                                                    allowCustom={true}
                                                                    className="flex-1"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = [...medicines]
                                                                        updated[medicineIndex].comp5 = undefined
                                                                        setMedicines(updated)
                                                                    }}
                                                                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                                                                    title="Remove spagyric 5"
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
                                                                    const updated = [...medicines]
                                                                    if (medicine.comp4 === undefined) {
                                                                        updated[medicineIndex].comp4 = ''
                                                                    } else {
                                                                        updated[medicineIndex].comp5 = ''
                                                                    }
                                                                    setMedicines(updated)
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
                                            </div>

                                            {/* Additional Fields */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Qty (Drops)</label>
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        placeholder="0"
                                                        value={medicine.quantity} 
                                                        onChange={e => updateMedicine(medicineIndex, 'quantity', parseInt(e.target.value))}
                                                        className="p-1.5 border rounded w-full text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Timing</label>
                                                    <CustomSelect
                                                        value={medicine.timing}
                                                        onChange={(val) => updateMedicine(medicineIndex, 'timing', val)}
                                                        options={timing}
                                                        placeholder="Select timing"
                                                        allowCustom={true}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Dosage</label>
                                                    <CustomSelect
                                                        value={medicine.dosage}
                                                        onChange={(val) => updateMedicine(medicineIndex, 'dosage', val.toUpperCase())}
                                                        options={dosage}
                                                        placeholder="Select dosage"
                                                        allowCustom={true}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Additions</label>
                                                    <CustomSelect
                                                        value={medicine.additions}
                                                        onChange={(val) => updateMedicine(medicineIndex, 'additions', val.toUpperCase())}
                                                        options={additions}
                                                        placeholder="Select addition"
                                                        allowCustom={true}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Procedure</label>
                                                    <CustomSelect
                                                        value={medicine.procedure}
                                                        onChange={(val) => updateMedicine(medicineIndex, 'procedure', val.toUpperCase())}
                                                        options={procedure}
                                                        placeholder="Select procedure"
                                                        allowCustom={true}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Presentation</label>
                                                    <CustomSelect
                                                        value={medicine.presentation}
                                                        onChange={(val) => updateMedicine(medicineIndex, 'presentation', val.toUpperCase())}
                                                        options={presentation}
                                                        placeholder="Select presentation"
                                                        allowCustom={true}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Droppers Today</label>
                                                    <input 
                                                        type="number"
                                                        placeholder="0"
                                                        value={medicine.droppersToday} 
                                                        onChange={e => updateMedicine(medicineIndex, 'droppersToday', e.target.value)}
                                                        className="p-1.5 border rounded w-full text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Medicine Quantity</label>
                                                    <input 
                                                        type="number"
                                                        placeholder="0"
                                                        value={medicine.medicineQuantity} 
                                                        onChange={e => updateMedicine(medicineIndex, 'medicineQuantity', e.target.value)}
                                                        className="p-1.5 border rounded w-full text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end mt-2">
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeMedicine(medicineIndex)}
                                                    className="btn btn-danger text-xs"
                                                >
                                                    × Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
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
                        Update Treatment
                    </button>
                </div>
            </form>
        </div>
    )
}

export default requireDoctorOrAdmin(EditTreatmentPage)
