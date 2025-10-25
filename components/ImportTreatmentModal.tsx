import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

interface ImportTreatmentModalProps {
    isOpen: boolean
    onClose: () => void
    onImportSuccess: () => void
}

interface TreatmentRow {
    planNumber: string
    provDiagnosis?: string
    speciality?: string
    organ?: string
    diseaseAction?: string
    treatmentPlan?: string
    administration?: string
    notes?: string
    productName: string
    comp1?: string
    comp2?: string
    comp3?: string
    timing?: string
    dosage?: string
    additions?: string
    procedure?: string
    presentation?: string
}

export default function ImportTreatmentModal({ isOpen, onClose, onImportSuccess }: ImportTreatmentModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<TreatmentRow[]>([])
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

        const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
        if (!['csv', 'xlsx', 'xls', 'json'].includes(fileExtension || '')) {
            setError('Please select a CSV, XLSX, or JSON file')
            return
        }

        setFile(selectedFile)
        setError('')
        parseFile(selectedFile)
    }

    const parseFile = async (file: File) => {
        try {
            const fileExtension = file.name.split('.').pop()?.toLowerCase()

            if (fileExtension === 'json') {
                const text = await file.text()
                const data = JSON.parse(text)
                processData(Array.isArray(data) ? data : [data])
            } else if (fileExtension === 'csv') {
                const text = await file.text()
                const workbook = XLSX.read(text, { type: 'string' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const data = XLSX.utils.sheet_to_json(worksheet)
                processData(data)
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                const arrayBuffer = await file.arrayBuffer()
                const workbook = XLSX.read(arrayBuffer, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const data = XLSX.utils.sheet_to_json(worksheet)
                processData(data)
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

        // Validate and transform data
        const treatments: TreatmentRow[] = data.map((row: any) => ({
            planNumber: String(row.planNumber || '').trim(),
            provDiagnosis: row.provDiagnosis || undefined,
            speciality: row.speciality || undefined,
            organ: row.organ || undefined,
            diseaseAction: row.diseaseAction || undefined,
            treatmentPlan: row.treatmentPlan || undefined,
            administration: row.administration || undefined,
            notes: row.notes || undefined,
            productName: row.productName || row.ProductName || undefined,
            comp1: row.comp1 || undefined,
            comp2: row.comp2 || undefined,
            comp3: row.comp3 || undefined,
            timing: row.timing || undefined,
            dosage: row.dosage || undefined,
            additions: row.additions || undefined,
            procedure: row.procedure || undefined,
            presentation: row.presentation || undefined,
        }))

        // Validate required fields
        const errors: string[] = []
        
        treatments.forEach((t, index) => {
            if (!t.planNumber) errors.push(`Row ${index + 1}: Missing planNumber`)
        })

        if (errors.length > 0) {
            setError(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''))
            return
        }

        // Show info about unique products
        const uniqueProductNames = new Set(treatments.map(t => t.productName))
        console.log(`Found ${uniqueProductNames.size} unique product names in ${treatments.length} rows`)

        setParsedData(treatments)
        setPreviewData(treatments.slice(0, 10)) // Show first 10 rows
        setStep('preview')
    }

    const handleImport = async () => {
        setImporting(true)
        setError('')
        setStep('importing')

        try {
            // Each row is a separate treatment plan
            const totalPlans = parsedData.length
            setImportProgress({ current: 0, total: totalPlans })

            // Prepare all treatments data - each row becomes one treatment with one product
            const treatmentsToCreate = parsedData.map(row => ({
                planNumber: row.planNumber,
                provDiagnosis: row.provDiagnosis,
                speciality: row.speciality,
                organ: row.organ,
                diseaseAction: row.diseaseAction,
                treatmentPlan: row.treatmentPlan,
                administration: row.administration,
                notes: row.notes,
                products: row.productName ? [{
                    productName: row.productName,
                    comp1: row.comp1,
                    comp2: row.comp2,
                    comp3: row.comp3,
                    timing: row.timing,
                    dosage: row.dosage,
                    additions: row.additions,
                    procedure: row.procedure,
                    presentation: row.presentation,
                }] : [] // Empty products array if no productName
            }))

            // Split into chunks for better progress tracking and avoid timeouts
            const CHUNK_SIZE = 50
            const chunks = []
            for (let i = 0; i < treatmentsToCreate.length; i += CHUNK_SIZE) {
                chunks.push(treatmentsToCreate.slice(i, i + CHUNK_SIZE))
            }

            let completedCount = 0
            const allErrors: any[] = []
            let successCount = 0

            // Send chunks one by one
            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                const chunk = chunks[chunkIndex]
                
                console.log(`Importing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} treatments`)
                
                const response = await fetch('/api/treatments/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ treatments: chunk })
                })

                if (!response.ok) {
                    const error = await response.json()
                    console.error('Import error:', error)
                    throw new Error(`Failed to import treatments: ${error.error || 'Unknown error'}`)
                }

                const result = await response.json()
                console.log(`Chunk ${chunkIndex + 1} result:`, result)
                
                // Track any errors from this chunk
                if (result.errors && result.errors.length > 0) {
                    allErrors.push(...result.errors)
                }
                
                successCount += result.count || 0

                completedCount += chunk.length
                setImportProgress({ current: completedCount, total: totalPlans })
            }

            console.log(`Import completed: ${successCount} successful, ${allErrors.length} errors`)

            // Show warning if there were errors
            if (allErrors.length > 0) {
                const errorMsg = `Warning: ${allErrors.length} treatments failed to import. ${successCount} were successful.\n\nFirst few errors:\n${allErrors.slice(0, 3).map((e: any) => `Plan ${e.planNumber}: ${e.error}`).join('\n')}`
                console.error(errorMsg)
                
                // If all failed, show error instead of success
                if (successCount === 0) {
                    throw new Error(errorMsg)
                }
                
                // Partial success - show warning but continue to success screen
                setError(errorMsg)
            }

            // Show success message
            console.log(`Successfully imported ${successCount} treatment plans`)
            
            setImportSummary({ success: successCount, errors: allErrors.length })
            setStep('success')
            setTimeout(() => {
                onImportSuccess()
                handleClose()
            }, 2000)
        } catch (err: any) {
            setError(`Import failed: ${err.message}`)
            setStep('preview')
        } finally {
            setImporting(false)
        }
    }

    const handleClose = () => {
        setFile(null)
        setParsedData([])
        setPreviewData([])
        setError('')
        setStep('select')
        setImporting(false)
        setImportProgress({ current: 0, total: 0 })
        setImportSummary({ success: 0, errors: 0 })
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Treatment Plans</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={importing}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'select' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="mb-4">
                                    <svg className="w-16 h-16 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Select File to Import</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Supported formats: CSV, XLSX, JSON
                                </p>
                                
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls,.json"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-input"
                                />
                                <label
                                    htmlFor="file-input"
                                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Choose File
                                </label>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 Template Information</h4>
                                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• Required: <strong>planNumber</strong></li>
                                    <li>• <strong>productName</strong> is optional - leave blank to skip products</li>
                                    <li>• Product IDs are automatically matched or created</li>
                                    <li>• Each row = 1 treatment plan with 1 product</li>
                                    <li>• Plan numbers are per diagnosis (Fever Plan 1, Cold Plan 1, etc.)</li>
                                    <li>• Download template: <a href="/templates/treatment_plans_import_template.csv" download className="underline hover:text-blue-600">CSV Template</a></li>
                                    <li>• <a href="/templates/TREATMENT_IMPORT_INSTRUCTIONS.md" target="_blank" className="underline hover:text-blue-600">View Full Instructions</a></li>
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
                                    ✓ Found <strong>{parsedData.length}</strong> rows to import
                                </p>
                                <p className="text-green-800 dark:text-green-200 mt-1">
                                    → Will create <strong>{Array.from(new Set(parsedData.map(t => t.planNumber))).length}</strong> unique treatment plans
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                                    (Multiple rows with same planNumber are grouped as one treatment with multiple products)
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Preview (first 10 rows)</h4>
                                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-900">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plan#</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Diagnosis</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product ID</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dosage</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Timing</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {previewData.map((row, index) => (
                                                <tr key={index}>
                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{row.planNumber}</td>
                                                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{row.provDiagnosis || '-'}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{row.productId}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{row.dosage || '-'}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{row.timing || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {parsedData.length > 10 && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        ...and {parsedData.length - 10} more rows
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <p className="text-red-800 dark:text-red-200 text-sm whitespace-pre-line">{error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="text-center py-12">
                            <div className="max-w-md mx-auto">
                                <div className="mb-6">
                                    <svg className="w-16 h-16 mx-auto text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Importing Treatment Plans
                                </h3>
                                
                                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                    {importProgress.current} / {importProgress.total}
                                </div>
                                
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    {Math.round((importProgress.current / importProgress.total) * 100)}% Complete
                                </p>
                                
                                {/* Progress Bar */}
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                                    <div 
                                        className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                    >
                                        <span className="text-xs text-white font-medium">
                                            {importProgress.current > 0 && `${Math.round((importProgress.current / importProgress.total) * 100)}%`}
                                        </span>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                                    Please wait, importing plan {importProgress.current} of {importProgress.total}...
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Import Complete!</h3>
                            <div className="text-gray-600 dark:text-gray-400 space-y-1">
                                <p className="text-lg font-medium text-green-600 dark:text-green-400">
                                    ✓ {importSummary.success} treatment plans imported successfully
                                </p>
                                {importSummary.errors > 0 && (
                                    <p className="text-sm text-orange-600 dark:text-orange-400">
                                        ⚠ {importSummary.errors} plans failed (see console for details)
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {(step === 'select' || step === 'preview') && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            disabled={importing}
                        >
                            Cancel
                        </button>
                        {step === 'preview' && (
                            <button
                                onClick={handleImport}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={importing || parsedData.length === 0}
                            >
                                Import {Array.from(new Set(parsedData.map(t => t.planNumber))).length} Plans
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
