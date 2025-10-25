import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import EditLayout from '../components/EditLayout'
import ConfirmModal from '../components/ConfirmModal'
import StatusModal from '../components/StatusModal'

interface ServiceCard {
    image: string
    name: string
    tagline: string
    info: string
    description: string
}

export default function EditServicesPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [services, setServices] = useState<ServiceCard[]>([])
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
    
    // Status modal states
    const [statusModal, setStatusModal] = useState({
        isOpen: false,
        status: 'loading' as 'loading' | 'success' | 'error',
        message: ''
    })

    useEffect(() => {
        // Show loading modal immediately
        setStatusModal({ isOpen: true, status: 'loading', message: 'Loading services...' })
        
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(d => {
                if (!d.user || d.user.role !== 'admin') {
                    setStatusModal({ isOpen: false, status: 'loading', message: '' })
                    router.push('/')
                    return
                }
                setUser(d.user)
                loadServices()
            })
            .catch(() => {
                setStatusModal({ isOpen: false, status: 'loading', message: '' })
                router.push('/')
            })
    }, [])

    const loadServices = async () => {
        try {
            const res = await fetch('/api/services-content')
            if (res.ok) {
                const data = await res.json()
                setServices(data)
                setStatusModal({ isOpen: false, status: 'loading', message: '' })
            } else {
                throw new Error('Failed to load services')
            }
            setLoading(false)
        } catch (error) {
            console.error('Error loading services:', error)
            setStatusModal({ 
                isOpen: true, 
                status: 'error', 
                message: 'Failed to load services. Please refresh the page.' 
            })
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setStatusModal({ isOpen: true, status: 'loading', message: 'Saving services...' })
        try {
            const res = await fetch('/api/services-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: services })
            })

            if (res.ok) {
                setStatusModal({ 
                    isOpen: true, 
                    status: 'success', 
                    message: 'Services saved successfully!' 
                })
            } else {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to save services')
            }
        } catch (error: any) {
            console.error('Save error:', error)
            setStatusModal({ 
                isOpen: true, 
                status: 'error', 
                message: error.message || 'Failed to save services. Please try again.' 
            })
        }
    }

    const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setStatusModal({ isOpen: true, status: 'loading', message: 'Uploading image...' })
        try {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = async () => {
                const base64 = reader.result as string

                const res = await fetch('/api/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64, folder: 'services' })
                })

                const data = await res.json()
                if (data.url) {
                    const updated = [...services]
                    updated[index].image = data.url
                    setServices(updated)
                    setStatusModal({ 
                        isOpen: true, 
                        status: 'success', 
                        message: 'Image uploaded successfully!' 
                    })
                } else {
                    throw new Error(data.error || 'Upload failed')
                }
            }
        } catch (error: any) {
            console.error('Upload error:', error)
            setStatusModal({ 
                isOpen: true, 
                status: 'error', 
                message: error.message || 'Failed to upload image. Please try again.' 
            })
        }
    }

    const addService = () => {
        setServices([...services, {
            image: '',
            name: '',
            tagline: '',
            info: '',
            description: ''
        }])
    }

    const deleteService = (index: number) => {
        setDeleteIndex(index)
        setShowDeleteConfirm(true)
    }

    const confirmDelete = () => {
        if (deleteIndex !== null) {
            setServices(services.filter((_, i) => i !== deleteIndex))
        }
        setShowDeleteConfirm(false)
        setDeleteIndex(null)
    }

    const updateService = (index: number, field: keyof ServiceCard, value: string) => {
        const updated = [...services]
        updated[index][field] = value
        setServices(updated)
    }

    return (
        <EditLayout>
            <div className="max-w-6xl mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Edit Services</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage service cards that appear on the Services page. Numbers are auto-calculated.</p>
                </div>

                <div className="space-y-6">
                    {services.map((service, index) => (
                        <div key={index} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-green-600">Service #{index + 1}</h3>
                                <button
                                    onClick={() => deleteService(index)}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete service"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Service Image</label>
                                        {service.image ? (
                                            <div className="relative group">
                                                <img src={service.image} alt="Service" className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600" />
                                                <button
                                                    onClick={() => {
                                                        const input = document.createElement('input')
                                                        input.type = 'file'
                                                        input.accept = 'image/*'
                                                        input.onchange = (e: any) => handleImageUpload(index, e)
                                                        input.click()
                                                    }}
                                                    className="absolute top-2 right-2 p-2 bg-blue-600 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-blue-700 transition-all"
                                                    title="Change image"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-green-500 transition-all bg-gray-50 dark:bg-gray-800/50">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(index, e)}
                                                    className="hidden"
                                                />
                                                <div className="text-center">
                                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                        Upload image
                                                    </p>
                                                </div>
                                            </label>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Service Name</label>
                                        <input
                                            type="text"
                                            value={service.name}
                                            onChange={(e) => updateService(index, 'name', e.target.value)}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="e.g., Trigeminal Neuralgia Treatment"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Tagline</label>
                                        <input
                                            type="text"
                                            value={service.tagline}
                                            onChange={(e) => updateService(index, 'tagline', e.target.value)}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="e.g., No more shocks to bear"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Info/Source</label>
                                        <input
                                            type="text"
                                            value={service.info}
                                            onChange={(e) => updateService(index, 'info', e.target.value)}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="e.g., As indicated by..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Description</label>
                                        <textarea
                                            value={service.description}
                                            onChange={(e) => updateService(index, 'description', e.target.value)}
                                            rows={10}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                            placeholder="Enter detailed description..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={addService}
                        className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-500 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Service
                    </button>

                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            onClick={() => router.push('/services')}
                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Preview
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

            <StatusModal
                isOpen={statusModal.isOpen}
                status={statusModal.status}
                message={statusModal.message}
                onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
            />
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Service"
                message="Are you sure you want to delete this service? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </EditLayout>
    )
}
