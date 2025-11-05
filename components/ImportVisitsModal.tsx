import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { useImportContext } from '../contexts/ImportContext'

interface ImportVisitsModalProps {
    isOpen: boolean
    onClose: () => void
    onImportSuccess: () => void
}

interface VisitRow {
    // Visit base fields
    opdNo: string
    date?: string
    patientName?: string
    visitNumber?: number
    address?: string
    fatherHusbandGuardianName?: string
    phone?: string
    amount?: number
    discount?: number
    payment?: number
    balance?: number
    followUpCount?: number
    nextVisit?: string
    gender?: string
    dob?: string
    age?: number
    weight?: number
    height?: number
    temperament?: string
    pulseDiagnosis?: string
    pulseDiagnosis2?: string
    investigations?: string
    diagnoses?: string
    historyReports?: string
    majorComplaints?: string
    improvements?: string
    procedureAdopted?: string
    discussion?: string
    extra?: string
    
    // Prescription fields for up to 12 medicines
    prescriptions?: Array<{
        quantity?: number
        productName?: string
        comp1?: string
        comp2?: string
        comp3?: string
        timing?: string
        dosage?: string
        additions?: string
        procedure?: string
        presentation?: string
        droppersToday?: number
    }>
}

export default function ImportVisitsModal({ isOpen, onClose, onImportSuccess }: ImportVisitsModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<VisitRow[]>([])
    const [previewData, setPreviewData] = useState<any[]>([])
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState<string>('')
    const [step, setStep] = useState<'select' | 'preview' | 'checking' | 'confirm' | 'importing' | 'success'>('select')
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
    const [importSummary, setImportSummary] = useState({ success: 0, errors: 0 })
    const [isMinimized, setIsMinimized] = useState(false)
    const [taskId, setTaskId] = useState<string | null>(null)
    const [cancelRequested, setCancelRequested] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [duplicateInfo, setDuplicateInfo] = useState<any>(null)
    const [includeDuplicates, setIncludeDuplicates] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cancelRef = useRef(false)
    const abortControllerRef = useRef<AbortController | null>(null)
    const { addTask, updateTask, removeTask, cancelTask } = useImportContext()

    // Listen for maximize events from notification dropdown
    useEffect(() => {
        const handleMaximize = (e: any) => {
            if (e.detail.type === 'visits' && e.detail.operation === 'import' && e.detail.taskId === taskId) {
                setIsMinimized(false)
            }
        }
        window.addEventListener('maximizeTask', handleMaximize)
        return () => window.removeEventListener('maximizeTask', handleMaximize)
    }, [taskId])

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

        // Helper function to parse dates from various formats
        const parseDate = (dateStr: any): string | undefined => {
            if (!dateStr) return undefined
            
            const str = String(dateStr).trim()
            if (!str) return undefined
            
            // Try to parse DD-MM-YYYY format (e.g., "01-11-2025")
            const ddmmyyyyMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
            if (ddmmyyyyMatch) {
                const [, day, month, year] = ddmmyyyyMatch
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            }
            
            // Try to parse DD/MM/YYYY format
            const ddmmyyyySlashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
            if (ddmmyyyySlashMatch) {
                const [, day, month, year] = ddmmyyyySlashMatch
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            }
            
            // Try to parse as ISO date or let Date constructor handle it
            const date = new Date(str)
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0]
            }
            
            return undefined
        }

        const visits: VisitRow[] = data.map((row: any) => {
            // Parse prescriptions from numbered columns (01-12)
            const prescriptions = []
            for (let i = 1; i <= 12; i++) {
                const num = String(i).padStart(2, '0') // Format as 01, 02, etc.
                const qtyKey = i === 1 ? `QTY-${num}` : `QNTY-${num}` // First is QTY, rest are QNTY
                const qty = row[qtyKey]
                const productName = row[`CR-${num}`]
                
                // Only add prescription if at least product name or quantity exists
                if (qty || productName) {
                    prescriptions.push({
                        quantity: qty ? Number(qty) : 1,
                        productName: productName || '',
                        comp1: row[`DL-${num}`] || '',
                        comp2: row[`SY-${num}`] || '',
                        comp3: row[`EF-${num}`] || '',
                        timing: row[`TM-${num}`] || '',
                        dosage: row[`DOSE-${num}`] || '',
                        additions: row[`AD-${num}`] || '',
                        procedure: row[`PR-${num}`] || '',
                        presentation: row[`PRE-${num}`] || '',
                        droppersToday: row[`TDY-${num}`] ? Number(row[`TDY-${num}`]) : undefined
                    })
                }
            }
            
            return {
                opdNo: String(row.OPDN || row.opdNo || '').trim(),
                date: parseDate(row.Date || row.date),
                patientName: row['Patient Name'] || row.patientName || undefined,
                visitNumber: row.V ? Number(row.V) : undefined, // Use V column for visit number
                address: row.Address || row.address || undefined,
                fatherHusbandGuardianName: row['F/H/G Name'] || row.fatherHusbandGuardianName || undefined,
                phone: String(row['Mob./Ph'] || row.phone || '').trim() || undefined,
                amount: row.AMT ? parseFloat(String(row.AMT).replace(/,/g, '')) : undefined,
                discount: row.DISCOUNT ? parseFloat(String(row.DISCOUNT).replace(/,/g, '')) : undefined,
                payment: row.PAYMENT ? parseFloat(String(row.PAYMENT).replace(/,/g, '')) : undefined,
                balance: row.BAL ? parseFloat(String(row.BAL).replace(/,/g, '')) : undefined,
                followUpCount: row.FU ? Number(row.FU) : undefined,
                nextVisit: parseDate(row['Next V'] || row.nextVisit),
                gender: row.Sex || row.gender || undefined,
                dob: parseDate(row.DOB || row.dob),
                age: row.Age ? Number(String(row.Age).replace(/[^0-9]/g, '')) : undefined,
                weight: row.Wt ? parseFloat(row.Wt) : undefined,
                height: row.Ht ? parseFloat(row.Ht) : undefined,
                temperament: row.Temp || row.temperament || undefined,
                pulseDiagnosis: row['PulseD 1'] || row.pulseDiagnosis || undefined,
                pulseDiagnosis2: row['PulseD 2'] || row.pulseDiagnosis2 || undefined,
                investigations: row.Investigations || row.investigations || undefined,
                diagnoses: row['Diagnosis:'] || row.diagnoses || undefined,
                historyReports: row['Hist/Reports'] || row.historyReports || undefined,
                majorComplaints: row['Chief Complaints'] || row.majorComplaints || undefined,
                improvements: row.Imp || row.improvements || undefined,
                procedureAdopted: row.PROCEDURE || row.procedureAdopted || undefined,
                discussion: row.DISCUSSION || row.discussion || undefined,
                extra: row.EXTRA ? String(row.EXTRA) : undefined, // Convert to string
                prescriptions: prescriptions.length > 0 ? prescriptions : undefined
            }
        })

        // Validate required fields
        const errors: string[] = []
        visits.forEach((v, index) => {
            if (!v.opdNo) {
                errors.push(`Row ${index + 1}: Missing OPDN (OPD Number)`)
            }
        })

        if (errors.length > 0) {
            setError(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''))
            return
        }

        setParsedData(visits)
        setPreviewData(visits.slice(0, 10))
        setStep('preview')
    }

    const checkDuplicates = async () => {
        setStep('checking')
        setError('')

        try {
            console.log('🔍 Checking duplicates for', parsedData.length, 'visits')
            
            // Extract just the opdNos to reduce payload size
            const opdNos = parsedData.map((v, index) => ({ 
                opdNo: v.opdNo, 
                index 
            })).filter(item => item.opdNo)
            
            console.log('📤 Sending', opdNos.length, 'opdNos to check')
            
            let response
            try {
                response = await fetch('/api/visits/check-duplicates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ opdNos }) // Send only opdNos, not full visit data
                })
            } catch (fetchError) {
                console.error('❌ Fetch error:', fetchError)
                throw new Error('Network error: Unable to connect to server. Please check if the server is running.')
            }

            let result
            try {
                result = await response.json()
            } catch (jsonError) {
                console.error('❌ JSON parse error:', jsonError)
                throw new Error('Invalid response from server')
            }

            console.log('📊 Duplicate check result:', result)

            if (!response.ok) {
                throw new Error(result.error || 'Failed to check for duplicates')
            }

            setDuplicateInfo(result)
            
            if (result.duplicates > 0) {
                console.log('⚠️ Found', result.duplicates, 'duplicates')
                setStep('confirm')
            } else {
                console.log('✅ No duplicates found, proceeding to import')
                // No duplicates, proceed directly to import
                handleImport()
            }
        } catch (err: any) {
            console.error('❌ Duplicate check error:', err)
            setError(err.message || 'Failed to check duplicates. Please try again.')
            setStep('preview')
        }
    }

    const handleImport = async () => {
        console.log('🚀 Starting import, parsedData length:', parsedData.length)
        setImporting(true)
        setError('')
        setStep('importing')
        setCancelRequested(false)
        cancelRef.current = false
        
        // Create new AbortController for this import
        abortControllerRef.current = new AbortController()

        // Determine which data to import based on duplicate settings
        let dataToImport = parsedData
        if (duplicateInfo && !includeDuplicates) {
            // Only import unique records using indices
            const uniqueIndices = duplicateInfo.uniqueIndices || []
            dataToImport = uniqueIndices.map((index: number) => parsedData[index])
        }

        // Create task in global context
        console.log('📝 About to call addTask...')
        const id = addTask({
            type: 'visits',
            operation: 'import',
            status: 'importing',
            progress: { current: 0, total: dataToImport.length }
        })
        console.log('✅ Task created with ID:', id)
        setTaskId(id)

        try {
            const totalVisits = dataToImport.length
            setImportProgress({ current: 0, total: totalVisits })

            let successCount = 0
            const allErrors: any[] = []

            // Smaller batch size for more responsive cancellation
            const BATCH_SIZE = 20
            const batches = []
            for (let i = 0; i < dataToImport.length; i += BATCH_SIZE) {
                batches.push(dataToImport.slice(i, i + BATCH_SIZE))
            }

            console.log(`📦 Processing ${totalVisits} visits in ${batches.length} batches of ${BATCH_SIZE}`)

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                // Check if cancel was requested at start of batch
                if (cancelRef.current) {
                    console.log('❌ Import cancelled by user at batch', batchIndex + 1)
                    cancelTask(id)
                    setImporting(false)
                    setStep('select')
                    abortControllerRef.current = null
                    return
                }

                const batch = batches[batchIndex]
                const batchStartIndex = batchIndex * BATCH_SIZE
                
                console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} visits)`)
                
                try {
                    // Send batch request with abort signal
                    const response = await fetch('/api/visits/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ visits: batch }),
                        signal: abortControllerRef.current?.signal
                    })

                    if (response.ok) {
                        const result = await response.json()
                        if (result.errors && result.errors.length > 0) {
                            allErrors.push(...result.errors)
                        }
                        successCount += result.count || batch.length
                        
                        // Update progress instantly for each item in the batch
                        for (let i = 0; i < batch.length; i++) {
                            const currentProgress = batchStartIndex + i + 1
                            setImportProgress({ current: currentProgress, total: totalVisits })
                            updateTask(id, {
                                progress: { current: currentProgress, total: totalVisits }
                            })
                        }
                    } else {
                        const error = await response.json()
                        allErrors.push({ error: error.error || 'Unknown error', batch: batchIndex + 1 })
                    }
                } catch (err: any) {
                    allErrors.push({ error: err.message, batch: batchIndex + 1 })
                }
            }

            if (allErrors.length > 0 && successCount === 0) {
                throw new Error(`Import failed: ${allErrors[0]?.error || 'Unknown error'}`)
            }

            setImportSummary({ success: successCount, errors: allErrors.length })
            setStep('success')
            setImporting(false)
            
            // Update task to success
            updateTask(id, {
                status: 'success',
                summary: { success: successCount, errors: allErrors.length },
                endTime: Date.now()
            })
            
            setTimeout(() => {
                onImportSuccess()
                handleClose()
            }, 2000)
        } catch (err: any) {
            // Don't show error if user cancelled
            if (err.name === 'AbortError') {
                console.log('❌ Import aborted by user')
                setImporting(false)
                setStep('select')
                return
            }
            
            setError(err.message)
            setImporting(false)
            setStep('select')
            
            // Update task to error
            if (id) {
                updateTask(id, {
                    status: 'error',
                    error: err.message,
                    endTime: Date.now()
                })
            }
        } finally {
            abortControllerRef.current = null
        }
    }

    const handleCancelImport = () => {
        setShowCancelConfirm(true)
    }

    const confirmCancelImport = () => {
        setCancelRequested(true)
        cancelRef.current = true
        setShowCancelConfirm(false)
        
        // Abort any in-flight request immediately
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            console.log('🛑 Aborting in-flight HTTP request')
        }
        
        console.log('🛑 Cancel requested, setting cancelRef to true')
    }

    const handleClose = () => {
        // Only allow closing if not importing
        if (importing) {
            setIsMinimized(true)
            return
        }
        
        // Clean up task from context if it exists
        if (taskId) {
            removeTask(taskId)
        }
        
        setFile(null)
        setParsedData([])
        setPreviewData([])
        setError('')
        setStep('select')
        setImportProgress({ current: 0, total: 0 })
        setImportSummary({ success: 0, errors: 0 })
        setIsMinimized(false)
        setTaskId(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        onClose()
    }

    const handleMinimize = () => {
        setIsMinimized(true)
    }

    const handleMaximize = () => {
        setIsMinimized(false)
    }

    // If minimized, show nothing (task is tracked in notification dropdown)
    if (isMinimized) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Import Visits</h2>
                    <div className="flex items-center gap-2">
                        {/* Minimize button - only show during import */}
                        {importing && (
                            <button
                                onClick={handleMinimize}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                title="Minimize"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={handleClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title={importing ? "Minimize" : "Close"}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
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
                                    id="visit-file-input"
                                />
                                <label
                                    htmlFor="visit-file-input"
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
                                    <li>• Required: <strong>OPDN</strong> (OPD Number)</li>
                                    <li>• System will match/create patients by phone number or patient name</li>
                                    <li>• Optional fields: Date, Patient Name, V (Visit Number), Address, Age, Gender, AMT, DISCOUNT, PAYMENT, BAL, etc.</li>
                                    <li>• Prescriptions: Use DRN-01 to DRN-12, DL-01 to DL-12, CR-01 to CR-12 (medicine names), SY-01 to SY-12, EF-01 to EF-12, TM-01 to TM-12, DOSE-01 to DOSE-12, AD-01 to AD-12, PR-01 to PR-12, PRE-01 to PRE-12, TDY-01 to TDY-12, QTY-01/QNTY-02 to QNTY-12</li>
                                    <li>• Each row = 1 visit with up to 12 medicines</li>
                                    <li>• Download template: <a href="/templates/visits import.csv" download className="underline hover:text-blue-600">CSV Template</a></li>
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
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <p className="text-red-800 dark:text-red-200 text-sm whitespace-pre-line">{error}</p>
                                </div>
                            )}
                            
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <p className="text-green-800 dark:text-green-200">
                                    ✓ Found <strong>{parsedData.length}</strong> visits to import
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">OPD No</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Patient</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Diagnosis</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Medicines</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {previewData.map((v, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2 text-sm">{v.opdNo}</td>
                                                <td className="px-4 py-2 text-sm">{v.patientName || '-'}</td>
                                                <td className="px-4 py-2 text-sm">{v.date || '-'}</td>
                                                <td className="px-4 py-2 text-sm">{v.diagnoses || '-'}</td>
                                                <td className="px-4 py-2 text-sm">{v.prescriptions?.length || 0}</td>
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
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                >
                                    Skip Check & Import
                                </button>
                                <button
                                    onClick={checkDuplicates}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Check Duplicates
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'checking' && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400">Checking for duplicates...</p>
                        </div>
                    )}

                    {step === 'confirm' && duplicateInfo && (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                                            Duplicate Records Detected
                                        </h3>
                                        <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                                            <p><strong>Total Records:</strong> {duplicateInfo.total}</p>
                                            <p><strong>Unique Records:</strong> {duplicateInfo.unique}</p>
                                            <p><strong>Duplicate Records:</strong> {duplicateInfo.duplicates}</p>
                                        </div>
                                        <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-yellow-200 dark:border-yellow-700">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                                <strong>What would you like to do?</strong>
                                            </p>
                                            <label className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="radio"
                                                    checked={!includeDuplicates}
                                                    onChange={() => setIncludeDuplicates(false)}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    Import only unique records ({duplicateInfo.unique} records)
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    checked={includeDuplicates}
                                                    onChange={() => setIncludeDuplicates(true)}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    Import all records including duplicates ({duplicateInfo.total} records)
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setStep('preview')
                                        setDuplicateInfo(null)
                                    }}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Import {includeDuplicates ? duplicateInfo.total : duplicateInfo.unique} Visits
                                </button>
                            </div>
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
                                    Importing Visits
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
                                    Please wait, importing visit {importProgress.current} of {importProgress.total}...
                                </p>

                                {/* Cancel Button */}
                                <button
                                    onClick={handleCancelImport}
                                    className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                >
                                    Cancel Import
                                </button>
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
                                    ✓ {importSummary.success} visits imported successfully
                                </p>
                                {importSummary.errors > 0 && (
                                    <p className="text-sm text-orange-600 dark:text-orange-400">
                                        ⚠ {importSummary.errors} visits failed (see console for details)
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Cancel Confirmation Modal */}
            {showCancelConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Cancel Import
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    Are you sure you want to cancel this import? Progress will be lost and you'll need to start over.
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowCancelConfirm(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        No, Continue
                                    </button>
                                    <button
                                        onClick={confirmCancelImport}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                    >
                                        Yes, Cancel Import
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
