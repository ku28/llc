import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import DateInput from '../components/DateInput'
import ToastNotification from '../components/ToastNotification'
import { useToast } from '../hooks/useToast'
import CustomSelect from '../components/CustomSelect'
import dropdownOptions from '../data/dropdownOptions.json'

export default function PatientsPage() {
    const router = useRouter()
    const [patients, setPatients] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [userLoading, setUserLoading] = useState(true)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [imagePreview, setImagePreview] = useState<string>('')
    const [uploadingImage, setUploadingImage] = useState(false)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; id?: number; message?: string }>({ open: false })
    const [confirmModalAnimating, setConfirmModalAnimating] = useState(false)
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
    
    const emptyForm = { firstName: '', lastName: '', phone: '', email: '', dob: '', opdNo: '', date: '', age: '', address: '', gender: '', occupation: '', pendingPaymentCents: '', height: '', weight: '', imageUrl: '', fatherHusbandGuardianName: '' }
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

    // Calculate approximate DOB from age
    const calculateDobFromAge = (age: string) => {
        if (!age || age === '') return ''
        const ageNum = parseInt(age)
        if (isNaN(ageNum) || ageNum < 0) return ''
        const today = new Date()
        const birthYear = today.getFullYear() - ageNum
        const approxDob = new Date(birthYear, today.getMonth(), today.getDate())
        return approxDob.toISOString().split('T')[0]
    }

    // Handle DOB change
    const handleDobChange = (dob: string) => {
        const age = calculateAge(dob)
        setForm({ ...form, dob, age })
    }

    // Handle age change
    const handleAgeChange = (age: string) => {
        if (!form.dob) {
            const dob = calculateDobFromAge(age)
            setForm({ ...form, age, dob })
        } else {
            setForm({ ...form, age })
        }
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
    useEffect(() => { 
        setUserLoading(true)
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(d => {
                setUser(d.user)
                setUserLoading(false)
            })
            .catch(() => setUserLoading(false))
    }, [])

    // Handle pre-filled data from appointment request
    useEffect(() => {
        if (router.isReady && router.query.requestId) {
            const { 
                name, 
                email, 
                phone, 
                dob, 
                age, 
                address, 
                gender, 
                occupation, 
                height, 
                weight, 
                fatherHusbandGuardianName,
                imageUrl 
            } = router.query
            
            const [firstName = '', lastName = ''] = (name as string || '').split(' ', 2)
            
            setForm(prev => ({
                ...prev,
                firstName,
                lastName: lastName || '',
                email: email as string || '',
                phone: phone as string || '',
                dob: dob as string || '',
                age: age as string || '',
                address: address as string || '',
                gender: gender as string || '',
                occupation: occupation as string || '',
                height: height as string || '',
                weight: weight as string || '',
                fatherHusbandGuardianName: fatherHusbandGuardianName as string || '',
                imageUrl: imageUrl as string || ''
            }))
            
            // Set image preview if available
            if (imageUrl) {
                setImagePreview(imageUrl as string)
            }
            
            // Auto-open modal if coming from appointment request
            openModal()
        }
    }, [router.isReady, router.query])

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
            occupation: patient.occupation || '',
            pendingPaymentCents: patient.pendingPaymentCents ? String(patient.pendingPaymentCents) : '',
            height: patient.height ? String(patient.height) : '',
            weight: patient.weight ? String(patient.weight) : '',
            imageUrl: patient.imageUrl || '',
            fatherHusbandGuardianName: patient.fatherHusbandGuardianName || ''
        })
        setImagePreview(patient.imageUrl || '')
        openModal()
    }

    // Inline validation state
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    async function submitPatient(e: any) {
        e.preventDefault();
        // Validate required fields
        const errors: { [key: string]: string } = {};
        if (!form.firstName.trim()) errors.firstName = 'First Name is required';
        if (!form.lastName.trim()) errors.lastName = 'Last Name is required';
        if (!form.opdNo.trim()) errors.opdNo = 'OPD Number is required';
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSubmitting(true);
        try {
            const payload: any = { ...form };
            // If email is blank, set to null so Prisma does not trigger unique constraint
            if (!payload.email || payload.email.trim() === '') {
                payload.email = null;
            }
            if (payload.age) payload.age = Number(payload.age);
            if (payload.pendingPaymentCents) payload.pendingPaymentCents = Number(payload.pendingPaymentCents);
            if (payload.height) payload.height = Number(payload.height);
            if (payload.weight) payload.weight = Number(payload.weight);

            const method = editingId ? 'PUT' : 'POST';
            const body = editingId ? { id: editingId, ...payload } : payload;

            const res = await fetch('/api/patients', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                let errMsg = 'Failed to save patient';
                let emailUniqueError = false;
                try {
                    const err = await res.json();
                    errMsg = err.error || errMsg;
                    // Prisma unique constraint error code for email
                    if (errMsg.includes('Unique constraint failed') && errMsg.includes('email')) {
                        setFieldErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
                        emailUniqueError = true;
                    }
                } catch {
                    // fallback to text
                    errMsg = await res.text();
                }
                console.error('Save patient failed:', errMsg);
                if (!emailUniqueError) showError(errMsg);
                return;
            }

            const savedPatient = await res.json();

            // If this patient was created from an appointment request, update the request
            if (router.query.requestId && !editingId && savedPatient.id) {
                try {
                    await fetch('/api/appointment-requests', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: Number(router.query.requestId),
                            patientId: savedPatient.id
                        })
                    });
                    console.log('✓ Appointment request updated with patientId:', savedPatient.id);
                } catch (err) {
                    console.error('Failed to update appointment request:', err);
                    // Don't fail the patient creation if request update fails
                }
            }

            const list = await (await fetch('/api/patients')).json();
            setPatients(list);
            showSuccess(editingId ? 'Patient updated successfully' : 'Patient registered successfully');
            closeModal();

            // Redirect back to requests page if coming from appointment request
            if (router.query.requestId) {
                router.push('/requests');
            }
        } catch (err: any) {
            console.error(err);
            showError(err?.message || 'Failed to save patient');
        } finally {
            setSubmitting(false);
        }
    }

    async function deletePatient(id: number) {
        setConfirmModal({ open: true, id, message: 'Are you sure you want to delete this patient?' })
        setTimeout(() => setConfirmModalAnimating(true), 10)
    }

    function closeConfirmModal() {
        setConfirmModalAnimating(false)
        setTimeout(() => setConfirmModal({ open: false }), 300)
    }

    async function handleConfirmDelete(id?: number) {
        if (!id) {
            closeConfirmModal()
            return
        }
        setDeleting(true)
        try {
            const response = await fetch('/api/patients', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            if (response.ok) {
                setPatients(await (await fetch('/api/patients')).json())
                showSuccess('Patient deleted successfully')
                closeConfirmModal()
            } else {
                const error = await response.json()
                console.error('Delete failed:', error)
                showError('Failed to delete patient')
            }
        } catch (error) {
            console.error('Delete error:', error)
            showError('Failed to delete patient')
        } finally {
            setDeleting(false)
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
            {!userLoading && !user && (
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
                                            <label className="block text-sm font-medium mb-1.5">First Name <span className="text-red-600">*</span></label>
                                            <input required placeholder="John" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value.toUpperCase() })} className={`p-2 rounded w-full border ${fieldErrors.firstName ? 'border-red-600' : 'border-gray-300 dark:border-gray-600'}`} />
                                            {fieldErrors.firstName && <p className="text-xs text-red-600 mt-1">{fieldErrors.firstName}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Last Name <span className="text-red-600">*</span></label>
                                            <input required placeholder="Doe" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value.toUpperCase() })} className={`p-2 rounded w-full border ${fieldErrors.lastName ? 'border-red-600' : 'border-gray-300 dark:border-gray-600'}`} />
                                            {fieldErrors.lastName && <p className="text-xs text-red-600 mt-1">{fieldErrors.lastName}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">OPD Number <span className="text-red-600">*</span></label>
                                            <input 
                                                required
                                                placeholder="251009 1 1" 
                                                value={form.opdNo} 
                                                onChange={e => setForm({ ...form, opdNo: e.target.value.toUpperCase() })} 
                                                className={`p-2 rounded w-full font-mono border ${fieldErrors.opdNo ? 'border-red-600' : 'border-gray-300 dark:border-gray-600'}`} 
                                            />
                                            {fieldErrors.opdNo && <p className="text-xs text-red-600 mt-1">{fieldErrors.opdNo}</p>}
                                        </div>
                                        {/* Optional fields below, not required */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Phone</label>
                                            <input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.toUpperCase() })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Email</label>
                                            <input type="email" placeholder="john.doe@example.com" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value.toUpperCase() }); setFieldErrors(prev => ({ ...prev, email: '' })); }} className={`p-2 rounded w-full border ${fieldErrors.email ? 'border-red-600' : 'border-gray-300 dark:border-gray-600'}`} />
                                            {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Date of Birth</label>
                                            <DateInput type="date" placeholder="Select date of birth" value={form.dob} onChange={e => handleDobChange(e.target.value)} className="p-2 border rounded w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Age</label>
                                            <input placeholder="35" type="number" value={(form as any).age || ''} onChange={e => handleAgeChange(e.target.value)} className="p-2 border rounded w-full" />
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
                                            <input placeholder="Engineer" value={(form as any).occupation || ''} onChange={e => setForm({ ...form, occupation: e.target.value.toUpperCase() })} className="p-2 border rounded w-full" />
                                        </div>
                                        <div className="sm:col-span-2 lg:col-span-3">
                                            <label className="block text-sm font-medium mb-1.5">Address</label>
                                            <input placeholder="123 Main St, City" value={(form as any).address || ''} onChange={e => setForm({ ...form, address: e.target.value.toUpperCase() })} className="p-2 border rounded w-full" />
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
                                    </div>
                                    
                                    <div className="flex justify-end gap-2 pt-6 border-t mt-6">
                                        <button type="button" onClick={closeModal} disabled={submitting} className="btn btn-secondary">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={submitting} className="btn btn-primary flex items-center gap-2">
                                            {submitting && (
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            )}
                                            {submitting ? 'Saving...' : (editingId ? 'Update Patient' : 'Register Patient')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmModal.open && (
                <div className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${confirmModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`} onClick={!deleting ? closeConfirmModal : undefined}>
                    <div className={`bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full shadow-2xl transform transition-all duration-300 ${confirmModalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Confirm Delete</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{confirmModal.message}</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3">
                                <button 
                                    onClick={closeConfirmModal} 
                                    disabled={deleting} 
                                    className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleConfirmDelete(confirmModal.id)} 
                                    disabled={deleting} 
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors font-medium"
                                >
                                    {deleting && (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toasts */}
            <ToastNotification toasts={toasts} removeToast={removeToast} />

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
