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
import organ from '../../data/organ.json'
import speciality from '../../data/speciality.json'
import diseaseAction from '../../data/diseaseAction.json'

function NewTreatmentPage() {
    const router = useRouter()
    const [products, setProducts] = useState<any[]>([])
    const [saving, setSaving] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [allTreatments, setAllTreatments] = useState<any[]>([])
    const [uniqueDiagnoses, setUniqueDiagnoses] = useState<string[]>([])
    const [prefillMode, setPrefillMode] = useState(false)
    const [planNumber, setPlanNumber] = useState('01')
    const [selectedProductId, setSelectedProductId] = useState('')
    const [selectedMedicines, setSelectedMedicines] = useState<string[]>([])
    const [medicines, setMedicines] = useState<any[]>([])
    const [isBasicInfoDropdownOpen, setIsBasicInfoDropdownOpen] = useState(false)
    const [isOrganOpen, setIsOrganOpen] = useState(false)
    const [isSpecialityOpen, setIsSpecialityOpen] = useState(false)
    const [isDiseaseActionOpen, setIsDiseaseActionOpen] = useState(false)
    const [isAdministrationOpen, setIsAdministrationOpen] = useState(false)
    const [isMedicineSelectOpen, setIsMedicineSelectOpen] = useState(false)
    const [isMedicineDropdownOpen, setIsMedicineDropdownOpen] = useState<{[key: number]: {[field: string]: boolean}}>({})
    
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
        
        // Fetch all treatments to get unique diagnoses and calculate next plan number
        fetch('/api/treatments').then(r => r.json()).then(treatments => {
            setAllTreatments(Array.isArray(treatments) ? treatments : [])
            
            // Get unique diagnoses
            const diagnoses = Array.from(new Set(
                treatments
                    .filter((t: any) => t.provDiagnosis && !t.deleted)
                    .map((t: any) => t.provDiagnosis)
            )) as string[]
            setUniqueDiagnoses(diagnoses.sort())
            
            // Calculate highest plan number
            const planNumbers = treatments
                .filter((t: any) => t.planNumber && !t.deleted)
                .map((t: any) => parseInt(t.planNumber) || 0)
            const maxPlanNumber = planNumbers.length > 0 ? Math.max(...planNumbers) : 0
            const nextPlanNumber = String(maxPlanNumber + 1).padStart(2, '0')
            setPlanNumber(nextPlanNumber)
        })
    }, [])
    
    // Check for prefill parameters from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const diagnosis = params.get('diagnosis')
        const speciality = params.get('speciality')
        const organ = params.get('organ')
        const diseaseAction = params.get('diseaseAction')
        
        if (diagnosis) {
            setPrefillMode(true)
            setForm({
                provDiagnosis: diagnosis.toUpperCase(),
                speciality: speciality?.toUpperCase() || '',
                organ: organ?.toUpperCase() || '',
                diseaseAction: diseaseAction?.toUpperCase() || '',
                treatmentPlan: diagnosis.toUpperCase(),
                administration: '',
                notes: ''
            })
        }
    }, [])

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
        
        // If no match found, just update diagnosis and treatment plan
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
            spy1: '', spy2: '', spy3: '', spy4: '', spy5: '', spy6: '',
            quantity: 0,
            timing: '',
            dosage: '',
            addition1: '', addition2: '', addition3: '',
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
            spy1: '', spy2: '', spy3: '', spy4: '', spy5: '', spy6: '',
            quantity: 1,
            timing: '',
            dosage: '',
            addition1: '', addition2: '', addition3: '',
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
        if (['spy1', 'spy2', 'spy3', 'spy4', 'spy5', 'spy6', 'dosage', 'addition1', 'addition2', 'addition3', 'procedure', 'presentation'].includes(field)) {
            value = typeof value === 'string' ? value.toUpperCase() : value
        }
        updated[index] = { ...updated[index], [field]: value }
        setMedicines(updated)
    }

    async function create(e: any) {
        e.preventDefault()
        
        setSaving(true)
        
        try {
            const treatmentData = {
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
                    spy1: p.spy1?.toUpperCase() || '',
                    spy2: p.spy2?.toUpperCase() || '',
                    spy3: p.spy3?.toUpperCase() || '',
                    spy4: p.spy4?.toUpperCase() || '',
                    spy5: p.spy5?.toUpperCase() || '',
                    spy6: p.spy6?.toUpperCase() || '',
                    quantity: p.quantity,
                    timing: p.timing,
                    dosage: p.dosage?.toUpperCase() || '',
                    addition1: p.addition1?.toUpperCase() || '',
                    addition2: p.addition2?.toUpperCase() || '',
                    addition3: p.addition3?.toUpperCase() || '',
                    procedure: p.procedure?.toUpperCase() || '',
                    presentation: p.presentation?.toUpperCase() || '',
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
                setSaving(false)
                return
            }
            
            const savedTreatment = await res.json()
            
            // Store the new ID for showing NEW label
            if (savedTreatment.id) {
                localStorage.setItem('newTreatmentId', savedTreatment.id.toString())
            }
            
            // Show success modal after save
            setSaving(false)
            setShowSuccessModal(true)
        } catch (error) {
            console.error('Save error:', error)
            alert('Failed to save treatment')
            setSaving(false)
        }
    }

    function handleAddAnotherPlan() {
        setShowSuccessModal(false)
        localStorage.removeItem('newTreatmentId') // Clear the new ID when adding another
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
        const newId = localStorage.getItem('newTreatmentId')
        if (newId) {
            router.push(`/treatments?newId=${newId}`)
            localStorage.removeItem('newTreatmentId')
        } else {
            router.push('/treatments')
        }
    }

    return (
        <div>
            {/* Saving Loading Modal */}
            <LoadingModal isOpen={saving} message="Saving treatment plan..." />
            
            {/* Success Modal */}
            <ConfirmationModal
                isOpen={showSuccessModal}
                title="Treatment Plan Added Successfully!"
                message="Would you like to add another plan for this diagnosis?"
                confirmText="Add Another Plan"
                cancelText="No Thanks"
                onConfirm={handleAddAnotherPlan}
                onCancel={handleNoThanks}
                type="info"
            />

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
                <div className={`rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-6 backdrop-blur-sm ${isBasicInfoDropdownOpen ? 'relative z-[10000]' : 'relative z-0'}`}>
                    <h3 className="text-lg font-semibold mb-4 text-emerald-900 dark:text-emerald-100">Basic Information</h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Provisional Diagnosis</label>
                            {prefillMode ? (
                                <input 
                                    placeholder="Enter diagnosis" 
                                    value={form.provDiagnosis} 
                                    readOnly
                                    className="p-2 border rounded w-full bg-gray-100 dark:bg-gray-800 cursor-not-allowed" 
                                />
                            ) : (
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
                                    onOpenChange={setIsBasicInfoDropdownOpen}
                                />
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                        <div className={isSpecialityOpen ? 'relative z-[10000]' : 'relative z-0'}>
                            <label className="block text-sm font-medium mb-1.5">Speciality</label>
                            <CustomSelect
                                value={form.speciality}
                                onChange={(val) => setForm({ ...form, speciality: val.toUpperCase() })}
                                options={[
                                    { value: '', label: 'Select speciality' },
                                    ...speciality.map(s => ({ value: s, label: s }))
                                ]}
                                placeholder="Select speciality"
                                allowCustom={true}
                                className="w-full"
                                disabled={prefillMode}
                                onOpenChange={setIsSpecialityOpen}
                            />
                        </div>
                        <div className={isOrganOpen ? 'relative z-[10000]' : 'relative z-0'}>
                            <label className="block text-sm font-medium mb-1.5">Site</label>
                            <CustomSelect
                                value={form.organ}
                                onChange={(val) => setForm({ ...form, organ: val })}
                                options={[
                                    { value: '', label: 'Select site' },
                                    ...organ.map(o => ({ value: o, label: o }))
                                ]}
                                placeholder="Select site"
                                allowCustom={true}
                                className="w-full"
                                disabled={prefillMode}
                                onOpenChange={setIsBasicInfoDropdownOpen}
                            />
                        </div>
                        <div className={isDiseaseActionOpen ? 'relative z-[10000]' : 'relative z-0'}>
                            <label className="block text-sm font-medium mb-1.5">Disease Action</label>
                            <CustomSelect
                                value={form.diseaseAction}
                                onChange={(val) => setForm({ ...form, diseaseAction: val.toUpperCase() })}
                                options={[
                                    { value: '', label: 'Select disease action' },
                                    ...diseaseAction.map(d => ({ value: d, label: d }))
                                ]}
                                placeholder="Select disease action"
                                allowCustom={true}
                                className="w-full"
                                disabled={prefillMode}
                                onOpenChange={setIsDiseaseActionOpen}
                            />
                        </div>
                    </div>
                </div>
                
                {/* Treatment Plan Section (Single Plan) */}
                <div className="rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-6 backdrop-blur-sm">
                    <div className="border-2 border-emerald-300/50 dark:border-emerald-700/50 rounded-lg p-4 bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-emerald-100/50 dark:from-emerald-950/30 dark:via-emerald-900/20 dark:to-emerald-950/30">
                        {/* Plan Header */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-emerald-300/50 dark:border-emerald-700/50">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Plan Number:</span>
                                <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-md text-sm font-bold shadow-md">
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
                                    readOnly={prefillMode}
                                />
                            </div>
                            <div className={isAdministrationOpen ? 'relative z-[10000]' : 'relative z-0'}>
                                <label className="block text-sm font-medium mb-1.5">Administration</label>
                                <CustomSelect
                                    value={form.administration}
                                    onChange={(val) => setForm({ ...form, administration: val.toUpperCase() })}
                                    options={administration}
                                    placeholder="Select administration"
                                    allowCustom={true}
                                    className="w-full"
                                    onOpenChange={setIsAdministrationOpen}
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
                        <div className="border-t-2 border-emerald-300/50 dark:border-emerald-700/50 pt-4 mt-3">
                            <h5 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-3">Select Medicines from Inventory</h5>
                            
                            {/* Medicine Dropdown */}
                            <div className={`mb-3 ${isMedicineSelectOpen ? 'relative z-[10000]' : 'relative z-0'}`}>
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
                                    onOpenChange={setIsMedicineSelectOpen}
                                />
                            </div>

                            {/* Selected Medicines List */}
                            <div className="bg-gradient-to-br from-emerald-50/80 via-green-50/60 to-emerald-100/80 dark:from-emerald-950/40 dark:via-emerald-900/30 dark:to-emerald-950/40 border border-emerald-300/50 dark:border-emerald-700/50 rounded-lg p-3 mb-3 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
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
                                    {medicines.map((medicine: any, medicineIndex: number) => {
                                        const product = products.find(p => String(p.id) === String(medicine.productId))
                                        return (
                                        <div key={medicineIndex} className="border border-emerald-200/50 dark:border-emerald-700/50 rounded-lg p-3 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/30 dark:from-gray-800 dark:via-emerald-950/30 dark:to-gray-800 shadow-md shadow-emerald-500/10 backdrop-blur-sm">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                                                <div>
                                                    <label className="block text-xs font-medium mb-1">Medicine</label>
                                                    {medicine.productId && product ? (
                                                        <div className="p-2 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 flex-wrap">
                                                            <span className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-md text-xs font-bold">{medicineIndex + 1}</span>
                                                            <span>{product.name}</span>
                                                            {product.category && (() => {
                                                                const categoryName = typeof product.category === 'string' ? product.category : product.category.name
                                                                if (product.unit) {
                                                                    const unitParts = String(product.unit).trim().split(/\s+/)
                                                                    const unitType = unitParts.length >= 2 ? unitParts[1] : ''
                                                                    return (
                                                                        <span className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-xs font-semibold">
                                                                            {categoryName} {unitType ? `(${unitType})` : ''}
                                                                        </span>
                                                                    )
                                                                }
                                                                return (
                                                                    <span className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-xs font-semibold">
                                                                        {categoryName}
                                                                    </span>
                                                                )
                                                            })()}
                                                            <span className="text-gray-500">· Stock: {product.quantity}</span>
                                                        </div>
                                                    ) : (
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
                                                    )}
                                                </div>
                                                
                                                {/* SPY Components - 3x3 Grid */}
                                                <div className="sm:col-span-2 lg:col-span-3">
                                                    <label className="block text-xs font-medium mb-2 text-emerald-700 dark:text-emerald-400">Spagyric</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <CustomSelect
                                                            value={medicine.spy1 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'spy1', val.toUpperCase())}
                                                            options={components}
                                                            placeholder="SPY 1"
                                                            allowCustom={true}
                                                        />
                                                        <CustomSelect
                                                            value={medicine.spy2 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'spy2', val.toUpperCase())}
                                                            options={components}
                                                            placeholder="SPY 2"
                                                            allowCustom={true}
                                                        />
                                                        <CustomSelect
                                                            value={medicine.spy3 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'spy3', val.toUpperCase())}
                                                            options={components}
                                                            placeholder="SPY 3"
                                                            allowCustom={true}
                                                        />
                                                        <CustomSelect
                                                            value={medicine.spy4 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'spy4', val.toUpperCase())}
                                                            options={components}
                                                            placeholder="SPY 4"
                                                            allowCustom={true}
                                                        />
                                                        <CustomSelect
                                                            value={medicine.spy5 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'spy5', val.toUpperCase())}
                                                            options={components}
                                                            placeholder="SPY 5"
                                                            allowCustom={true}
                                                        />
                                                        <CustomSelect
                                                            value={medicine.spy6 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'spy6', val.toUpperCase())}
                                                            options={components}
                                                            placeholder="SPY 6"
                                                            allowCustom={true}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Addition Components */}
                                                <div className="sm:col-span-2 lg:col-span-3">
                                                    <label className="block text-xs font-medium mb-2 text-blue-700 dark:text-blue-400">Addition Components</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <CustomSelect
                                                            value={medicine.addition1 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'addition1', val.toUpperCase())}
                                                            options={additions}
                                                            placeholder="Addition 1"
                                                            allowCustom={true}
                                                        />
                                                        <CustomSelect
                                                            value={medicine.addition2 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'addition2', val.toUpperCase())}
                                                            options={additions}
                                                            placeholder="Addition 2"
                                                            allowCustom={true}
                                                        />
                                                        <CustomSelect
                                                            value={medicine.addition3 || ''}
                                                            onChange={(val) => updateMedicine(medicineIndex, 'addition3', val.toUpperCase())}
                                                            options={additions}
                                                            placeholder="Addition 3"
                                                            allowCustom={true}
                                                        />
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
                                    )})}
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
                        Add Treatment
                    </button>
                </div>
            </form>
        </div>
    )
}

export default requireDoctorOrAdmin(NewTreatmentPage)
