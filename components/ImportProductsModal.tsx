import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import * as XLSX from 'xlsx'
import { useImportContext } from '../contexts/ImportContext'
import { useDoctor } from '../contexts/DoctorContext'

interface ImportProductsModalProps {
    isOpen: boolean
    onClose: () => void
    onImportSuccess: () => void
}

interface ProductRow {
    name: string
    priceRupees: number
    quantity: number
    purchasePriceRupees?: number
    unit?: string
    category?: string
    actualInventory?: number
    inventoryValue?: number
    latestUpdate?: string
    purchaseValue?: number
    salesValue?: number
    totalPurchased?: number
    totalSales?: number
}

export default function ImportProductsModal({ isOpen, onClose, onImportSuccess }: ImportProductsModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<ProductRow[]>([])
    const [previewData, setPreviewData] = useState<any[]>([])
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState<string>('')
    const [step, setStep] = useState<'select' | 'preview' | 'checking' | 'confirm' | 'importing' | 'success'>('select')
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
    const [importSummary, setImportSummary] = useState({ success: 0, errors: 0 })
    const [isMinimized, setIsMinimized] = useState(false)
    const [taskId, setTaskId] = useState<string | null>(null)
    const [duplicateCount, setDuplicateCount] = useState(0)
    const [uniqueCount, setUniqueCount] = useState(0)
    const [duplicateIndices, setDuplicateIndices] = useState<number[]>([])
    const [cancelRequested, setCancelRequested] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [selectedDoctorForImport, setSelectedDoctorForImport] = useState<number | null>(null)
    const [user, setUser] = useState<any>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cancelRef = useRef(false)
    const { addTask, updateTask, removeTask, cancelTask } = useImportContext()
    const { doctors, selectedDoctorId } = useDoctor()

    // Fetch user info
    useEffect(() => {
        fetch('/api/auth/me').then(r => r.json()).then(d => {
            setUser(d.user)
            // Set default doctor selection for admin
            if (d.user?.role === 'admin' && selectedDoctorId) {
                setSelectedDoctorForImport(selectedDoctorId)
            } else if (d.user?.role === 'doctor') {
                setSelectedDoctorForImport(d.user.id)
            }
        })
    }, [selectedDoctorId])

    // Listen for maximize events from notification dropdown
    useEffect(() => {
        const handleMaximize = (e: any) => {
            if (e.detail.type === 'products' && e.detail.operation === 'import' && e.detail.taskId === taskId) {
                setIsMinimized(false)
            }
        }
        window.addEventListener('maximizeTask', handleMaximize)
        return () => window.removeEventListener('maximizeTask', handleMaximize)
    }, [taskId])

    if (!isOpen) return null

    const isAdmin = user?.role === 'admin'

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

        // Helper: normalize header keys to simple uppercase tokens (remove non-alphanum)
        const normalizeKey = (k: string) => String(k || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()

        const parsedRows: ProductRow[] = data.map((row: any, rowIndex: number) => {
            // Build normalized map from normalizedKey -> value
            const normMap: Record<string, any> = {}
            Object.keys(row).forEach(k => {
                const nk = normalizeKey(k)
                normMap[nk] = row[k]
            })

            const getRaw = (...keys: string[]) => {
                for (const k of keys) {
                    const nk = normalizeKey(k)
                    if (nk in normMap) return normMap[nk]
                }
                return undefined
            }

            const parseNumber = (v: any) => {
                if (v === undefined || v === null || v === '') return undefined
                // Normalize to string and strip any non-numeric characters except dot and minus.
                // This removes currency symbols (e.g. ₹, $), commas, spaces and other noise.
                let s = String(v).trim()
                s = s.replace(/[^0-9.\-]/g, '')
                if (s === '') return undefined
                const n = Number(s)
                if (isNaN(n)) return undefined
                return n
            }

            const rawName = getRaw('ITEM', 'NAME', 'PRODUCTNAME') || ''
            const name = String(rawName).trim()

            // RATE/U or RATE or PRICE (now stored as rupees)
            const rawRate = getRaw('RATE/U', 'RATE', 'PRICE', 'PRICECENTS')
            let priceRupees = 0
            if (rawRate !== undefined && rawRate !== null && String(rawRate).trim() !== '') {
                const n = parseNumber(rawRate)
                if (n !== undefined) {
                    // Treat parsed number as rupees directly
                    priceRupees = n
                }
            }

            const rawInventory = getRaw('INVENTORY', 'INV', 'QUANTITY')
            const quantity = parseNumber(rawInventory) ?? 0

            const rawPPrice = getRaw('P/PRICE', 'PPRICE', 'PURCHASEPRICE', 'PURCHASEPRICECENTS')
            let purchasePriceRupees: number | undefined = undefined
            if (rawPPrice !== undefined && rawPPrice !== null && String(rawPPrice).trim() !== '') {
                const n = parseNumber(rawPPrice)
                if (n !== undefined) {
                    purchasePriceRupees = n
                }
            }

            const rawUnit = getRaw('UINT', 'UNIT', 'UNITQUANTITY', 'UNIT QUANTITY')
            const unitQuantity = rawUnit === undefined || rawUnit === null || String(rawUnit).trim() === '' ? undefined : String(rawUnit).trim()
            
            const rawUnitType = getRaw('UNITTYPE', 'UNIT TYPE', 'UNIT_TYPE', 'TYPE')
            const unitType = rawUnitType === undefined || rawUnitType === null || String(rawUnitType).trim() === '' ? undefined : String(rawUnitType).trim().toUpperCase()
            
            // Combine unit quantity and type if both exist
            const unit = unitQuantity && unitType ? `${unitQuantity} ${unitType}` : unitQuantity || undefined

            // Category field
            const rawCategory = getRaw('CATEGORY', 'CAT', 'CATEGORYNAME', 'CATEGORY NAME')
            const category = rawCategory === undefined || rawCategory === null || String(rawCategory).trim() === '' ? undefined : String(rawCategory).trim()

            // Additional template fields
            const rawActualInventory = getRaw('ACTUALINVENTORY', 'ACTUAL INVENTORY', 'ACTUAL', 'ACTUALQTY')
            const actualInventory = parseNumber(rawActualInventory)

            const rawInventoryValue = getRaw('INVVAL', 'INV/VAL', 'INVENTORYVALUE', 'INVVALUE')
            const inventoryValue = parseNumber(rawInventoryValue)

            const rawLatest = getRaw('LATEST', 'LATESTUPDATE', 'UPDATED', 'LASTUPDATE', 'LATEST UPDATE')
            let latestUpdate: string | undefined = undefined
            if (rawLatest !== undefined && rawLatest !== null && String(rawLatest).trim() !== '') {
                const d = new Date(String(rawLatest).trim())
                if (!isNaN(d.getTime())) latestUpdate = d.toISOString()
            }

            const rawPurchaseValue = getRaw('PUR/VAL', 'PURVAL', 'PURCHASEVALUE', 'PURCHASE VALUE', 'PURCHASE')
            const purchaseValue = parseNumber(rawPurchaseValue)

            const rawSalesValue = getRaw('SALE/VAL', 'SALEVAL', 'SALESVALUE', 'SALES VALUE', 'SALES')
            const salesValue = parseNumber(rawSalesValue)

            // Accept singular "PURCHASE" from CSV templates as well as other variants
            const rawTotalPurchased = getRaw('TOTALPURCHASED', 'TOTAL PURCHASED', 'TOTALPUR', 'PURCHASED', 'PURCHASE')
            const totalPurchased = parseNumber(rawTotalPurchased)

            // Accept singular "SALES" from CSV templates as well as other variants
            const rawTotalSales = getRaw('TOTALSALES', 'TOTAL SALES', 'TOTAL_SALES', 'SALES_TOTAL', 'SALES')
            const totalSales = parseNumber(rawTotalSales)

            return {
                name,
                priceRupees,
                quantity: quantity || 0,
                purchasePriceRupees,
                unit,
                category,
                actualInventory: actualInventory !== undefined ? Math.round(actualInventory) : undefined,
                inventoryValue: inventoryValue !== undefined ? Number(inventoryValue) : undefined,
                latestUpdate,
                purchaseValue: purchaseValue !== undefined ? Number(purchaseValue) : undefined,
                salesValue: salesValue !== undefined ? Number(salesValue) : undefined,
                totalPurchased: totalPurchased !== undefined ? Math.round(totalPurchased) : undefined,
                totalSales: totalSales !== undefined ? Math.round(totalSales) : undefined
            }
        })
        // Validate required fields
        const errors: string[] = []
        parsedRows.forEach((p, index) => {
            if (!p.name) errors.push(`Row ${index + 1}: Missing name`)
        })

        if (errors.length > 0) {
            setError(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''))
            return
        }

        setParsedData(parsedRows)
        setPreviewData(parsedRows.slice(0, 10))
        setStep('preview')
    }

    const checkDuplicates = async () => {
        setStep('checking')
        setError('')

        try {
            const productsToCheck = parsedData.map((product, index) => ({
                name: product.name,
                index
            }))

            const response = await fetch('/api/products/check-duplicates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: productsToCheck })
            })

            if (!response.ok) {
                throw new Error('Failed to check for duplicates')
            }

            const result = await response.json()
            
            setDuplicateIndices(result.duplicateIndices || [])
            setDuplicateCount(result.duplicateIndices?.length || 0)
            setUniqueCount(result.uniqueIndices?.length || 0)
            setStep('confirm')
        } catch (err: any) {
            setError(`Failed to check duplicates: ${err.message}`)
            setStep('preview')
        }
    }

    const handleImport = async (skipDuplicates: boolean = false) => {
        setImporting(true)
        setError('')
        setStep('importing')
        setCancelRequested(false)
        cancelRef.current = false

        const dataToImport = skipDuplicates
            ? parsedData.filter((_, index) => !duplicateIndices.includes(index))
            : parsedData

        const id = addTask({
            type: 'products',
            operation: 'import',
            status: 'importing',
            progress: { current: 0, total: dataToImport.length }
        })
        setTaskId(id)

        try {
            const total = dataToImport.length
            setImportProgress({ current: 0, total })

            const BATCH_SIZE = 100
            const batches = []
            for (let i = 0; i < dataToImport.length; i += BATCH_SIZE) {
                batches.push(dataToImport.slice(i, i + BATCH_SIZE))
            }

            console.log(`📥 Importing ${total} products in ${batches.length} batches`)

            let successCount = 0
            const allErrors: any[] = []

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                if (cancelRef.current) {
                    console.log('❌ Import cancelled by user at batch', batchIndex + 1)
                    cancelTask(id)
                    setImporting(false)
                    setImportProgress({ current: 0, total: 0 })
                    setTaskId(null)
                    setIsMinimized(false)
                    setCancelRequested(false)
                    cancelRef.current = false
                    return
                }

                const batch = batches[batchIndex]
                const batchStartIndex = batchIndex * BATCH_SIZE
                
                const response = await fetch('/api/products/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        products: batch,
                        doctorId: selectedDoctorForImport
                    })
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(`Failed to import products: ${error.error || 'Unknown error'}`)
                }

                const result = await response.json()
                
                if (result.errors && result.errors.length > 0) {
                    allErrors.push(...result.errors)
                }
                
                successCount += result.count || 0

                for (let i = 0; i < batch.length; i++) {
                    const currentProgress = batchStartIndex + i + 1
                    setImportProgress({ current: currentProgress, total })
                    updateTask(id, {
                        progress: { current: currentProgress, total }
                    })
                }
            }

            if (allErrors.length > 0 && successCount === 0) {
                throw new Error(`Import failed: ${allErrors[0]?.error || 'Unknown error'}`)
            }

            setImportSummary({ success: successCount, errors: allErrors.length })
            setStep('success')
            setImporting(false)
            
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
            setError(err.message)
            setImporting(false)
            setStep('select')
            
            if (taskId) {
                updateTask(taskId, {
                    status: 'error',
                    error: err.message,
                    endTime: Date.now()
                })
            }
        }
    }

    const handleCancel = () => {
        setShowCancelConfirm(true)
    }

    const confirmCancelImport = () => {
        setCancelRequested(true)
        cancelRef.current = true
        setShowCancelConfirm(false)
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

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
            <div className="rounded-lg border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-xl shadow-emerald-500/10 backdrop-blur-sm max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-lg"></div>
                <div className="relative">
                <div className="sticky top-0 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Import Products</h2>
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
                            {/* Doctor Selection for Admin */}
                            {isAdmin && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    <label className="block text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                                        Select Doctor for Import
                                    </label>
                                    <select
                                        value={selectedDoctorForImport || ''}
                                        onChange={(e) => setSelectedDoctorForImport(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">-- Select Doctor --</option>
                                        {doctors.filter(d => d.verified).map(doctor => (
                                            <option key={doctor.id} value={doctor.id}>
                                                {doctor.name} ({doctor.email})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                        ⚠️ All imported products will be assigned to the selected doctor
                                    </p>
                                </div>
                            )}

                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls,.json"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="product-file-input"
                                    disabled={isAdmin && !selectedDoctorForImport}
                                />
                                <label
                                    htmlFor="product-file-input"
                                    className={`cursor-pointer inline-flex items-center px-4 py-2 rounded-lg ${
                                        isAdmin && !selectedDoctorForImport 
                                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Choose File
                                </label>
                                {isAdmin && !selectedDoctorForImport && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        Please select a doctor first
                                    </p>
                                )}
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 Template Information</h4>
                                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                    <li><strong>🔑 Required Field:</strong></li>
                                    <li className="ml-4">• <strong>name</strong> - Product/Medicine name (must be unique)</li>
                                    
                                    <li className="mt-2"><strong>📝 Optional Fields:</strong></li>
                                    <li className="ml-4">• <strong>price</strong> - Selling price (₹ or paise, auto-converts)</li>
                                    <li className="ml-4">• <strong>purchasePrice</strong> - Cost price for inventory</li>
                                    <li className="ml-4">• <strong>quantity</strong> - Stock quantity (default: 0)</li>
                                    <li className="ml-4">• <strong>unit</strong> or <strong>unitQuantity</strong> - Unit quantity (e.g., "30", "100")</li>
                                    <li className="ml-4">• <strong>unitType</strong> - Unit type (ML, GM, SPOONS, TABS, CAPS, PUFFS)</li>
                                    
                                    <li className="mt-2"><strong>💰 Price Format:</strong></li>
                                    <li className="ml-4">• Enter in rupees: <strong>50</strong> or <strong>50.00</strong> (auto-converts to paise)</li>
                                    <li className="ml-4">• Or in paise: <strong>5000</strong> (₹50.00)</li>
                                    
                                    <li className="mt-2"><strong>ℹ️ Notes:</strong></li>
                                    <li className="ml-4">• Each row = 1 product</li>
                                    <li className="ml-4">• Duplicate names will be skipped (keeps existing)</li>
                                    <li className="ml-4">• Missing prices default to ₹0.00</li>
                                    
                                    <li className="mt-2">• 📥 <a href="/templates/inventory.csv" download className="underline hover:text-blue-600 font-semibold">Download CSV Template</a></li>
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
                                    ✓ Found <strong>{parsedData.length}</strong> products to import
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Category</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Price</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Unit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {previewData.map((p, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2 text-sm">{p.name}</td>
                                                <td className="px-4 py-2 text-sm">{p.category || '-'}</td>
                                                <td className="px-4 py-2 text-sm">₹{(Number(p.priceRupees) || 0).toFixed(2)}</td>
                                                <td className="px-4 py-2 text-sm">{p.quantity}</td>
                                                <td className="px-4 py-2 text-sm">{p.unit || '-'}</td>
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
                                    onClick={checkDuplicates}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Check & Import {parsedData.length} Products
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

                    {step === 'confirm' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Duplicate Check Results</h3>
                                <div className="space-y-2 text-sm">
                                    <p className="text-blue-800 dark:text-blue-200">
                                        ✓ <strong>{uniqueCount}</strong> unique products found
                                    </p>
                                    {duplicateCount > 0 && (
                                        <p className="text-orange-800 dark:text-orange-200">
                                            ⚠ <strong>{duplicateCount}</strong> potential duplicates detected (by name)
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('preview')}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                                >
                                    Back
                                </button>
                                {duplicateCount > 0 && (
                                    <button
                                        onClick={() => handleImport(true)}
                                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                    >
                                        Import {uniqueCount} Unique Only
                                    </button>
                                )}
                                <button
                                    onClick={() => handleImport(false)}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Import All {parsedData.length} (Update Duplicates)
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
                                    Importing Products
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
                                    Please wait, importing product {importProgress.current} of {importProgress.total}...
                                </p>

                                <button
                                    onClick={handleCancel}
                                    className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
                                    ✓ {importSummary.success} products imported successfully
                                </p>
                                {importSummary.errors > 0 && (
                                    <p className="text-sm text-orange-600 dark:text-orange-400">
                                        ⚠ {importSummary.errors} products failed (see console for details)
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </div>

            {/* Cancel Confirmation Modal */}
            {showCancelConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                    <div className="rounded-lg border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-xl shadow-emerald-500/10 backdrop-blur-sm p-6 max-w-md overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-lg"></div>
                        <div className="relative">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Cancel Import?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to cancel the import? Progress will be lost.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                            >
                                Continue Importing
                            </button>
                            <button
                                onClick={confirmCancelImport}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Yes, Cancel
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    )
}
