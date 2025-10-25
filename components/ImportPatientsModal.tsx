import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

interface ImportPatientsModalProps {
    isOpen: boolean
    onClose: () => void
    onImportSuccess: () => void
}

interface PatientRow {
    firstName: string
    lastName: string
    phone?: string
    email?: string
    opdNo?: string
    date?: string
    dob?: string
    age?: number
    address?: string
    gender?: string
    occupation?: string
    pendingPaymentCents?: number
    height?: number
    weight?: number
    fatherHusbandGuardianName?: string
}

export default function ImportPatientsModal({ isOpen, onClose, onImportSuccess }: ImportPatientsModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<PatientRow[]>([])
    const [previewData, setPreviewData] = useState<any[]>([])
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState<string>('')
    const [step, setStep] = useState<'select' | 'preview' | 'importing' | 'success'>('select')
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
    const [importSummary, setImportSummary] = useState({ success: 0, errors: 0 })
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        const validTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json'
        ]

        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx|xls|json)$/i)) {
            setError('Invalid file type. Please upload CSV, XLSX, XLS, or JSON file.')
            return
        }

        setFile(selectedFile)
        setError('')
        parseFile(selectedFile)
    }

    const parseFile = async (file: File) => {
        try {
            if (file.name.endsWith('.json')) {
                const text = await file.text()
                const json = JSON.parse(text)
                processData(Array.isArray(json) ? json : [json])
            } else {
                const data = await file.arrayBuffer()
                const workbook = XLSX.read(data)
                const worksheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(worksheet)
                processData(jsonData)
            }
        } catch (err: any) {
            setError(`Failed to parse file: ${err.message}`)
        }
    }

    const processData = (data: any[]) => {
        if (!data || data.length === 0) {
            setError('No data found in file')
            return
        }

        const patients: PatientRow[] = data.map((row: any) => ({
            firstName: String(row.firstName || row.FirstName || '').trim(),
            lastName: String(row.lastName || row.LastName || '').trim(),
            phone: row.phone || row.Phone || undefined,
            email: row.email || row.Email || undefined,
            opdNo: row.opdNo || row.OPDNo || undefined,
            date: row.date || row.Date || undefined,
            dob: row.dob || row.DOB || row.dateOfBirth || undefined,
            age: row.age || row.Age ? parseInt(row.age || row.Age) : undefined,
            address: row.address || row.Address || undefined,
            gender: row.gender || row.Gender || undefined,
            occupation: row.occupation || row.Occupation || undefined,
            pendingPaymentCents: row.pendingPaymentCents || row.pendingPayment ? 
                Math.round((parseFloat(row.pendingPaymentCents || row.pendingPayment) || 0) * 100) : 0,
            height: row.height || row.Height ? parseFloat(row.height || row.Height) : undefined,
            weight: row.weight || row.Weight ? parseFloat(row.weight || row.Weight) : undefined,
            fatherHusbandGuardianName: row.fatherHusbandGuardianName || row.guardianName || undefined,
        }))

        // Validate required fields
        const errors: string[] = []
        patients.forEach((p, index) => {
            if (!p.firstName) errors.push(`Row ${index + 1}: Missing firstName`)
            if (!p.lastName) errors.push(`Row ${index + 1}: Missing lastName`)
        })

        if (errors.length > 0) {
            setError(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''))
            return
        }

        setParsedData(patients)
        setPreviewData(patients.slice(0, 10))
        setStep('preview')
    }

    const handleImport = async () => {
        setImporting(true)
        setError('')
        setStep('importing')

        try {
            const totalPatients = parsedData.length
            setImportProgress({ current: 0, total: totalPatients })

            // Split into chunks
            const CHUNK_SIZE = 50
            const chunks = []
            for (let i = 0; i < parsedData.length; i += CHUNK_SIZE) {
                chunks.push(parsedData.slice(i, i + CHUNK_SIZE))
            }

            let successCount = 0
            const allErrors: any[] = []

            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex]
                
                const response = await fetch('/api/patients/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ patients: chunk })
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(`Failed to import patients: ${error.error || 'Unknown error'}`)
                }

                const result = await response.json()
                
                if (result.errors && result.errors.length > 0) {
                    allErrors.push(...result.errors)
                }
                
                successCount += result.count || 0
                setImportProgress({ current: (chunkIndex + 1) * CHUNK_SIZE, total: totalPatients })
            }

            if (allErrors.length > 0 && successCount === 0) {
                throw new Error(`Import failed: ${allErrors[0]?.error || 'Unknown error'}`)
            }

            setImportSummary({ success: successCount, errors: allErrors.length })
            setStep('success')
            setImporting(false)
            
            setTimeout(() => {
                onImportSuccess()
                handleClose()
            }, 2000)
        } catch (err: any) {
            setError(err.message)
            setImporting(false)
            setStep('select')
        }
    }

    const handleClose = () => {
        setFile(null)
        setParsedData([])
        setPreviewData([])
        setError('')
        setStep('select')
        setImportProgress({ current: 0, total: 0 })
        setImportSummary({ success: 0, errors: 0 })
        if (fileInputRef.current) fileInputRef.current.value = ''
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Import Patients</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {step === 'select' && (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls,.json"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="patient-file-input"
                                />
                                <label
                                    htmlFor="patient-file-input"
                                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Choose File
                                </label>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 Template Information</h4>
                                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• Required: <strong>firstName</strong>, <strong>lastName</strong></li>
                                    <li>• Optional: phone, email, opdNo, dob, age, gender, address, etc.</li>
                                    <li>• Each row = 1 patient</li>
                                    <li>• Download template: <a href="/templates/patients_import_template.csv" download className="underline hover:text-blue-600">CSV Template</a></li>
                                </ul>
                            </div>

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <p className="text-red-800 dark:text-red-200 text-sm whitespace-pre-line">{error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <p className="text-green-800 dark:text-green-200">
                                    ✓ Found <strong>{parsedData.length}</strong> patients to import
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">First Name</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Last Name</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Phone</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {previewData.map((p, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2 text-sm">{p.firstName}</td>
                                                <td className="px-4 py-2 text-sm">{p.lastName}</td>
                                                <td className="px-4 py-2 text-sm">{p.phone || '-'}</td>
                                                <td className="px-4 py-2 text-sm">{p.email || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('select')}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Import {parsedData.length} Patients
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-lg font-semibold">Importing patients...</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    {importProgress.current} / {importProgress.total}
                                </p>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">Import Successful!</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Successfully imported <strong>{importSummary.success}</strong> patients
                                {importSummary.errors > 0 && ` (${importSummary.errors} errors)`}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
