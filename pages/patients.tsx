import { useState, useEffect } from 'react'
import DateInput from '../components/DateInput'

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    
    const emptyForm = { firstName: '', lastName: '', phone: '', email: '', dob: '', opdNo: '', date: '', age: '', address: '', gender: '', nextVisitDate: '', nextVisitTime: '', occupation: '', pendingPaymentCents: '', height: '', weight: '' }
    const [form, setForm] = useState(emptyForm)

    // Calculate age from date of birth
    const calculateAge = (dob: string) => {
        if (!dob) return ''
        const today = new Date()
        const birthDate = new Date(dob)
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age.toString()
    }

    // Handle DOB change
    const handleDobChange = (dob: string) => {
        const age = calculateAge(dob)
        setForm({ ...form, dob, age })
    }

    useEffect(() => { fetch('/api/patients').then(r => r.json()).then(setPatients) }, [])
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    function openModal() {
        setIsModalOpen(true)
        setTimeout(() => setIsAnimating(true), 10)
    }

    function closeModal() {
        setIsAnimating(false)
        setTimeout(() => {
            setIsModalOpen(false)
            setEditingId(null)
            setForm(emptyForm)
        }, 300)
    }

    function toggleRowExpansion(id: number) {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
    }

    function editPatient(patient: any) {
        setEditingId(patient.id)
        
        const nextVisitSplit = (() => {
            if (patient.nextVisit) {
                const dt = new Date(patient.nextVisit).toISOString()
                return {
                    date: dt.slice(0, 10),
                    time: dt.slice(11, 16)
                }
            }
            return { date: '', time: '' }
        })()
        
        setForm({
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            phone: patient.phone || '',
            email: patient.email || '',
            dob: patient.dob ? new Date(patient.dob).toISOString().slice(0, 10) : '',
            opdNo: patient.opdNo || '',
            date: patient.date ? new Date(patient.date).toISOString().slice(0, 10) : '',
            age: patient.age ? String(patient.age) : '',
            address: patient.address || '',
            gender: patient.gender || '',
            nextVisitDate: nextVisitSplit.date,
            nextVisitTime: nextVisitSplit.time,
            occupation: patient.occupation || '',
            pendingPaymentCents: patient.pendingPaymentCents ? String(patient.pendingPaymentCents) : '',
            height: patient.height ? String(patient.height) : '',
            weight: patient.weight ? String(patient.weight) : ''
        })
        openModal()
    }

    async function submitPatient(e: any) {
        e.preventDefault()
        try {
            const payload: any = { ...form }
            if (payload.age) payload.age = Number(payload.age)
            if (payload.pendingPaymentCents) payload.pendingPaymentCents = Number(payload.pendingPaymentCents)
            if (payload.height) payload.height = Number(payload.height)
            if (payload.weight) payload.weight = Number(payload.weight)
            
            if (form.nextVisitDate && form.nextVisitTime) {
                payload.nextVisit = `${form.nextVisitDate}T${form.nextVisitTime}`
            }
            
            const method = editingId ? 'PUT' : 'POST'
            const body = editingId ? { id: editingId, ...payload } : payload
            
            const res = await fetch('/api/patients', { 
                method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(body) 
            })
            
            if (!res.ok) {
                const err = await res.text()
                console.error('Save patient failed:', err)
                alert('Failed to save patient')
                return
            }
            
            const list = await (await fetch('/api/patients')).json()
            setPatients(list)
            closeModal()
        } catch (err) { 
            console.error(err)
            alert('Failed to save patient') 
        }
    }

    async function deletePatient(id: number) {
        if (!confirm('Are you sure you want to delete this patient?')) return
        try {
            const response = await fetch('/api/patients', { 
                method: 'DELETE', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ id }) 
            })
            if (response.ok) {
                setPatients(await (await fetch('/api/patients')).json())
            } else {
                const error = await response.json()
                alert('Failed to delete patient: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Delete error:', error)
            alert('Failed to delete patient')
        }
    }

    return (
        <div>
            <div className="section-header flex justify-between items-center">
                <h2 className="section-title">Patient Management</h2>
                {user && (
                    <button onClick={openModal} className="btn btn-primary">
                        + Register New Patient
                    </button>
                )}
            </div>

            {!user && (
                <div className="card mb-4">
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                        You must <a className="text-brand underline font-medium" href="/login">login</a> to register patients.
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`} onClick={closeModal}>
                    <div className={`fixed inset-0 flex items-center justify-center p-4 z-50 transition-all duration-300 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
                                <h2 className="text-xl font-semibold">{editingId ? 'Edit Patient' : 'Register New Patient'}</h2>
                                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                                <form onSubmit={submitPatient}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">First Name *</label>
                                            <input required placeholder="John" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Last Name *</label>
                                            <input required placeholder="Doe" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Phone</label>
                                            <input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Email</label>
                                            <input type="email" placeholder="john.doe@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Date of Birth</label>
                                            <DateInput type="date" placeholder="Select date of birth" value={form.dob} onChange={e => handleDobChange(e.target.value)} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">OPD Number *</label>
                                            <input 
                                                required
                                                placeholder="251009 1 1" 
                                                value={form.opdNo} 
                                                onChange={e => setForm({ ...form, opdNo: e.target.value })} 
                                                className="p-2 border rounded w-full font-mono" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Age</label>
                                            <input placeholder="35" type="number" value={(form as any).age || ''} onChange={e => setForm({ ...form, age: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Gender</label>
                                            <input placeholder="Male / Female / Other" value={(form as any).gender || ''} onChange={e => setForm({ ...form, gender: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Occupation</label>
                                            <input placeholder="Engineer" value={(form as any).occupation || ''} onChange={e => setForm({ ...form, occupation: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div className="sm:col-span-2 lg:col-span-3">
                                            <label className="block text-sm font-medium mb-1.5">Address</label>
                                            <input placeholder="123 Main St, City" value={(form as any).address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Height (cm)</label>
                                            <input placeholder="175" type="number" value={(form as any).height || ''} onChange={e => setForm({ ...form, height: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Weight (kg)</label>
                                            <input placeholder="70" type="number" value={(form as any).weight || ''} onChange={e => setForm({ ...form, weight: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Pending Payment (₹)</label>
                                            <input placeholder="500.00" type="number" step="0.01" value={(form as any).pendingPaymentCents || ''} onChange={e => setForm({ ...form, pendingPaymentCents: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Next Visit Date</label>
                                            <DateInput type="date" placeholder="Select visit date" value={form.nextVisitDate} onChange={e => setForm({ ...form, nextVisitDate: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Next Visit Time</label>
                                            <input type="time" placeholder="Select time" value={form.nextVisitTime} onChange={e => setForm({ ...form, nextVisitTime: e.target.value })} className="p-2 border rounded w-full" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-2 pt-6 border-t mt-6">
                                        <button type="button" onClick={closeModal} className="btn btn-secondary">
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {editingId ? 'Update Patient' : 'Register Patient'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Patients List */}
            <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                    <span>Patient Records</span>
                    <span className="badge">{patients.length} patients</span>
                </h3>
                {patients.length === 0 ? (
                    <div className="text-center py-12 text-muted">
                        <p className="text-lg mb-2">No patients registered yet</p>
                        <p className="text-sm">Click "Register New Patient" to get started</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {patients.map(p => {
                            const isExpanded = expandedRows.has(p.id)
                            const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim()
                            
                            return (
                                <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    {/* Summary Row */}
                                    <div className="bg-gray-50 dark:bg-gray-800 p-3 flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm">{fullName || 'Unknown Patient'}</div>
                                            <div className="text-xs text-muted mt-0.5">
                                                {p.opdNo && <span className="mr-2">OPD: {p.opdNo}</span>}
                                                {p.phone && <span className="mr-2">📞 {p.phone}</span>}
                                                {p.age && <span>Age: {p.age}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => editPatient(p)}
                                                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                                title="Edit"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => deletePatient(p.id)}
                                                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                                                title="Delete"
                                            >
                                                🗑️ Delete
                                            </button>
                                            <button
                                                onClick={() => toggleRowExpansion(p.id)}
                                                className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                                                title={isExpanded ? "Hide Details" : "View More"}
                                            >
                                                {isExpanded ? '▲ Hide' : '▼ View More'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="p-4 bg-white dark:bg-gray-900 space-y-4">
                                            {/* Basic Info */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                                <div>
                                                    <div className="text-xs text-muted mb-1">First Name</div>
                                                    <div className="text-sm font-medium">{p.firstName || '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted mb-1">Last Name</div>
                                                    <div className="text-sm font-medium">{p.lastName || '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted mb-1">OPD Number</div>
                                                    <div className="text-sm font-medium font-mono">{p.opdNo || '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted mb-1">Age</div>
                                                    <div className="text-sm font-medium">{p.age || '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted mb-1">Gender</div>
                                                    <div className="text-sm font-medium">{p.gender || '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted mb-1">Date of Birth</div>
                                                    <div className="text-sm font-medium">{p.dob ? new Date(p.dob).toLocaleDateString() : '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted mb-1">Occupation</div>
                                                    <div className="text-sm font-medium">{p.occupation || '-'}</div>
                                                </div>
                                            </div>

                                            {/* Contact Info */}
                                            <div>
                                                <div className="text-sm font-semibold mb-2">Contact Information</div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Phone</div>
                                                        <div className="text-sm font-medium">{p.phone || '-'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Email</div>
                                                        <div className="text-sm font-medium">{p.email || '-'}</div>
                                                    </div>
                                                    <div className="col-span-2 md:col-span-3">
                                                        <div className="text-xs text-muted mb-1">Address</div>
                                                        <div className="text-sm font-medium">{p.address || '-'}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Medical Info */}
                                            <div>
                                                <div className="text-sm font-semibold mb-2">Medical Information</div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Height</div>
                                                        <div className="text-sm font-medium">{p.height ? `${p.height} cm` : '-'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Weight</div>
                                                        <div className="text-sm font-medium">{p.weight ? `${p.weight} kg` : '-'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Next Visit</div>
                                                        <div className="text-sm font-medium">
                                                            {p.nextVisit ? new Date(p.nextVisit).toLocaleString() : '-'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Pending Payment</div>
                                                        <div className="text-sm font-medium text-red-600 dark:text-red-400">
                                                            {p.pendingPaymentCents ? `₹${p.pendingPaymentCents}` : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
