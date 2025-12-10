import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import CustomSelect from '../../components/CustomSelect'
import LoadingModal from '../../components/LoadingModal'
import ConfirmationModal from '../../components/ConfirmationModal'
import { requireDoctorOrAdmin } from '../../lib/withAuth'
import components from '../../data/components.json'
import timing from '../../data/timing.json'
import dosage from '../../data/dosage.json'
import doseQuantity from '../../data/doseQuantity.json'
import doseTiming from '../../data/doseTiming.json'
import dilution from '../../data/dilution.json'
import additions from '../../data/additions.json'
import procedure from '../../data/procedure.json'
import presentation from '../../data/presentation.json'
import administration from '../../data/administration.json'
import bottlePricing from '../../data/bottlePricing.json'
import organ from '../../data/organ.json'
import speciality from '../../data/speciality.json'
import diseaseAction from '../../data/diseaseAction.json'
import imbalance from '../../data/imbalance.json'
import systems from '../../data/systems.json'

function NewTreatmentPage() {
    const router = useRouter()
    const [products, setProducts] = useState<any[]>([])
    const [saving, setSaving] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [allTreatments, setAllTreatments] = useState<any[]>([])
    const [uniqueDiagnoses, setUniqueDiagnoses] = useState<string[]>([])
    const [prefillMode, setPrefillMode] = useState(false)
    const [planNumber, setPlanNumber] = useState('1')
    const [isPlanNumberLocked, setIsPlanNumberLocked] = useState(true)
    const [selectedProductId, setSelectedProductId] = useState('')
    const [selectedMedicines, setSelectedMedicines] = useState<string[]>([])
    const [medicines, setMedicines] = useState<any[]>([])
    const [selectedMedicineIndices, setSelectedMedicineIndices] = useState<Set<number>>(new Set())
    const [showRepeatInput, setShowRepeatInput] = useState(false)
    const [repeatCount, setRepeatCount] = useState<string>('')
    const [showRepeatInputForRow, setShowRepeatInputForRow] = useState<{[key: number]: boolean}>({})
    const [repeatCountForRow, setRepeatCountForRow] = useState<{[key: number]: string}>({})
    const [isBasicInfoDropdownOpen, setIsBasicInfoDropdownOpen] = useState(false)
    const [isOrganOpen, setIsOrganOpen] = useState(false)
    const [isSpecialityOpen, setIsSpecialityOpen] = useState(false)
    const [isImbalanceOpen, setIsImbalanceOpen] = useState(false)
    const [isSystemsOpen, setIsSystemsOpen] = useState(false)
    const [isDiseaseActionOpen, setIsDiseaseActionOpen] = useState(false)
    const [isAdministrationOpen, setIsAdministrationOpen] = useState(false)
    const [isMedicineSelectOpen, setIsMedicineSelectOpen] = useState(false)
    const [collapsedSections, setCollapsedSections] = useState<{ [key: number]: { spy46: boolean, additions: boolean } }>({})

    // Helper functions for parsing component and dosage formats
    function parseComponent(compValue: string): { name: string; volume: string } {
        if (!compValue) return { name: '', volume: '' }
        const parts = compValue.split('|')
        return { name: parts[0] || '', volume: parts[1] || '' }
    }

    function formatComponent(name: string, volume: string): string {
        if (!name && !volume) return ''
        return `${name}|${volume}`
    }

    function parseDosage(dosageValue: string): { quantity: string; timing: string; dilution: string } {
        if (!dosageValue) return { quantity: '', timing: '', dilution: '' }
        const parts = dosageValue.split('|')
        return { quantity: parts[0] || '', timing: parts[1] || '', dilution: parts[2] || '' }
    }

    function formatDosage(quantity: string, timing: string, dilution: string): string {
        if (!quantity && !timing && !dilution) return ''
        return `${quantity}|${timing}|${dilution}`
    }

    const emptyForm = {
        speciality: '',
        imbalance: '',
        systems: '',
        organ: '',
        diseaseAction: '',
        provDiagnosis: '',
        treatmentPlan: '',
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

            // Plan number will be calculated when diagnosis is selected
            setPlanNumber('01')
        })
    }, [])

    // Check for prefill parameters from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const diagnosis = params.get('diagnosis')
        const speciality = params.get('speciality')
        const imbalance = params.get('imbalance')
        const systems = params.get('systems')
        const organ = params.get('organ')
        const diseaseAction = params.get('diseaseAction')

        if (diagnosis) {
            setPrefillMode(true)
            setForm({
                provDiagnosis: diagnosis.toUpperCase(),
                speciality: speciality?.toUpperCase() || '',
                imbalance: imbalance || '',
                systems: systems || '',
                organ: organ?.toUpperCase() || '',
                diseaseAction: diseaseAction?.toUpperCase() || '',
                treatmentPlan: diagnosis.toUpperCase(),
                notes: ''
            })
        }
    }, [])

    function updateProvDiagnosis(newDiagnosis: string) {
        const upperDiagnosis = newDiagnosis.toUpperCase()
        
        // Calculate next plan number for this diagnosis
        if (upperDiagnosis && allTreatments.length > 0) {
            const diagnosisTreatments = allTreatments.filter((t: any) => 
                t.provDiagnosis?.toUpperCase() === upperDiagnosis && !t.deleted
            )
            const planNumbers = diagnosisTreatments.map((t: any) => parseInt(t.planNumber) || 0)
            const maxPlanNumber = planNumbers.length > 0 ? Math.max(...planNumbers) : 0
            const nextPlanNumber = String(maxPlanNumber + 1)
            setPlanNumber(nextPlanNumber)
        } else {
            setPlanNumber('1')
        }
        
        // Auto-fill other fields based on selected diagnosis
        if (upperDiagnosis && allTreatments.length > 0) {
            const matchingTreatment = allTreatments.find((t: any) =>
                t.provDiagnosis?.toUpperCase() === upperDiagnosis
            )
            if (matchingTreatment) {
                setForm({
                    provDiagnosis: upperDiagnosis,
                    speciality: matchingTreatment.speciality?.toUpperCase() || '',
                    imbalance: matchingTreatment.imbalance || '',
                    systems: matchingTreatment.systems || '',
                    organ: matchingTreatment.organ?.toUpperCase() || '',
                    diseaseAction: matchingTreatment.diseaseAction?.toUpperCase() || '',
                    treatmentPlan: upperDiagnosis,
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
            quantity: 10,
            bottleSize: '15ml',
            timing: '',
            dosage: '10|TDS|WTR',
            addition1: '', addition2: '', addition3: '',
            procedure: '',
            presentation: '',
            administration: ''
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
            quantity: 10,
            bottleSize: '15ml',
            timing: '',
            dosage: '10|TDS|WTR',
            addition1: '', addition2: '', addition3: '',
            procedure: '',
            presentation: '',
            administration: ''
        }])

        // Clear selection
        setSelectedProductId('')
    }

    function removeMedicine(index: number) {
        setMedicines(medicines.filter((_, i) => i !== index))
        // Update selected indices after removal
        const newSelected = new Set<number>()
        selectedMedicineIndices.forEach(i => {
            if (i < index) newSelected.add(i)
            else if (i > index) newSelected.add(i - 1)
        })
        setSelectedMedicineIndices(newSelected)
    }
    
    // Toggle medicine selection
    function toggleMedicineSelection(index: number) {
        const newSelected = new Set(selectedMedicineIndices)
        if (newSelected.has(index)) {
            newSelected.delete(index)
        } else {
            newSelected.add(index)
        }
        setSelectedMedicineIndices(newSelected)
    }
    
    // Toggle select all medicines
    function toggleSelectAll() {
        if (selectedMedicineIndices.size === medicines.length) {
            setSelectedMedicineIndices(new Set())
        } else {
            setSelectedMedicineIndices(new Set(medicines.map((_, i) => i)))
        }
    }
    
    // Remove selected medicines
    function removeSelectedMedicines() {
        if (selectedMedicineIndices.size === 0) return
        const newMedicines = medicines.filter((_, i) => !selectedMedicineIndices.has(i))
        setMedicines(newMedicines)
        setSelectedMedicineIndices(new Set())
    }
    
    // Repeat selected medicines
    function repeatSelectedMedicines() {
        if (selectedMedicineIndices.size === 0) return
        const count = parseInt(repeatCount)
        if (!count || count < 1) return
        
        const selectedIndices = Array.from(selectedMedicineIndices).sort((a, b) => a - b)
        const itemsToRepeat = selectedIndices.map(i => ({ ...medicines[i] }))
        
        const newMedicines = [...medicines]
        for (let i = 0; i < count; i++) {
            newMedicines.push(...itemsToRepeat.map(item => ({ ...item })))
        }
        
        setMedicines(newMedicines)
        setSelectedMedicineIndices(new Set())
        setShowRepeatInput(false)
        setRepeatCount('')
    }
    
    // Repeat single row
    function repeatSingleRow(index: number) {
        const count = parseInt(repeatCountForRow[index] || '')
        if (!count || count < 1) return
        
        const itemToRepeat = { ...medicines[index] }
        const newMedicines = [...medicines]
        
        for (let i = 0; i < count; i++) {
            newMedicines.push({ ...itemToRepeat })
        }
        
        setMedicines(newMedicines)
        setShowRepeatInputForRow(prev => ({ ...prev, [index]: false }))
        setRepeatCountForRow(prev => ({ ...prev, [index]: '' }))
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
                imbalance: form.imbalance,
                systems: form.systems,
                organ: form.organ.toUpperCase(),
                diseaseAction: form.diseaseAction.toUpperCase(),
                provDiagnosis: form.provDiagnosis.toUpperCase(),
                planNumber: planNumber,
                treatmentPlan: (form.treatmentPlan || form.provDiagnosis).toUpperCase(),
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
            imbalance: form.imbalance,
            systems: form.systems,
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
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-3">
                        <div className={isSpecialityOpen ? 'relative z-[10000]' : 'relative z-0'}>
                            <label className="block text-sm font-medium mb-1.5">Speciality</label>
                            <CustomSelect
                                value={form.speciality}
                                onChange={(val) => setForm({ ...form, speciality: val.toUpperCase() })}
                                options={[
                                    { value: '', label: 'Select speciality' },
                                    ...speciality.sort((a, b) => a.localeCompare(b)).map(s => ({ value: s, label: s }))
                                ]}
                                placeholder="Select speciality"
                                allowCustom={true}
                                className="w-full"
                                disabled={prefillMode}
                                onOpenChange={setIsSpecialityOpen}
                            />
                        </div>
                        <div className={isImbalanceOpen ? 'relative z-[10000]' : 'relative z-0'}>
                            <label className="block text-sm font-medium mb-1.5">Imbalance</label>
                            <CustomSelect
                                value={form.imbalance}
                                onChange={(val) => setForm({ ...form, imbalance: val })}
                                options={[
                                    { value: '', label: 'Select imbalance' },
                                    ...imbalance.map(i => ({ value: i.value, label: i.label }))
                                ]}
                                placeholder="Select imbalance"
                                allowCustom={true}
                                className="w-full"
                                disabled={prefillMode}
                                onOpenChange={setIsImbalanceOpen}
                            />
                        </div>
                        <div className={isSystemsOpen ? 'relative z-[10000]' : 'relative z-0'}>
                            <label className="block text-sm font-medium mb-1.5">Systems</label>
                            <CustomSelect
                                value={form.systems}
                                onChange={(val) => setForm({ ...form, systems: val })}
                                options={[
                                    { value: '', label: 'Select system' },
                                    ...systems.map(s => ({ value: s.value, label: s.label }))
                                ]}
                                placeholder="Select system"
                                allowCustom={true}
                                className="w-full"
                                disabled={prefillMode}
                                onOpenChange={setIsSystemsOpen}
                            />
                        </div>
                        <div className={isOrganOpen ? 'relative z-[10000]' : 'relative z-0'}>
                            <label className="block text-sm font-medium mb-1.5">Organ</label>
                            <CustomSelect
                                value={form.organ}
                                onChange={(val) => setForm({ ...form, organ: val })}
                                options={[
                                    { value: '', label: 'Select organ' },
                                    ...organ.sort((a, b) => a.localeCompare(b)).map(o => ({ value: o, label: o }))
                                ]}
                                placeholder="Select organ"
                                allowCustom={true}
                                className="w-full"
                                disabled={prefillMode}
                                onOpenChange={setIsOrganOpen}
                            />
                        </div>
                        <div className={isDiseaseActionOpen ? 'relative z-[10000]' : 'relative z-0'}>
                            <label className="block text-sm font-medium mb-1.5">Disease Action</label>
                            <CustomSelect
                                value={form.diseaseAction}
                                onChange={(val) => setForm({ ...form, diseaseAction: val.toUpperCase() })}
                                options={[
                                    { value: '', label: 'Select disease action' },
                                    ...diseaseAction.sort((a, b) => a.localeCompare(b)).map(d => ({ value: d, label: d }))
                                ]}
                                placeholder="Select disease action"
                                allowCustom={true}
                                className="w-full"
                                disabled={prefillMode}
                                onOpenChange={setIsDiseaseActionOpen}
                            />
                        </div>
                    </div>
                    <div className="mt-3">
                        <label className="block text-sm font-medium mb-1.5">Additional Notes</label>
                        <textarea
                            rows={2}
                            placeholder="ADDITIONAL NOTES"
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value.toUpperCase() })}
                            className="p-2 border rounded-lg w-full text-sm uppercase"
                        />
                    </div>
                </div>

                {/* Treatment Plan Section (Single Plan) */}
                <div className="rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-6 backdrop-blur-sm">
                    <div className="border-2 border-emerald-300/50 dark:border-emerald-700/50 rounded-lg p-4 bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-emerald-100/50 dark:from-emerald-950/30 dark:via-emerald-900/20 dark:to-emerald-950/30">
                        {/* Plan Header */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-emerald-300/50 dark:border-emerald-700/50">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Plan Number:</span>
                                {isPlanNumberLocked ? (
                                    <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-md text-sm font-bold shadow-md">
                                        {planNumber}
                                    </span>
                                ) : (
                                    <input
                                        type="text"
                                        value={planNumber}
                                        onChange={(e) => setPlanNumber(e.target.value)}
                                        className="px-3 py-1.5 border-2 border-emerald-500 rounded-md text-sm font-bold w-20 text-center"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsPlanNumberLocked(!isPlanNumberLocked)}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                                    title={isPlanNumberLocked ? "Unlock to edit" : "Lock plan number"}
                                >
                                    {isPlanNumberLocked ? (
                                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Plan Details Form */}
                        <div className="grid grid-cols-1 gap-3 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Treatment Plan Details</label>
                                <input
                                    placeholder="TREATMENT PLAN DESCRIPTION"
                                    value={form.treatmentPlan}
                                    onChange={e => setForm({ ...form, treatmentPlan: e.target.value.toUpperCase() })}
                                    className="p-2 border rounded-lg w-full text-sm uppercase"
                                    readOnly={prefillMode}
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
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {medicines.length > 0 && (
                                        <label className="relative group/checkbox cursor-pointer flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={selectedMedicineIndices.size === medicines.length && medicines.length > 0}
                                                onChange={toggleSelectAll}
                                                className="peer sr-only"
                                            />
                                            <div className="w-5 h-5 border-2 border-emerald-400 dark:border-emerald-600 rounded-md bg-white dark:bg-gray-700 peer-checked:bg-gradient-to-br peer-checked:from-emerald-500 peer-checked:to-green-600 peer-checked:border-emerald-500 transition-all duration-200 flex items-center justify-center shadow-sm peer-checked:shadow-lg peer-checked:shadow-emerald-500/50 group-hover/checkbox:border-emerald-500 group-hover/checkbox:scale-110">
                                                <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </label>
                                    )}
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Medicines in Treatment {selectedMedicineIndices.size > 0 && <span className="px-2 py-0.5 ml-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">({selectedMedicineIndices.size} selected)</span>}
                                    </span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {selectedMedicineIndices.size > 0 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={removeSelectedMedicines}
                                                className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg transition-colors shadow-sm hover:shadow-md"
                                                title={`Remove ${selectedMedicineIndices.size} selected`}
                                            >
                                                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Remove ({selectedMedicineIndices.size})
                                            </button>
                                            {!showRepeatInput ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRepeatInput(true)}
                                                    className="px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-700 rounded-lg transition-colors shadow-sm hover:shadow-md"
                                                >
                                                    <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Repeat
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={repeatCount}
                                                        onChange={(e) => setRepeatCount(e.target.value)}
                                                        placeholder="Times"
                                                        className="w-16 px-2 py-1 text-xs border border-purple-300 dark:border-purple-700 rounded bg-white dark:bg-gray-800"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={repeatSelectedMedicines}
                                                        className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                                    >
                                                        OK
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowRepeatInput(false); setRepeatCount('') }}
                                                        className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            {medicines.length === 0 ? (
                                <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-center">
                                    <p className="text-muted">No medicines added to treatment yet. Select medicines and click "Add All to Treatment".</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {medicines.map((medicine: any, medicineIndex: number) => {
                                        const product = products.find(p => String(p.id) === String(medicine.productId))
                                        return (
                                            <div key={medicineIndex} className="relative group transition-all duration-300 border border-emerald-200/40 dark:border-emerald-700/40 bg-gradient-to-br from-white via-emerald-50/20 to-transparent dark:from-gray-900/80 dark:via-emerald-950/10 dark:to-gray-900/80 rounded-2xl hover:border-emerald-400/60 dark:hover:border-emerald-600/60 hover:shadow-xl hover:shadow-emerald-500/10">
                                                {/* Selection Checkbox */}
                                                <div className="absolute top-4 left-4 z-10">
                                                    <label className="relative group/checkbox cursor-pointer flex-shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedMedicineIndices.has(medicineIndex)}
                                                            onChange={() => toggleMedicineSelection(medicineIndex)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="peer sr-only"
                                                        />
                                                        <div className="w-5 h-5 border-2 border-emerald-400 dark:border-emerald-600 rounded-md bg-white dark:bg-gray-700 peer-checked:bg-gradient-to-br peer-checked:from-emerald-500 peer-checked:to-green-600 peer-checked:border-emerald-500 transition-all duration-200 flex items-center justify-center shadow-sm peer-checked:shadow-lg peer-checked:shadow-emerald-500/50 group-hover/checkbox:border-emerald-500 group-hover/checkbox:scale-110">
                                                            <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    </label>
                                                </div>
                                                {/* Futuristic glow effect on hover */}
                                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/0 via-green-400/0 to-emerald-500/0 group-hover:from-emerald-400/5 group-hover:via-green-400/5 group-hover:to-emerald-500/5 transition-all duration-500 pointer-events-none"></div>
                                                <div className="relative pl-12 p-4">
                                                    {/* Row 1: Medicine Name (Left) + SPY Grid (Right) */}
                                                    <div className="flex flex-col lg:flex-row gap-4 mb-3">
                                                        {/* LEFT: Medicine Info */}
                                                        <div className="w-full lg:w-64 lg:flex-shrink-0">
                                                            <label className="block text-xs font-semibold mb-2 text-gray-600 dark:text-gray-400">Medicine</label>
                                                            <label className="block text-xs font-semibold mb-2 text-gray-600 dark:text-gray-400">Medicine</label>
                                                            {medicine.productId && product ? (
                                                                <div className="relative p-3 text-xs text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700">
                                                                    {/* Edit Icon */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateMedicine(medicineIndex, 'productId', '')}
                                                                        className="absolute top-2 right-2 p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors"
                                                                        title="Edit medicine"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                    </button>
                                                                    {(() => {
                                                                        return (
                                                                            <div className="space-y-2.5">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-md text-[10px] font-bold">{medicineIndex + 1}</span>
                                                                                    <span className="font-semibold leading-tight">{product.name}</span>
                                                                                </div>
                                                                                {product.category && (
                                                                                    <div className="space-y-1.5">
                                                                                        <div className="flex items-center gap-1 text-[10px]">
                                                                                            {(() => {
                                                                                                const categoryName = typeof product.category === 'string' ? product.category : product.category.name
                                                                                                if (product.unit) {
                                                                                                    const unitParts = String(product.unit).trim().split(/\s+/)
                                                                                                    const unitType = unitParts.length >= 2 ? unitParts[1] : ''
                                                                                                    return (
                                                                                                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full">
                                                                                                            {categoryName} {unitType ? `(${unitType})` : ''}
                                                                                                        </span>
                                                                                                    )
                                                                                                }
                                                                                                return (
                                                                                                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full">
                                                                                                        {categoryName}
                                                                                                    </span>
                                                                                                )
                                                                                            })()}
                                                                                        </div>
                                                                                        {product && (
                                                                                            <div className="space-y-1">
                                                                                                <div className="text-[10px] text-gray-500">Stock: {product.quantity}</div>
                                                                                                <div className="mt-2">
                                                                                                    <CustomSelect
                                                                                                        value={medicine.bottleSize || ''}
                                                                                                        onChange={(val) => updateMedicine(medicineIndex, 'bottleSize', val)}
                                                                                                        options={bottlePricing.map(bp => ({
                                                                                                            value: bp.value,
                                                                                                            label: bp.label
                                                                                                        }))}
                                                                                                        placeholder="Bottle Size"
                                                                                                        className="text-xs h-8"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })()}
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
                                                                    className="text-xs h-9"
                                                                />
                                                            )}
                                                        </div>

                                                        {/* RIGHT: SPY Grid + Additions */}
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-semibold mb-2 text-gray-600 dark:text-gray-400">Spagyric Components</label>
                                                            {/* Row 1: SPY 1-3 with Component + Volume */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                                                                {/* SPY 1 */}
                                                                <div className="flex gap-1">
                                                                    <CustomSelect
                                                                        value={parseComponent(medicine.spy1 || '').name}
                                                                        onChange={(val) => {
                                                                            const parsed = parseComponent(medicine.spy1 || '')
                                                                            updateMedicine(medicineIndex, 'spy1', formatComponent(val.toUpperCase(), parsed.volume))
                                                                        }}
                                                                        options={components}
                                                                        placeholder="SPY 1"
                                                                        allowCustom={true}
                                                                        className="flex-1 text-xs h-8"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Vol"
                                                                        value={parseComponent(medicine.spy1 || '').volume}
                                                                        onChange={(e) => {
                                                                            const parsed = parseComponent(medicine.spy1 || '')
                                                                            updateMedicine(medicineIndex, 'spy1', formatComponent(parsed.name, e.target.value))
                                                                        }}
                                                                        className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                    />
                                                                </div>
                                                                {/* SPY 2 */}
                                                                <div className="flex gap-1">
                                                                    <CustomSelect
                                                                        value={parseComponent(medicine.spy2 || '').name}
                                                                        onChange={(val) => {
                                                                            const parsed = parseComponent(medicine.spy2 || '')
                                                                            updateMedicine(medicineIndex, 'spy2', formatComponent(val.toUpperCase(), parsed.volume))
                                                                        }}
                                                                        options={components}
                                                                        placeholder="SPY 2"
                                                                        allowCustom={true}
                                                                        className="flex-1 text-xs h-8"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Vol"
                                                                        value={parseComponent(medicine.spy2 || '').volume}
                                                                        onChange={(e) => {
                                                                            const parsed = parseComponent(medicine.spy2 || '')
                                                                            updateMedicine(medicineIndex, 'spy2', formatComponent(parsed.name, e.target.value))
                                                                        }}
                                                                        className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                    />
                                                                </div>
                                                                {/* SPY 3 */}
                                                                <div className="flex gap-1">
                                                                    <CustomSelect
                                                                        value={parseComponent(medicine.spy3 || '').name}
                                                                        onChange={(val) => {
                                                                            const parsed = parseComponent(medicine.spy3 || '')
                                                                            updateMedicine(medicineIndex, 'spy3', formatComponent(val.toUpperCase(), parsed.volume))
                                                                        }}
                                                                        options={components}
                                                                        placeholder="SPY 3"
                                                                        allowCustom={true}
                                                                        className="flex-1 text-xs h-8"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Vol"
                                                                        value={parseComponent(medicine.spy3 || '').volume}
                                                                        onChange={(e) => {
                                                                            const parsed = parseComponent(medicine.spy3 || '')
                                                                            updateMedicine(medicineIndex, 'spy3', formatComponent(parsed.name, e.target.value))
                                                                        }}
                                                                        className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Collapsible SPY 4-6 Section */}
                                                            <div className="mb-3">
                                                                <label
                                                                    className="flex items-center gap-1 text-xs font-semibold mb-2 text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                                                    onClick={() => {
                                                                        setCollapsedSections(prev => ({
                                                                            ...prev,
                                                                            [medicineIndex]: {
                                                                                ...prev[medicineIndex],
                                                                                spy46: !prev[medicineIndex]?.spy46
                                                                            }
                                                                        }))
                                                                    }}
                                                                >
                                                                    <svg className={`w-3 h-3 transition-transform ${(collapsedSections[medicineIndex]?.spy46 ?? !(medicine.spy4 || medicine.spy5 || medicine.spy6)) ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                    </svg>
                                                                    SPY 4-6
                                                                </label>
                                                                {!(collapsedSections[medicineIndex]?.spy46 ?? !(medicine.spy4 || medicine.spy5 || medicine.spy6)) && (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                                        {/* SPY 4 */}
                                                                        <div className="flex gap-1">
                                                                            <CustomSelect
                                                                                value={parseComponent(medicine.spy4 || '').name}
                                                                                onChange={(val) => {
                                                                                    const parsed = parseComponent(medicine.spy4 || '')
                                                                                    updateMedicine(medicineIndex, 'spy4', formatComponent(val.toUpperCase(), parsed.volume))
                                                                                }}
                                                                                options={components}
                                                                                placeholder="SPY 4"
                                                                                allowCustom={true}
                                                                                className="flex-1 text-xs h-8"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Vol"
                                                                                value={parseComponent(medicine.spy4 || '').volume}
                                                                                onChange={(e) => {
                                                                                    const parsed = parseComponent(medicine.spy4 || '')
                                                                                    updateMedicine(medicineIndex, 'spy4', formatComponent(parsed.name, e.target.value))
                                                                                }}
                                                                                className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                            />
                                                                        </div>
                                                                        {/* SPY 5 */}
                                                                        <div className="flex gap-1">
                                                                            <CustomSelect
                                                                                value={parseComponent(medicine.spy5 || '').name}
                                                                                onChange={(val) => {
                                                                                    const parsed = parseComponent(medicine.spy5 || '')
                                                                                    updateMedicine(medicineIndex, 'spy5', formatComponent(val.toUpperCase(), parsed.volume))
                                                                                }}
                                                                                options={components}
                                                                                placeholder="SPY 5"
                                                                                allowCustom={true}
                                                                                className="flex-1 text-xs h-8"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Vol"
                                                                                value={parseComponent(medicine.spy5 || '').volume}
                                                                                onChange={(e) => {
                                                                                    const parsed = parseComponent(medicine.spy5 || '')
                                                                                    updateMedicine(medicineIndex, 'spy5', formatComponent(parsed.name, e.target.value))
                                                                                }}
                                                                                className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                            />
                                                                        </div>
                                                                        {/* SPY 6 */}
                                                                        <div className="flex gap-1">
                                                                            <CustomSelect
                                                                                value={parseComponent(medicine.spy6 || '').name}
                                                                                onChange={(val) => {
                                                                                    const parsed = parseComponent(medicine.spy6 || '')
                                                                                    updateMedicine(medicineIndex, 'spy6', formatComponent(val.toUpperCase(), parsed.volume))
                                                                                }}
                                                                                options={components}
                                                                                placeholder="SPY 6"
                                                                                allowCustom={true}
                                                                                className="flex-1 text-xs h-8"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Vol"
                                                                                value={parseComponent(medicine.spy6 || '').volume}
                                                                                onChange={(e) => {
                                                                                    const parsed = parseComponent(medicine.spy6 || '')
                                                                                    updateMedicine(medicineIndex, 'spy6', formatComponent(parsed.name, e.target.value))
                                                                                }}
                                                                                className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Collapsible Additions Section */}
                                                            <div>
                                                                <label
                                                                    className="flex items-center gap-1 text-xs font-semibold mb-2 text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                                                    onClick={() => {
                                                                        setCollapsedSections(prev => ({
                                                                            ...prev,
                                                                            [medicineIndex]: {
                                                                                ...prev[medicineIndex],
                                                                                additions: !prev[medicineIndex]?.additions
                                                                            }
                                                                        }))
                                                                    }}
                                                                >
                                                                    <svg className={`w-3 h-3 transition-transform ${(collapsedSections[medicineIndex]?.additions ?? !(medicine.addition1 || medicine.addition2 || medicine.addition3)) ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                    </svg>
                                                                    Additions
                                                                </label>
                                                                {!(collapsedSections[medicineIndex]?.additions ?? !(medicine.addition1 || medicine.addition2 || medicine.addition3)) && (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                                        {/* Addition 1 */}
                                                                        <div className="flex gap-1">
                                                                            <CustomSelect
                                                                                value={parseComponent(medicine.addition1 || '').name}
                                                                                onChange={(val) => {
                                                                                    const parsed = parseComponent(medicine.addition1 || '')
                                                                                    updateMedicine(medicineIndex, 'addition1', formatComponent(val.toUpperCase(), parsed.volume))
                                                                                }}
                                                                                options={additions}
                                                                                placeholder="Add 1"
                                                                                allowCustom={true}
                                                                                className="flex-1 text-xs h-8"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Vol"
                                                                                value={parseComponent(medicine.addition1 || '').volume}
                                                                                onChange={(e) => {
                                                                                    const parsed = parseComponent(medicine.addition1 || '')
                                                                                    updateMedicine(medicineIndex, 'addition1', formatComponent(parsed.name, e.target.value))
                                                                                }}
                                                                                className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                            />
                                                                        </div>
                                                                        {/* Addition 2 */}
                                                                        <div className="flex gap-1">
                                                                            <CustomSelect
                                                                                value={parseComponent(medicine.addition2 || '').name}
                                                                                onChange={(val) => {
                                                                                    const parsed = parseComponent(medicine.addition2 || '')
                                                                                    updateMedicine(medicineIndex, 'addition2', formatComponent(val.toUpperCase(), parsed.volume))
                                                                                }}
                                                                                options={additions}
                                                                                placeholder="Add 2"
                                                                                allowCustom={true}
                                                                                className="flex-1 text-xs h-8"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Vol"
                                                                                value={parseComponent(medicine.addition2 || '').volume}
                                                                                onChange={(e) => {
                                                                                    const parsed = parseComponent(medicine.addition2 || '')
                                                                                    updateMedicine(medicineIndex, 'addition2', formatComponent(parsed.name, e.target.value))
                                                                                }}
                                                                                className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                            />
                                                                        </div>
                                                                        {/* Addition 3 */}
                                                                        <div className="flex gap-1">
                                                                            <CustomSelect
                                                                                value={parseComponent(medicine.addition3 || '').name}
                                                                                onChange={(val) => {
                                                                                    const parsed = parseComponent(medicine.addition3 || '')
                                                                                    updateMedicine(medicineIndex, 'addition3', formatComponent(val.toUpperCase(), parsed.volume))
                                                                                }}
                                                                                options={additions}
                                                                                placeholder="Add 3"
                                                                                allowCustom={true}
                                                                                className="flex-1 text-xs h-8"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Vol"
                                                                                value={parseComponent(medicine.addition3 || '').volume}
                                                                                onChange={(e) => {
                                                                                    const parsed = parseComponent(medicine.addition3 || '')
                                                                                    updateMedicine(medicineIndex, 'addition3', formatComponent(parsed.name, e.target.value))
                                                                                }}
                                                                                className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800 text-center"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Remaining Fields in ONE LINE */}
                                                    <div className="mt-4">
                                                        <label className="block text-xs font-semibold mb-2 text-gray-600 dark:text-gray-400">Dosage & Administration Details</label>
                                                        <div className="flex flex-wrap gap-3 items-end w-full">
                                                            <div className="flex-1 min-w-[56px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Qty</label>
                                                                <input type="number" placeholder="0" value={medicine.quantity || ''} onChange={e => updateMedicine(medicineIndex, 'quantity', parseInt(e.target.value))} className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded text-xs h-8 dark:bg-gray-800" />
                                                            </div>
                                                            <div className="flex-1 min-w-[96px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Timing</label>
                                                                <CustomSelect value={medicine.timing || ''} onChange={(val) => updateMedicine(medicineIndex, 'timing', val)} options={timing} placeholder="Time" allowCustom={true} className="text-xs h-8" />
                                                            </div>
                                                            <div className="flex-1 min-w-[80px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Dose Qty</label>
                                                                <CustomSelect
                                                                    value={parseDosage(medicine.dosage || '').quantity}
                                                                    onChange={(val) => {
                                                                        const parsed = parseDosage(medicine.dosage || '')
                                                                        updateMedicine(medicineIndex, 'dosage', formatDosage(val, parsed.timing, parsed.dilution))
                                                                    }}
                                                                    options={doseQuantity}
                                                                    placeholder="Qty"
                                                                    allowCustom={true}
                                                                    className="text-xs h-8"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-[80px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Frequency</label>
                                                                <CustomSelect
                                                                    value={parseDosage(medicine.dosage || '').timing}
                                                                    onChange={(val) => {
                                                                        const parsed = parseDosage(medicine.dosage || '')
                                                                        updateMedicine(medicineIndex, 'dosage', formatDosage(parsed.quantity, val, parsed.dilution))
                                                                    }}
                                                                    options={doseTiming}
                                                                    placeholder="Frequency"
                                                                    allowCustom={true}
                                                                    className="text-xs h-8"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-[80px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Along With</label>
                                                                <CustomSelect
                                                                    value={parseDosage(medicine.dosage || '').dilution}
                                                                    onChange={(val) => {
                                                                        const parsed = parseDosage(medicine.dosage || '')
                                                                        updateMedicine(medicineIndex, 'dosage', formatDosage(parsed.quantity, parsed.timing, val.toUpperCase()))
                                                                    }}
                                                                    options={dilution}
                                                                    placeholder="Along With"
                                                                    allowCustom={true}
                                                                    className="text-xs h-8"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-[112px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Instruction</label>
                                                                <CustomSelect value={medicine.procedure || ''} onChange={(val) => updateMedicine(medicineIndex, 'procedure', val.toUpperCase())} options={procedure} placeholder="Proc" allowCustom={true} className="text-xs h-8" />
                                                            </div>
                                                            <div className="flex-1 min-w-[112px]">
                                                                <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Presentation</label>
                                                                <CustomSelect value={medicine.presentation || ''} onChange={(val) => updateMedicine(medicineIndex, 'presentation', val.toUpperCase())} options={presentation} placeholder="Pres" allowCustom={true} className="text-xs h-8" />
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="flex justify-end gap-2 pt-3 border-t border-emerald-200/30 dark:border-emerald-700/30 mt-3">
                                                            {showRepeatInputForRow[medicineIndex] ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={repeatCountForRow[medicineIndex] || ''}
                                                                        onChange={(e) => setRepeatCountForRow(prev => ({ ...prev, [medicineIndex]: e.target.value }))}
                                                                        placeholder="Times"
                                                                        className="w-16 px-2 py-1 text-xs border border-purple-300 dark:border-purple-700 rounded bg-white dark:bg-gray-800"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => repeatSingleRow(medicineIndex)}
                                                                        className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                                                    >
                                                                        OK
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { 
                                                                            setShowRepeatInputForRow(prev => ({ ...prev, [medicineIndex]: false }))
                                                                            setRepeatCountForRow(prev => ({ ...prev, [medicineIndex]: '' }))
                                                                        }}
                                                                        className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowRepeatInputForRow(prev => ({ ...prev, [medicineIndex]: true }))}
                                                                    className="px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-white hover:bg-purple-500 dark:hover:bg-purple-600 border border-purple-300 dark:border-purple-700 rounded-lg transition-all duration-200 hover:shadow-md"
                                                                >
                                                                    <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                    Repeat
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeMedicine(medicineIndex)}
                                                                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 border border-red-300 dark:border-red-700 rounded-lg transition-all duration-200 hover:shadow-md"
                                                            >
                                                                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
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
