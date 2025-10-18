import { useState, useEffect } from 'react'
import DateInput from '../components/DateInput'
import CustomSelect from '../components/CustomSelect'
import dropdownOptions from '../data/dropdownOptions.json'

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [imagePreview, setImagePreview] = useState<string>('')
    const [uploadingImage, setUploadingImage] = useState(false)
    const [loading, setLoading] = useState(true)
    
    const emptyForm = { firstName: '', lastName: '', phone: '', email: '', dob: '', opdNo: '', date: '', age: '', address: '', gender: '', nextVisitDate: '', nextVisitTime: '', occupation: '', pendingPaymentCents: '', height: '', weight: '', imageUrl: '' }
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

    useEffect(() => { 
        setLoading(true)
        fetch('/api/patients')
            .then(r => r.json())
            .then(data => {
                setPatients(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])
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
            setImagePreview('')
        }, 300)
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type - accept all image formats
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/tiff']
        if (!file.type.startsWith('image/') && !validImageTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, WebP, GIF, etc.)')
            return
        }

        // Validate file size (max 10MB to accommodate various formats)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image size should be less than 10MB')
            return
        }

        try {
            setUploadingImage(true)
            
            // Convert to base64
            const reader = new FileReader()
            reader.onloadend = async () => {
                try {
                    const base64Image = reader.result as string
                    setImagePreview(base64Image)

                    // Upload to Cloudinary
                    const res = await fetch('/api/upload-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image: base64Image, folder: 'patients' })
                    })

                    const data = await res.json()

                    if (!res.ok) {
                        throw new Error(data.error || 'Failed to upload image')
                    }

                    setForm({ ...form, imageUrl: data.url })
                    setUploadingImage(false)
                } catch (error: any) {
                    console.error('Image upload error:', error)
                    alert(`Failed to upload image: ${error.message || 'Unknown error'}`)
                    setUploadingImage(false)
                    setImagePreview('')
                }
            }
            reader.onerror = () => {
                alert('Failed to read image file')
                setUploadingImage(false)
            }
            reader.readAsDataURL(file)
        } catch (error: any) {
            console.error('Image upload error:', error)
            alert(`Failed to upload image: ${error.message || 'Unknown error'}`)
            setUploadingImage(false)
        }
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
            weight: patient.weight ? String(patient.weight) : '',
            imageUrl: patient.imageUrl || ''
        })
        setImagePreview(patient.imageUrl || '')
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
            {/* Search Bar */}
            <div className="card mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="🔍 Search patients by name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <svg className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

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
                                    {/* Patient Image Upload */}
                                    <div className="mb-6 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <div className="flex-shrink-0">
                                                {imagePreview ? (
                                                    <img 
                                                        src={imagePreview} 
                                                        alt="Patient" 
                                                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                                                    />
                                                ) : (
                                                    <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium mb-2">Patient Photo</label>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    disabled={uploadingImage}
                                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
                                                />
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {uploadingImage ? 'Uploading...' : 'All image formats supported: JPEG, PNG, WebP, GIF, etc. (MAX. 10MB)'}
                                                </p>
                                                {imagePreview && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setImagePreview('')
                                                            setForm({ ...form, imageUrl: '' })
                                                        }}
                                                        className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                                                    >
                                                        Remove Photo
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

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
                                            <CustomSelect
                                                value={(form as any).gender || ''}
                                                onChange={(val) => setForm({ ...form, gender: val })}
                                                options={dropdownOptions.gender}
                                                placeholder="Select gender"
                                                allowCustom={true}
                                            />
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
                    <span className="badge">{patients.filter(p => {
                        if (!searchQuery) return true
                        const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase()
                        return fullName.includes(searchQuery.toLowerCase())
                    }).length} patients</span>
                </h3>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-muted">Loading patients...</p>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="text-center py-12 text-muted">
                        <p className="text-lg mb-2">No patients registered yet</p>
                        <p className="text-sm">Click "Register New Patient" to get started</p>
                    </div>
                ) : patients.filter(p => {
                    if (!searchQuery) return true
                    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase()
                    return fullName.includes(searchQuery.toLowerCase())
                }).length === 0 ? (
                    <div className="text-center py-12 text-muted">
                        <p className="text-lg mb-2">No patients found</p>
                        <p className="text-sm">Try a different search term</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {patients.filter(p => {
                            if (!searchQuery) return true
                            const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase()
                            return fullName.includes(searchQuery.toLowerCase())
                        }).map(p => {
                            const isExpanded = expandedRows.has(p.id)
                            const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim()
                            
                            return (
                                <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    {/* Summary Row */}
                                    <div className="bg-gray-50 dark:bg-gray-800 p-3 flex items-center gap-3">
                                        {/* Patient Image Circle */}
                                        <div className="flex-shrink-0">
                                            <img 
                                                src={p.imageUrl || process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || ''} 
                                                alt="Patient" 
                                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                                            />
                                        </div>
                                        
                                        {/* Patient Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm">{fullName || 'Unknown Patient'}</div>
                                            <div className="text-xs text-muted mt-0.5">
                                                {p.opdNo && <span className="mr-2">OPD: {p.opdNo}</span>}
                                                {p.phone && <span className="mr-2">📞 {p.phone}</span>}
                                                {p.age && <span>Age: {p.age}</span>}
                                            </div>
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
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
                                            {/* Basic Info with Patient Image on Left */}
                                            <div className="flex gap-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                                                {/* Patient Image - Left Side */}
                                                <div className="flex-shrink-0">
                                                    <img 
                                                        src={p.imageUrl || process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || ''} 
                                                        alt="Patient" 
                                                        className="w-32 h-32 rounded-lg object-cover border-2 border-gray-300 dark:border-gray-600 shadow-md"
                                                    />
                                                </div>
                                                
                                                {/* Basic Info Grid */}
                                                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
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
