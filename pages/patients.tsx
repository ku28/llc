import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import * as XLSX from 'xlsx'
import DateInput from '../components/DateInput'
import ToastNotification from '../components/ToastNotification'
import { useToast } from '../hooks/useToast'
import CustomSelect from '../components/CustomSelect'
import ImportPatientsModal from '../components/ImportPatientsModal'
import { useImportContext } from '../contexts/ImportContext'
import { useDataCache } from '../contexts/DataCacheContext'
import { useDoctor } from '../contexts/DoctorContext'
import RefreshButton from '../components/RefreshButton'
import PhoneNumber from '../components/PhoneNumber'
import CameraModal from '../components/CameraModal'
import genderOptions from '../data/gender.json'

export default function PatientsPage() {
    const router = useRouter()
    const [patients, setPatients] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    const [userLoading, setUserLoading] = useState(true)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [selectedPatientIds, setSelectedPatientIds] = useState<Set<number>>(new Set())
    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'age' | 'gender' | 'lastVisit'>('date')
    const [sortOrders, setSortOrders] = useState<{[key: string]: 'asc' | 'desc'}>({
        name: 'asc',
        date: 'desc',
        age: 'asc',
        gender: 'asc',
        lastVisit: 'desc'
    })
    const [showSortDropdown, setShowSortDropdown] = useState(false)
    const [imagePreview, setImagePreview] = useState<string>('')
    const [uploadingImage, setUploadingImage] = useState(false)
    const [showCamera, setShowCamera] = useState(false)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; id?: number; deleteMultiple?: boolean; message?: string }>({ open: false })
    const [confirmModalAnimating, setConfirmModalAnimating] = useState(false)
    const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
    const [isDeleteMinimized, setIsDeleteMinimized] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [showLoadingModal, setShowLoadingModal] = useState(false)
    const [itemsPerPage] = useState(10)
    const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false)
    const [doctors, setDoctors] = useState<any[]>([])
    const [doctorsLoading, setDoctorsLoading] = useState(false)
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
    const { addTask, updateTask } = useImportContext()
    const { getCache, setCache, clearCache } = useDataCache()
    const { selectedDoctorId } = useDoctor()
    
    const emptyForm = { fullName: '', phone: '', email: '', dob: '', date: '', age: '', address: '', gender: '', imageUrl: '', fatherHusbandGuardianName: '', doctorId: '', weight: '', height: '' }
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
        const dob = calculateDobFromAge(age)
        setForm({ ...form, age, dob })
    }

    // Fetch patients data with caching
    const fetchPatients = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (selectedDoctorId) {
                params.append('doctorId', selectedDoctorId.toString())
            }
            
            const res = await fetch(`/api/patients?${params}`)
            const data = await res.json()
            setPatients(data)
            setCache('patients', data)
        } catch (err) {
            showError('Failed to fetch patients')
        } finally {
            setLoading(false)
        }
    }, [selectedDoctorId, setCache, showError])

    // Load cached data or fetch if not available
    useEffect(() => { 
        const cachedPatients = getCache<any[]>('patients')
        if (cachedPatients) {
            setPatients(cachedPatients)
            setLoading(false)
        } else {
            fetchPatients()
        }
        
        // Cleanup on unmount
        return () => {
            setPatients([])
        }
    }, [selectedDoctorId])

    // Listen for doctor change events
    useEffect(() => {
        const handleDoctorChange = () => {
            fetchPatients()
        }
        
        window.addEventListener('doctor-changed', handleDoctorChange)
        return () => window.removeEventListener('doctor-changed', handleDoctorChange)
    }, [fetchPatients]) // Re-fetch when selectedDoctorId changes
    
    useEffect(() => { 
        const cachedUser = sessionStorage.getItem('currentUser')
        if (cachedUser) {
            setUser(JSON.parse(cachedUser))
            setUserLoading(false)
        } else {
            setUserLoading(true)
            fetch('/api/auth/me')
                .then(r => r.json())
                .then(d => {
                    setUser(d.user)
                    sessionStorage.setItem('currentUser', JSON.stringify(d.user))
                    setUserLoading(false)
                })
                .catch(() => setUserLoading(false))
        }
    }, [])

    // Fetch doctors list for receptionist and admin
    useEffect(() => {
        if (user && (user.role === 'receptionist' || user.role === 'admin')) {
            setDoctorsLoading(true)
            fetch('/api/doctors/list')
                .then(r => r.json())
                .then(data => {
                    setDoctors(data.doctors || [])
                    setDoctorsLoading(false)
                })
                .catch(() => {
                    setDoctorsLoading(false)
                    showError('Failed to fetch doctors')
                })
        }
    }, [user])

    // Listen for maximize events from notification dropdown
    useEffect(() => {
        const handleMaximize = (e: any) => {
            if (e.detail.type === 'patients' && e.detail.operation === 'delete' && e.detail.taskId === deleteTaskId) {
                setIsDeleteMinimized(false)
            }
        }
        window.addEventListener('maximizeTask', handleMaximize)
        return () => window.removeEventListener('maximizeTask', handleMaximize)
    }, [deleteTaskId])

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

    function openModal(prefillData?: any) {
        if (prefillData) {
            setForm(prefillData)
        } else {
            setForm({
                ...emptyForm,
                date: new Date().toISOString().split('T')[0],
                doctorId: user?.role === 'doctor' ? user.id.toString() : ''
            })
        }
        setIsModalOpen(true)
        document.body.style.overflow = 'hidden'
        setTimeout(() => setIsAnimating(true), 10)
    }

    function closeModal() {
        setIsAnimating(false)
        document.body.style.overflow = 'unset'
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
            showError('Please select a valid image file (JPEG, PNG, WebP, GIF, etc.)')
            return
        }

        // Validate file size (max 10MB to accommodate various formats)
        if (file.size > 10 * 1024 * 1024) {
            showError('Image size should be less than 10MB')
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
                    showError(`Failed to upload image: ${error.message || 'Unknown error'}`)
                    setUploadingImage(false)
                    setImagePreview('')
                }
            }
            reader.onerror = () => {
                showError('Failed to read image file')
                setUploadingImage(false)
            }
            reader.readAsDataURL(file)
        } catch (error: any) {
            console.error('Image upload error:', error)
            showError(`Failed to upload image: ${error.message || 'Unknown error'}`)
            setUploadingImage(false)
        }
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
            })
            setCameraStream(stream)
            setShowCamera(true)
            
            // Set video stream after a small delay to ensure video element is rendered
            setTimeout(() => {
                const videoElement = document.getElementById('camera-video') as HTMLVideoElement
                if (videoElement) {
                    videoElement.srcObject = stream
                }
            }, 100)
        } catch (error: any) {
            console.error('Camera error:', error)
            showError('Failed to access camera. Please check camera permissions.')
        }
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop())
            setCameraStream(null)
        }
        setShowCamera(false)
    }

    async function capturePhoto() {
        const videoElement = document.getElementById('camera-video') as HTMLVideoElement
        const canvas = document.createElement('canvas')
        
        if (videoElement) {
            canvas.width = videoElement.videoWidth
            canvas.height = videoElement.videoHeight
            const ctx = canvas.getContext('2d')
            
            if (ctx) {
                ctx.drawImage(videoElement, 0, 0)
                const base64Image = canvas.toDataURL('image/jpeg', 0.9)
                
                try {
                    setUploadingImage(true)
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
                    stopCamera()
                } catch (error: any) {
                    console.error('Image upload error:', error)
                    showError(`Failed to upload image: ${error.message || 'Unknown error'}`)
                    setUploadingImage(false)
                    setImagePreview('')
                }
            }
        }
    }

    // Handle camera capture from CameraModal
    async function handleCameraCapture(base64Image: string) {
        try {
            setUploadingImage(true)
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
            showSuccess('Photo captured successfully!')
            setUploadingImage(false)
        } catch (error: any) {
            console.error('Image upload error:', error)
            showError(`Failed to upload image: ${error.message || 'Unknown error'}`)
            setUploadingImage(false)
            setImagePreview('')
        }
    }

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop())
            }
        }
    }, [cameraStream])

    // Close export dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement
            if (showExportDropdown && !target.closest('.relative')) {
                setShowExportDropdown(false)
            }
            if (showSortDropdown && !target.closest('.relative')) {
                setShowSortDropdown(false)
            }
        }
        if (showExportDropdown || showSortDropdown) {
            document.addEventListener('click', handleClickOutside)
        }
        return () => document.removeEventListener('click', handleClickOutside)
    }, [showExportDropdown, showSortDropdown])

    function toggleRowExpansion(id: number) {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
    }

    function togglePatientSelection(id: number) {
        const newSelected = new Set(selectedPatientIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedPatientIds(newSelected)
    }

    function toggleSelectAll() {
        const filteredPatients = getFilteredAndSortedPatients()
        
        if (selectedPatientIds.size === filteredPatients.length) {
            // Deselect all
            setSelectedPatientIds(new Set())
        } else {
            // Select all filtered patients
            setSelectedPatientIds(new Set(filteredPatients.map(p => p.id)))
        }
    }

    function getFilteredAndSortedPatients() {
        // Filter patients
        let filtered = patients.filter(p => {
            if (!searchQuery) return true
            const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase()
            return fullName.includes(searchQuery.toLowerCase())
        })

        // Helper to check if patient is from today
        const isFromToday = (patient: any) => {
            if (!patient.createdAt) return false
            const createdDate = new Date(patient.createdAt).toDateString()
            const today = new Date().toDateString()
            return createdDate === today
        }

        // Sort patients
        filtered.sort((a, b) => {
            // Keep patients created today at top
            const aIsNew = isFromToday(a)
            const bIsNew = isFromToday(b)
            if (aIsNew && !bIsNew) return -1
            if (!aIsNew && bIsNew) return 1
            
            let compareResult = 0
            
            if (sortBy === 'name') {
                const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase()
                const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase()
                compareResult = nameA.localeCompare(nameB)
            } else if (sortBy === 'date') {
                const dateA = a.date ? new Date(a.date).getTime() : 0
                const dateB = b.date ? new Date(b.date).getTime() : 0
                compareResult = dateA - dateB
            } else if (sortBy === 'age') {
                compareResult = (a.age || 0) - (b.age || 0)
            } else if (sortBy === 'gender') {
                compareResult = (a.gender || '').localeCompare(b.gender || '')
            } else if (sortBy === 'lastVisit') {
                const aLastVisit = a.visits?.[0]?.visitDate || ''
                const bLastVisit = b.visits?.[0]?.visitDate || ''
                compareResult = new Date(aLastVisit || 0).getTime() - new Date(bLastVisit || 0).getTime()
            }
            
            return sortOrders[sortBy] === 'asc' ? compareResult : -compareResult
        })

        return filtered
    }

    function editPatient(patient: any) {
        setEditingId(patient.id)
        
        const dobValue = patient.dob ? new Date(patient.dob).toISOString().slice(0, 10) : ''
        const ageValue = patient.age ? String(patient.age) : (dobValue ? calculateAge(dobValue) : '')
        
        const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
        
        const patientData = {
            fullName: fullName || '',
            phone: patient.phone || '',
            email: patient.email || '',
            dob: dobValue,
            date: patient.date ? new Date(patient.date).toISOString().slice(0, 10) : '',
            age: ageValue,
            address: patient.address || '',
            gender: patient.gender || '',
            imageUrl: patient.imageUrl || '',
            fatherHusbandGuardianName: patient.fatherHusbandGuardianName || '',
            doctorId: patient.doctorId ? patient.doctorId.toString() : (user?.role === 'doctor' ? user.id.toString() : ''),
            weight: patient.weight ? String(patient.weight) : '',
            height: patient.height ? String(patient.height) : ''
        }
        
        setImagePreview(patient.imageUrl || '')
        openModal(patientData)
    }

    // Inline validation state
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    async function submitPatient(e: any) {
        e.preventDefault();
        // Validate required fields
        const errors: { [key: string]: string } = {};
        if (!form.fullName.trim()) errors.fullName = 'Full Name is required';
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSubmitting(true);
        setShowLoadingModal(true);
        try {
            // Split fullName into firstName and lastName for API
            const nameParts = form.fullName.trim().split(/\s+/)
            const firstName = nameParts[0] || ''
            const lastName = nameParts.slice(1).join(' ') || ''
            
            // Create clean payload with only the necessary fields
            const payload: any = { 
                fullName: form.fullName,
                phone: form.phone,
                email: form.email,
                dob: form.dob,
                date: form.date,
                age: form.age,
                address: form.address,
                gender: form.gender,
                imageUrl: form.imageUrl,
                fatherHusbandGuardianName: form.fatherHusbandGuardianName,
                weight: form.weight,
                height: form.height,
                firstName,
                lastName,
                doctorId: form.doctorId ? parseInt(form.doctorId) : (user?.role === 'doctor' ? user.id : null)
            };
            // Remove fullName from payload as API expects firstName/lastName
            delete payload.fullName;
            
            // If email is blank, set to null so Prisma does not trigger unique constraint
            if (!payload.email || payload.email.trim() === '') {
                payload.email = null;
            }
            if (payload.age) payload.age = Number(payload.age);
            if (payload.weight) payload.weight = Number(payload.weight);
            if (payload.height) payload.height = Number(payload.height);

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
            
            // Hide loading modal and show success modal
            setShowLoadingModal(false);
            setSuccessMessage(editingId ? 'Patient updated successfully!' : 'Patient registered successfully!');
            setShowSuccessModal(true);
            
            // Close modal after showing success
            setTimeout(() => {
                closeModal();
                setShowSuccessModal(false);
                
                // Redirect back to requests page if coming from appointment request
                if (router.query.requestId) {
                    router.push('/requests');
                }
            }, 2000);
        } catch (err: any) {
            console.error(err);
            showError(err?.message || 'Failed to save patient');
            setShowLoadingModal(false);
        } finally {
            setSubmitting(false);
        }
    }

    async function deletePatient(id: number) {
        setConfirmModal({ open: true, id, message: 'Are you sure you want to delete this patient?' })
        // Set animating immediately to avoid a click-race where the overlay
        // could receive the same click that opened the modal and close it.
        setConfirmModalAnimating(true)
    }

    function closeConfirmModal() {
        setConfirmModalAnimating(false)
        setTimeout(() => setConfirmModal({ open: false }), 300)
    }

    async function handleConfirmDelete(id?: number) {
        if (!id && !confirmModal.deleteMultiple) {
            closeConfirmModal()
            return
        }
        
        // Add to deleting set for animation and close modal
        if (id) {
            setDeletingIds(prev => new Set(prev).add(id))
        }
        
        closeConfirmModal()
        
        // Show "Deleting..." text for 1.5 seconds so it's clearly visible
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        setDeleting(true)
        
        try {
            if (confirmModal.deleteMultiple) {
                // Add all selected IDs to deleting set
                setDeletingIds(new Set(selectedPatientIds))
                
                // Delete and wait for fade before updating list
                await new Promise(resolve => setTimeout(resolve, 100))
                
                // Delete multiple patients with progress tracking
                const idsArray = Array.from(selectedPatientIds)
                const total = idsArray.length
                setDeleteProgress({ current: 0, total })
                
                // Create task in global context
                const taskId = addTask({
                    type: 'patients',
                    operation: 'delete',
                    status: 'deleting',
                    progress: { current: 0, total }
                })
                setDeleteTaskId(taskId)
                
                // Delete in chunks for better progress tracking
                const CHUNK_SIZE = 100
                let completed = 0
                
                for (let i = 0; i < idsArray.length; i += CHUNK_SIZE) {
                    const chunk = idsArray.slice(i, i + CHUNK_SIZE)
                    const deletePromises = chunk.map(patientId =>
                        fetch('/api/patients', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: patientId })
                        })
                    )
                    await Promise.all(deletePromises)
                    
                    completed += chunk.length
                    setDeleteProgress({ current: completed, total })
                    
                    // Update task progress
                    updateTask(taskId, {
                        progress: { current: completed, total }
                    })
                }
                
                // Wait for fade animation
                await new Promise(resolve => setTimeout(resolve, 600))
                
                setPatients(await (await fetch('/api/patients')).json())
                setSelectedPatientIds(new Set())
                
                // Update task to success
                updateTask(taskId, {
                    status: 'success',
                    summary: { success: total, errors: 0 },
                    endTime: Date.now()
                })
                
                showSuccess(`Deleted ${total} patient(s) successfully`)
            } else {
                // Delete single patient
                const response = await fetch('/api/patients', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                })
                
                if (response.ok) {
                    // Wait for fade-out animation to complete
                    await new Promise(resolve => setTimeout(resolve, 600))
                    
                    setPatients(await (await fetch('/api/patients')).json())
                    showSuccess('Patient deleted successfully')
                } else {
                    const error = await response.json()
                    console.error('Delete failed:', error)
                    showError('Failed to delete patient')
                }
            }
        } catch (error) {
            console.error('Delete error:', error)
            
            // Update task to error if it exists
            if (deleteTaskId) {
                updateTask(deleteTaskId, {
                    status: 'error',
                    error: 'Failed to delete patient(s)',
                    endTime: Date.now()
                })
            }
            
            showError('Failed to delete patient(s)')
        } finally {
            setDeletingIds(new Set())
            setDeleting(false)
            setDeleteProgress({ current: 0, total: 0 })
            setDeleteTaskId(null)
            setIsDeleteMinimized(false)
        }
    }

    function exportData(format: 'csv' | 'json' | 'xlsx') {
        try {
            // Get selected patients or show error
            if (selectedPatientIds.size === 0) {
                showError('Please select at least one patient to export')
                return
            }

            const selectedPatients = patients.filter(p => selectedPatientIds.has(p.id))

            const dataToExport = selectedPatients.map(p => ({
                'firstName': p.firstName || '',
                'lastName': p.lastName || '',
                'phone': p.phone || '',
                'email': p.email || '',
                'date': p.date || '',
                'dob': p.dob || '',
                'age': p.age || '',
                'address': p.address || '',
                'gender': p.gender || '',
                'fatherHusbandGuardianName': p.fatherHusbandGuardianName || ''
            }))

            const timestamp = new Date().toISOString().split('T')[0]
            
            if (format === 'json') {
                const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `patients_${timestamp}.json`
                a.click()
                URL.revokeObjectURL(url)
            } else if (format === 'csv') {
                const headers = Object.keys(dataToExport[0] || {})
                const csvContent = [
                    headers.join(','),
                    ...dataToExport.map(row => 
                        headers.map(header => {
                            const value = row[header as keyof typeof row] || ''
                            // Escape quotes and wrap in quotes if contains comma or quote
                            return String(value).includes(',') || String(value).includes('"') 
                                ? `"${String(value).replace(/"/g, '""')}"` 
                                : value
                        }).join(',')
                    )
                ].join('\n')
                
                const blob = new Blob([csvContent], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `patients_${timestamp}.csv`
                a.click()
                URL.revokeObjectURL(url)
            } else if (format === 'xlsx') {
                const ws = XLSX.utils.json_to_sheet(dataToExport)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Patients')
                XLSX.writeFile(wb, `patients_${timestamp}.xlsx`)
            }
            
            showSuccess(`${selectedPatientIds.size} patient(s) exported as ${format.toUpperCase()}`)
            setShowExportDropdown(false)
        } catch (e) {
            console.error(e)
            showError('Failed to export patients')
        }
    }

    return (
        <div>
            {/* Camera Modal */}
            <CameraModal
                isOpen={showCamera}
                onClose={() => setShowCamera(false)}
                onCapture={handleCameraCapture}
                title="Capture Patient Photo"
            />
            
            {/* Progress Modal for Deleting - Minimizable */}
            {deleting && deleteProgress.total > 0 && !isDeleteMinimized && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="relative overflow-hidden rounded-2xl border border-red-200/30 dark:border-red-700/30 bg-gradient-to-br from-white via-red-50/30 to-orange-50/20 dark:from-gray-900 dark:via-red-950/20 dark:to-gray-900 shadow-2xl shadow-red-500/20 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 via-transparent to-orange-500/5 pointer-events-none"></div>
                        {/* Header with minimize button */}
                        <div className="relative flex items-center justify-between px-6 py-4 border-b border-red-200/30 dark:border-red-700/30">
                            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400">
                                Deleting Patients
                            </h3>
                            <button
                                onClick={() => setIsDeleteMinimized(true)}
                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Minimize"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="relative p-8">
                            <div className="text-center">
                                <div className="mb-6">
                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/40 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 animate-pulse">
                                        <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </div>
                                </div>
                                
                                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 mb-2">
                                    {deleteProgress.current} / {deleteProgress.total}
                                </div>
                                
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    {Math.round((deleteProgress.current / deleteProgress.total) * 100)}% Complete
                                </p>
                                
                                {/* Progress Bar */}
                                <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full h-5 overflow-hidden shadow-inner">
                                    <div 
                                        className="h-full bg-gradient-to-r from-red-500 via-red-600 to-orange-600 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-3 shadow-lg shadow-red-500/50"
                                        style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                                    >
                                        <span className="text-xs font-bold text-white drop-shadow-lg">
                                            {deleteProgress.current > 0 && `${Math.round((deleteProgress.current / deleteProgress.total) * 100)}%`}
                                        </span>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                                    Please wait, deleting patient {deleteProgress.current} of {deleteProgress.total}...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
                        Patient Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Register and manage patient records</p>
                </div>
                {user && (
                    <div className="flex gap-2 items-center">
                        <RefreshButton onRefresh={fetchPatients} />
                        {/* Hide import/export for receptionist */}
                        {user.role !== 'receptionist' && (
                        <>
                        <div className="relative">
                            <button 
                                onClick={() => setShowExportDropdown(!showExportDropdown)}
                                className="btn bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transition-all duration-200 flex items-center gap-2 shadow-lg shadow-green-200 dark:shadow-green-900/50"
                                title={selectedPatientIds.size > 0 ? `Export ${selectedPatientIds.size} patients` : 'Export All'}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                                <span className="font-semibold hidden sm:inline">{selectedPatientIds.size > 0 ? `Export (${selectedPatientIds.size})` : 'Export All'}</span>
                                <svg className="w-4 h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {showExportDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-green-200 dark:border-green-900 z-[9999] overflow-hidden">
                                    <button
                                        onClick={() => exportData('csv')}
                                        className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900 dark:hover:to-emerald-900 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                                    >
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="font-medium">CSV Format</span>
                                    </button>
                                    <button
                                        onClick={() => exportData('json')}
                                        className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900 dark:hover:to-emerald-900 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                                    >
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                        <span className="font-medium">JSON Format</span>
                                    </button>
                                    <button
                                        onClick={() => exportData('xlsx')}
                                        className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900 dark:hover:to-emerald-900 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300 rounded-b-lg"
                                    >
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <span className="font-medium">Excel Format</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => setShowImportModal(true)} 
                            className="btn bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200 dark:shadow-green-900/50 transition-all duration-200 flex items-center gap-2"
                            title="Import patients"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="font-semibold hidden sm:inline">Import</span>
                        </button>
                        </>
                        )}
                        <button onClick={openModal} className="btn btn-primary" title="Register new patient">
                            <svg className="w-4 h-4 inline sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden sm:inline">Register New Patient</span>
                        </button>
                    </div>
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
            <div className="rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-4 mb-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                <div className="relative">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="🔍 Search patients by name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full p-3 pl-10 border border-emerald-300 dark:border-emerald-700 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 focus:border-transparent"
                        />
                        <svg className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    
                    {/* Sort Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                            className="px-3 sm:px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-400 dark:hover:border-green-600 transition-all duration-200 flex items-center gap-2 font-medium text-sm shadow-sm hover:shadow-md"
                            title="Sort patients"
                        >
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                            <span className="hidden sm:inline">Sort</span>
                        </button>
                        {showSortDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-900">
                                    <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
                                        Sort By
                                    </p>
                                </div>
                                <div className="p-2">
                                    <button
                                        onClick={() => {
                                            setSortBy('name')
                                            setSortOrders({...sortOrders, name: sortOrders.name === 'asc' ? 'desc' : 'asc'})
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between gap-3 ${
                                            sortBy === 'name'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg className={`w-4 h-4 ${sortBy === 'name' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span className="font-medium">Name</span>
                                        </div>
                                        {sortBy === 'name' && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {sortOrders.name === 'asc' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                )}
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSortBy('date')
                                            setSortOrders({...sortOrders, date: sortOrders.date === 'asc' ? 'desc' : 'asc'})
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between gap-3 ${
                                            sortBy === 'date'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg className={`w-4 h-4 ${sortBy === 'date' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="font-medium">Registration Date</span>
                                        </div>
                                        {sortBy === 'date' && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {sortOrders.date === 'asc' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                )}
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSortBy('age')
                                            setSortOrders({...sortOrders, age: sortOrders.age === 'asc' ? 'desc' : 'asc'})
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between gap-3 ${
                                            sortBy === 'age'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg className={`w-4 h-4 ${sortBy === 'age' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                            </svg>
                                            <span className="font-medium">Age</span>
                                        </div>
                                        {sortBy === 'age' && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {sortOrders.age === 'asc' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                )}
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSortBy('gender')
                                            setSortOrders({...sortOrders, gender: sortOrders.gender === 'asc' ? 'desc' : 'asc'})
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between gap-3 ${
                                            sortBy === 'gender'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg className={`w-4 h-4 ${sortBy === 'gender' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                            <span className="font-medium">Gender</span>
                                        </div>
                                        {sortBy === 'gender' && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {sortOrders.gender === 'asc' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                )}
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSortBy('lastVisit')
                                            setSortOrders({...sortOrders, lastVisit: sortOrders.lastVisit === 'asc' ? 'desc' : 'asc'})
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between gap-3 ${
                                            sortBy === 'lastVisit'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg className={`w-4 h-4 ${sortBy === 'lastVisit' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium">Last Visit Date</span>
                                        </div>
                                        {sortBy === 'lastVisit' && (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {sortOrders.lastVisit === 'asc' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                )}
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
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
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={`fixed inset-0 bg-black transition-opacity duration-300 ${isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`} style={{ zIndex: 9999 }} onClick={!showSuccessModal && !showLoadingModal ? closeModal : undefined}>
                    <div className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-300 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ zIndex: 10000 }}>
                        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/20 backdrop-blur-sm max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                            {showLoadingModal ? (
                                // Loading State
                                <div className="relative p-12 text-center">
                                    <div className="w-20 h-20 mx-auto mb-6">
                                        <svg className="animate-spin h-20 w-20 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 mb-3">
                                        {editingId ? 'Updating Patient...' : 'Registering Patient...'}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400">Please wait while we process your request</p>
                                </div>
                            ) : showSuccessModal ? (
                                // Success State
                                <div className="relative p-12 text-center">
                                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in">
                                        <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 mb-3">Success!</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-lg">{successMessage}</p>
                                </div>
                            ) : (
                                // Form State
                                <>
                                    <div className="relative bg-gradient-to-r from-emerald-50 to-green-50 dark:from-gray-800 dark:to-gray-800 px-6 py-4 border-b border-emerald-200/30 dark:border-emerald-700/30">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">{editingId ? 'Edit Patient' : 'New Patient'}</h2>
                                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                                        <form onSubmit={submitPatient} className="space-y-5">
                                            {/* Photo Section - Minimalistic */}
                                            <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                                                {imagePreview ? (
                                                    <div className="relative group">
                                                        <img src={imagePreview} alt="Patient" className="w-20 h-20 object-cover rounded-full ring-2 ring-green-500" />
                                                        <button
                                                            type="button"
                                                            onClick={() => { setImagePreview(''); setForm({ ...form, imageUrl: '' }); }}
                                                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                                                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={startCamera} disabled={uploadingImage} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50">
                                                        📷 Camera
                                                    </button>
                                                    <label className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium cursor-pointer">
                                                        📁 Upload
                                                        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Personal Info - 2 Columns */}
                                            <div className={isGenderDropdownOpen ? 'relative z-[10000]' : 'relative z-0'}>
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Personal Information</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
                                                        <input required placeholder="John Doe" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                                                        {fieldErrors.fullName && <p className="text-xs text-red-600 mt-1">{fieldErrors.fullName}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date of Birth</label>
                                                        <DateInput type="date" placeholder="Select DOB" value={form.dob} onChange={e => handleDobChange(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Age</label>
                                                        <input placeholder="35" type="number" value={(form as any).age || ''} onChange={e => handleAgeChange(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gender</label>
                                                        <CustomSelect value={(form as any).gender || ''} onChange={(val) => setForm({ ...form, gender: val })} options={genderOptions} placeholder="Select gender" allowCustom={true} onOpenChange={setIsGenderDropdownOpen} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Guardian Name</label>
                                                        <input placeholder="Guardian Name" value={form.fatherHusbandGuardianName || ''} onChange={e => setForm({ ...form, fatherHusbandGuardianName: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Weight (kg)</label>
                                                        <input placeholder="70" type="number" step="0.1" value={form.weight || ''} onChange={e => setForm({ ...form, weight: e.target.value })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Height (cm)</label>
                                                        <input placeholder="170" type="number" step="0.1" value={form.height || ''} onChange={e => setForm({ ...form, height: e.target.value })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Doctor Assignment - Show for receptionist, doctor, and admin */}
                                            {user && (user.role === 'receptionist' || user.role === 'doctor' || user.role === 'admin') && (
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Doctor Assignment</h3>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                                Assigned Doctor {user.role === 'receptionist' && <span className="text-red-500">*</span>}
                                                            </label>
                                                            {user.role === 'doctor' ? (
                                                                <input
                                                                    type="text"
                                                                    value={user.name || 'Current Doctor'}
                                                                    disabled
                                                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 cursor-not-allowed text-sm"
                                                                />
                                                            ) : (
                                                                <CustomSelect
                                                                    value={form.doctorId}
                                                                    onChange={(val) => setForm({ ...form, doctorId: val })}
                                                                    options={[
                                                                        { value: '', label: 'Select doctor' },
                                                                        ...doctors.map(d => ({
                                                                            value: d.id.toString(),
                                                                            label: d.name || d.email
                                                                        }))
                                                                    ]}
                                                                    placeholder={doctorsLoading ? 'Loading doctors...' : 'Select doctor'}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Contact Info - 2 Columns */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Contact Information</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
                                                        <input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                                                        <input type="email" placeholder="john.doe@example.com" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value.toUpperCase() }); setFieldErrors(prev => ({ ...prev, email: '' })); }} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                                                        {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
                                                        <input placeholder="123 Main St, City" value={(form as any).address || ''} onChange={e => setForm({ ...form, address: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm" />
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                    
                                    <div className="relative bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-gray-800 dark:to-gray-800 px-6 py-4 flex justify-end gap-3">
                                        <button type="button" onClick={closeModal} disabled={submitting} className="px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={submitting} onClick={submitPatient} className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-105 disabled:opacity-50">
                                            {submitting ? 'Saving...' : (editingId ? 'Update Patient' : 'Register Patient')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmModal.open && (
                <div className={`fixed inset-0 bg-black flex items-center justify-center p-4 transition-opacity duration-300 ${confirmModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`} style={{ zIndex: 9999 }} onClick={!deleting ? closeConfirmModal : undefined}>
                    <div className={`relative overflow-hidden rounded-2xl border border-red-200/30 dark:border-red-700/30 bg-gradient-to-br from-white via-red-50/30 to-orange-50/20 dark:from-gray-900 dark:via-red-950/20 dark:to-gray-900 shadow-lg shadow-red-500/20 backdrop-blur-sm max-w-lg w-full transform transition-all duration-300 ${confirmModalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ zIndex: 10000 }} onClick={e => e.stopPropagation()}>
                        <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 via-transparent to-orange-500/5 pointer-events-none"></div>
                        <div className="relative p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400">Confirm Delete</h3>
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
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors font-medium shadow-md"
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

            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/20 backdrop-blur-sm max-w-3xl w-full" style={{ zIndex: 10000 }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                        <div className="relative p-4 border-b border-emerald-200/30 dark:border-emerald-700/30 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">Take Patient Photo</h3>
                            <button
                                onClick={stopCamera}
                                disabled={uploadingImage}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="relative p-4">
                            <div className="relative bg-black rounded-lg overflow-hidden" style={{ maxHeight: '60vh' }}>
                                <video 
                                    id="camera-video" 
                                    autoPlay 
                                    playsInline
                                    className="w-full h-full object-contain"
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                            </div>
                            <div className="flex justify-center gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    disabled={uploadingImage}
                                    className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    disabled={uploadingImage}
                                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors font-medium shadow-lg shadow-emerald-500/30"
                                >
                                    {uploadingImage ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Capture Photo
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toasts */}
            <ToastNotification toasts={toasts} removeToast={removeToast} />

            {/* Floating Export Button */}
            {selectedPatientIds.size > 0 && (
                <div className="relative">
                    <button
                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                        className="fixed bottom-8 right-40 z-50 group"
                        title={`Export ${selectedPatientIds.size} selected patient(s)`}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-200"></div>
                            <div className="relative w-14 h-14 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 transform group-hover:scale-110">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                                <span className="absolute -top-1 -right-1 min-w-[24px] h-5 px-1.5 bg-green-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
                                    {selectedPatientIds.size}
                                </span>
                            </div>
                        </div>
                    </button>
                    {showExportDropdown && (
                        <div className="fixed bottom-24 right-40 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-green-200 dark:border-green-900 z-50 overflow-hidden">
                            <button
                                onClick={() => exportData('csv')}
                                className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900 dark:hover:to-emerald-900 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="font-medium">CSV Format</span>
                            </button>
                            <button
                                onClick={() => exportData('json')}
                                className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900 dark:hover:to-emerald-900 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                            >
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                <span className="font-medium">JSON Format</span>
                            </button>
                            <button
                                onClick={() => exportData('xlsx')}
                                className="w-full text-left px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900 dark:hover:to-emerald-900 transition-all duration-150 flex items-center gap-2 text-gray-700 dark:text-gray-300 rounded-b-lg"
                            >
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">Excel Format</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Delete Selected Button */}
            {selectedPatientIds.size > 0 && (
                <button
                    onClick={() => {
                        setConfirmModal({ open: true, deleteMultiple: true, message: `Are you sure you want to delete ${selectedPatientIds.size} selected patient(s)?` })
                        // trigger animation immediately to avoid click/overlay race
                        setConfirmModalAnimating(true)
                    }}
                    className="fixed bottom-8 right-24 z-50 group"
                    title={`Delete ${selectedPatientIds.size} selected patient(s)`}
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-200 animate-pulse"></div>
                        <div className="relative w-14 h-14 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 transform group-hover:scale-110">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="absolute -top-1 -right-1 min-w-[24px] h-5 px-1.5 bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
                                {selectedPatientIds.size}
                            </span>
                        </div>
                    </div>
                </button>
            )}

            {/* Patients List */}
            <div className="relative rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                <div className="relative">
                <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-3">
                        <label className="relative group/checkbox cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={getFilteredAndSortedPatients().length > 0 && selectedPatientIds.size === getFilteredAndSortedPatients().length}
                                onChange={toggleSelectAll}
                                className="peer sr-only"
                            />
                            <div className="w-6 h-6 border-2 border-green-400 dark:border-green-600 rounded-md bg-white dark:bg-gray-700 peer-checked:bg-gradient-to-br peer-checked:from-green-500 peer-checked:to-emerald-600 peer-checked:border-green-500 transition-all duration-200 flex items-center justify-center shadow-sm peer-checked:shadow-lg peer-checked:shadow-green-500/50 group-hover/checkbox:border-green-500 group-hover/checkbox:scale-110">
                                <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="absolute inset-0 rounded-md bg-green-400 opacity-0 peer-checked:opacity-20 blur-md transition-opacity duration-200 pointer-events-none"></div>
                        </label>
                        <span className="font-bold text-gray-900 dark:text-gray-100">Patient Records {selectedPatientIds.size > 0 && <span className="px-2 py-0.5 ml-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">({selectedPatientIds.size} selected)</span>}</span>
                    </span>
                    <span className="badge">{getFilteredAndSortedPatients().length} patients</span>
                </h3>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                        <p className="text-muted">Loading patients...</p>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="text-center py-12 text-muted">
                        <p className="text-lg mb-2">No patients registered yet</p>
                        <p className="text-sm">Click "Register New Patient" to get started</p>
                    </div>
                ) : getFilteredAndSortedPatients().length === 0 ? (
                    <div className="text-center py-12 text-muted">
                        <p className="text-lg mb-2">No patients found</p>
                        <p className="text-sm">Try a different search term</p>
                    </div>
                ) : (
                    <>
                    <div className="space-y-2">
                        {getFilteredAndSortedPatients()
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map(p => {
                            const isExpanded = expandedRows.has(p.id)
                            const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim()
                            const isDeleting = deletingIds.has(p.id)
                            
                            return (
                                <div key={p.id} className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${isDeleting ? 'transition-all duration-700 ease-in-out opacity-0 -translate-x-full scale-95' : 'transition-all duration-300'} ${selectedPatientIds.has(p.id) ? 'ring-2 ring-green-500 shadow-xl shadow-green-100 dark:shadow-green-900/30 bg-gradient-to-r from-green-50/30 to-emerald-50/30 dark:from-gray-800 dark:to-gray-800' : ''}`}>
                                    {isDeleting ? (
                                        <div className="bg-red-50 dark:bg-red-950/30 p-12 flex items-center justify-center animate-pulse">
                                            <div className="text-red-600 dark:text-red-400 text-2xl font-bold">
                                                Deleting...
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                    {/* Summary Row */}
                                    <div className="bg-gray-50 dark:bg-gray-800 p-3 flex items-center gap-3">
                                        {/* Checkbox */}
                                        <div className="flex-shrink-0">
                                            <label className="relative group/checkbox cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPatientIds.has(p.id)}
                                                    onChange={() => togglePatientSelection(p.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-6 h-6 border-2 border-green-400 dark:border-green-600 rounded-md bg-white dark:bg-gray-700 peer-checked:bg-gradient-to-br peer-checked:from-green-500 peer-checked:to-emerald-600 peer-checked:border-green-500 transition-all duration-200 flex items-center justify-center shadow-sm peer-checked:shadow-lg peer-checked:shadow-green-500/50 group-hover/checkbox:border-green-500 group-hover/checkbox:scale-110">
                                                    <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <div className="absolute inset-0 rounded-md bg-green-400 opacity-0 peer-checked:opacity-20 blur-md transition-opacity duration-200 pointer-events-none"></div>
                                            </label>
                                        </div>
                                        
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
                                            <div className="flex items-center gap-2">
                                                <div className="font-semibold text-sm">{fullName || 'Unknown Patient'}</div>
                                                {(() => {
                                                    if (!p.createdAt) return null
                                                    const createdDate = new Date(p.createdAt).toDateString()
                                                    const today = new Date().toDateString()
                                                    if (createdDate === today) {
                                                        return (
                                                            <span className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs rounded-full font-bold shadow-md">
                                                                NEW
                                                            </span>
                                                        )
                                                    }
                                                })()}
                                            </div>
                                            <div className="text-xs text-muted mt-0.5">
                                                {p.phone && <PhoneNumber phone={p.phone} className="mr-2" />}
                                                {p.age && <span>Age: {p.age}</span>}
                                            </div>
                                            {/* Display Doctor Name */}
                                            {p.doctor && (
                                                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <span>{p.doctor.name || p.doctor.email}</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => editPatient(p)}
                                                className="px-2 sm:px-3 py-1.5 text-xs bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded"
                                                title="Edit"
                                            >
                                                <span className="sm:hidden">
                                                    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </span>
                                                <span className="hidden sm:inline">
                                                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Edit
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => deletePatient(p.id)}
                                                className="px-2 sm:px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                                                title="Delete"
                                            >
                                                <span className="sm:hidden">
                                                    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </span>
                                                <span className="hidden sm:inline">
                                                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Delete
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => toggleRowExpansion(p.id)}
                                                className="px-2 sm:px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                                                title={isExpanded ? "Hide Details" : "View More"}
                                            >
                                                <span className="sm:hidden">
                                                    <svg className={`w-4 h-4 inline transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </span>
                                                <span className="hidden sm:inline">
                                                    <svg className={`w-4 h-4 inline mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                    {isExpanded ? 'Hide' : 'View More'}
                                                </span>
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
                                                    <div className="col-span-2 md:col-span-1">
                                                        <div className="text-xs text-muted mb-1">Full Name</div>
                                                        <div className="text-sm font-medium">{`${p.firstName || ''} ${p.lastName || ''}`.trim() || '-'}</div>
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
                                                        <div className="text-xs text-muted mb-1">Weight (kg)</div>
                                                        <div className="text-sm font-medium">{p.weight || '-'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Height (cm)</div>
                                                        <div className="text-sm font-medium">{p.height || '-'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Father/Husband/Guardian</div>
                                                        <div className="text-sm font-medium">{p.fatherHusbandGuardianName || '-'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Doctor</div>
                                                        <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                                            {p.doctor ? `${p.doctor.name || p.doctor.email}` : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Contact Info */}
                                            <div>
                                                <div className="text-sm font-semibold mb-2">Contact Information</div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    <div>
                                                        <div className="text-xs text-muted mb-1">Phone</div>
                                                        <div className="text-sm font-medium">{p.phone ? <PhoneNumber phone={p.phone} /> : '-'}</div>
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
                                        </div>
                                    )}
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {(() => {
                        const filteredPatients = getFilteredAndSortedPatients()
                        const totalPages = Math.ceil(filteredPatients.length / itemsPerPage)
                        
                        if (totalPages <= 1) return null
                        
                        return (
                            <div className="flex items-center justify-between mt-4 px-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span className="hidden sm:inline">Previous</span>
                                </button>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )
                    })()}
                    </>
                )}
            </div>

            <ImportPatientsModal 
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportSuccess={() => {
                    fetch('/api/patients')
                        .then(r => r.json())
                        .then(data => setPatients(data))
                    showSuccess('Patients imported successfully!')
                }}
            />
            </div>
        </div>
    )
}
