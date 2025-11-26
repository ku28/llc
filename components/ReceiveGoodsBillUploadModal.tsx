import { useState, useRef } from 'react'

interface ReceiveGoodsBillUploadModalProps {
    isOpen: boolean
    onClose: () => void
    onDataExtracted: (data: any[], billUrl?: string) => void
}

export default function ReceiveGoodsBillUploadModal({ isOpen, onClose, onDataExtracted }: ReceiveGoodsBillUploadModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string>('')
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    const [animating, setAnimating] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const openModal = () => {
        setAnimating(true)
    }

    const closeModal = () => {
        setAnimating(false)
        setTimeout(() => {
            onClose()
            setFile(null)
            setPreview('')
            setError('')
        }, 300)
    }

    // Trigger animation on mount
    if (isOpen && !animating) {
        setTimeout(openModal, 10)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please upload a PDF or image file (JPG, PNG, WebP)')
            return
        }

        setFile(selectedFile)
        setError('')

        // Create preview for images
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (e) => setPreview(e.target?.result as string)
            reader.readAsDataURL(selectedFile)
        } else {
            setPreview('')
        }
    }

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file')
            return
        }

        setUploading(true)
        setError('')

        try {
            const formData = new FormData()
            formData.append('file', file)

            // Process bill and save the file
            const response = await fetch('/api/process-bill', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error('Failed to process bill')
            }

            const data = await response.json()
            
            // Extract data and bill URL from response
            const extractedData = data.items || []
            const billUrl = data.billUrl || null
            
            onDataExtracted(extractedData, billUrl)
            closeModal()
        } catch (err: any) {
            setError(err.message || 'Failed to process bill. Please enter data manually.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div 
            className={`fixed inset-0 bg-black flex items-center justify-center p-4 transition-opacity duration-300 ${animating ? 'bg-opacity-50' : 'bg-opacity-0'}`} 
            style={{ zIndex: 10000 }}
            onClick={closeModal}
        >
            <div 
                className={`relative overflow-hidden rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/20 backdrop-blur-sm max-w-xl w-full transform transition-all duration-300 ${animating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                
                <div className="relative p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
                            Upload Bill/Invoice
                        </h2>
                        <button
                            onClick={closeModal}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mb-6">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Upload a bill or invoice (PDF/Image) to automatically extract product details
                        </p>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-8 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                        >
                            <div className="flex flex-col items-center gap-3">
                                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <div className="text-center">
                                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                        {file ? file.name : 'Click to upload or drag and drop'}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        PDF, JPG, PNG, WebP (Max 10MB)
                                    </p>
                                </div>
                            </div>
                        </button>

                        {preview && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
                                <img src={preview} alt="Bill preview" className="max-h-64 mx-auto rounded-lg border border-gray-300 dark:border-gray-600" />
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={closeModal}
                            disabled={uploading}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg font-medium transition-colors shadow-md"
                        >
                            {uploading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                'Process & Extract Data'
                            )}
                        </button>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Note:</strong> AI-powered bill extraction is in beta. Please verify the extracted data before confirming.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
