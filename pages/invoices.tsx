import { useState, useEffect } from 'react'
import LoadingModal from '../components/LoadingModal'
import ToastNotification from '../components/ToastNotification'
import CustomSelect from '../components/CustomSelect'
import { useToast } from '../hooks/useToast'
import { useDataCache } from '../contexts/DataCacheContext'
import { useImportContext } from '../contexts/ImportContext'
import RefreshButton from '../components/RefreshButton'
import * as XLSX from 'xlsx'

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [paymentInvoice, setPaymentInvoice] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set())
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const [sortField, setSortField] = useState<string>('createdAt')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [showSortDropdown, setShowSortDropdown] = useState(false)
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
    const [isDeleteMinimized, setIsDeleteMinimized] = useState(false)
    const [currentGenerationTaskId, setCurrentGenerationTaskId] = useState<string | null>(null)
    const [generationAbortController, setGenerationAbortController] = useState<AbortController | null>(null)
    const [isGeneratingModalOpen, setIsGeneratingModalOpen] = useState(false)
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; id?: number; deleteMultiple?: boolean; message?: string }>({ open: false })
    const [confirmModalAnimating, setConfirmModalAnimating] = useState(false)
    const [showCancelGenerationConfirm, setShowCancelGenerationConfirm] = useState(false)
    const [cancelConfirmAnimating, setCancelConfirmAnimating] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [isFilterStatusOpen, setIsFilterStatusOpen] = useState(false)
    const [isPatientSelectOpen, setIsPatientSelectOpen] = useState(false)
    const [isProductSelectOpen, setIsProductSelectOpen] = useState<{[key: number]: boolean}>({})
    const [isPaymentMethodOpen, setIsPaymentMethodOpen] = useState(false)
    const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()
    const { getCache, setCache } = useDataCache()
    const importContext = useImportContext()

    const emptyForm = {
        patientId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        customerGSTIN: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        discount: '',
        notes: '',
        termsAndConditions: 'Payment due within 30 days. Late payments may incur interest charges.',
        items: [{ productId: '', description: '', quantity: '', unitPrice: '', taxRate: '', discount: '' }]
    }

    const [form, setForm] = useState(emptyForm)
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        paymentMethod: 'CASH',
        transactionId: ''
    })

    useEffect(() => {
        // Check cache first
        const cachedInvoices = getCache<any[]>('invoices')
        const cachedPatients = getCache<any[]>('patients')
        const cachedProducts = getCache<any[]>('products')
        
        if (cachedInvoices) {
            setInvoices(cachedInvoices)
        }
        if (cachedPatients) {
            setPatients(cachedPatients)
        }
        if (cachedProducts) {
            setProducts(cachedProducts)
        }
        
        // Fetch in background if cache exists, or show loading if no cache
        if (cachedInvoices && cachedPatients && cachedProducts) {
            fetchInitialData()
        } else {
            fetchInitialData()
        }
        
        // Cleanup on unmount to prevent data flashing
        return () => {
            setInvoices([])
            setPatients([])
            setProducts([])
        }
    }, [])

    // Separate effect for maximize event listener
    useEffect(() => {
        const handleMaximize = (event: any) => {
            const { taskId, type, operation } = event.detail
            // Open the modal if it's an invoice generation task
            if (type === 'invoices' && operation === 'generate') {
                setCurrentGenerationTaskId(taskId)
                setIsGeneratingModalOpen(true)
            }
        }
        window.addEventListener('maximizeTask', handleMaximize)
        return () => window.removeEventListener('maximizeTask', handleMaximize)
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            await Promise.all([
                fetchInvoices(),
                fetchPatients(),
                fetchProducts(),
                fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
            ])
        } finally {
            setLoading(false)
        }
    }

    const fetchInvoices = async () => {
        const response = await fetch('/api/customer-invoices')
        const data = await response.json()
        const invoicesData = Array.isArray(data) ? data : []
        setInvoices(invoicesData)
        setCache('invoices', invoicesData)
    }

    const fetchPatients = async () => {
        // Use cached patients data from DataCacheContext
        const cachedPatients = getCache('patients')
        if (cachedPatients) {
            setPatients(Array.isArray(cachedPatients) ? cachedPatients : [])
        }
    }

    const fetchProducts = async () => {
        const response = await fetch('/api/products/public')
        const data = await response.json()
        setProducts(Array.isArray(data) ? data : [])
    }

    async function handleSubmit(e: any) {
        e.preventDefault()
        setSubmitting(true)
        try {
            const validItems = form.items.filter(item =>
                (item.productId || item.description) && item.quantity && item.unitPrice
            )

            if (validItems.length === 0) {
                showError('Please add at least one item to the invoice')
                setSubmitting(false)
                return
            }

            const payload = {
                patientId: form.patientId ? Number(form.patientId) : null,
                customerName: form.customerName,
                customerEmail: form.customerEmail || null,
                customerPhone: form.customerPhone || null,
                customerAddress: form.customerAddress || null,
                customerGSTIN: form.customerGSTIN || null,
                invoiceDate: form.invoiceDate,
                dueDate: form.dueDate || null,
                discount: form.discount ? Number(form.discount) : 0,
                notes: form.notes || null,
                termsAndConditions: form.termsAndConditions || null,
                items: validItems.map(item => ({
                    productId: item.productId ? Number(item.productId) : null,
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    taxRate: item.taxRate ? Number(item.taxRate) : 0,
                    discount: item.discount ? Number(item.discount) : 0
                }))
            }

            const response = await fetch(editingId ? `/api/customer-invoices/${editingId}` : '/api/customer-invoices', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                await fetchInvoices()
                closeModal()
                showSuccess(editingId ? 'Invoice updated successfully!' : 'Invoice created successfully!')
            } else {
                const error = await response.json()
                showError('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error saving invoice:', error)
            showError('Failed to save invoice')
        } finally {
            setSubmitting(false)
        }
    }

    function addItem() {
        setForm({
            ...form,
            items: [...form.items, { productId: '', description: '', quantity: '', unitPrice: '', taxRate: '', discount: '' }]
        })
    }

    function removeItem(index: number) {
        const newItems = form.items.filter((_, i) => i !== index)
        setForm({ ...form, items: newItems })
    }

    function updateItem(index: number, field: string, value: any) {
        const newItems = [...form.items]
        newItems[index] = { ...newItems[index], [field]: value }

        if (field === 'productId' && value) {
            const product = products.find(p => p.id === Number(value))
            if (product) {
                newItems[index].description = product.name
                newItems[index].unitPrice = (product.priceRupees || 0).toString()
            }
        }

        setForm({ ...form, items: newItems })
    }

    function fillFromPatient(patientId: string) {
        const patient = patients.find(p => p.id === Number(patientId))
        if (patient) {
            setForm({
                ...form,
                patientId,
                customerName: patient.name,
                customerPhone: patient.phone || '',
                customerEmail: patient.email || '',
                customerAddress: patient.address || ''
            })
        }
    }

    function openPaymentModal(invoice: any) {
        setPaymentInvoice(invoice)
        setPaymentForm({
            amount: (invoice.balanceAmount || 0).toString(),
            paymentMethod: 'CASH',
            transactionId: ''
        })
        setIsPaymentModalOpen(true)
        setIsAnimating(false)
        setTimeout(() => setIsAnimating(true), 10)
    }

    async function handlePayment(e: any) {
        e.preventDefault()
        setSubmitting(true)
        try {
            const response = await fetch('/api/customer-invoices', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: paymentInvoice.id,
                    paidAmount: Number(paymentForm.amount),
                    paymentMethod: paymentForm.paymentMethod,
                    transactionId: paymentForm.transactionId || null
                })
            })

            if (response.ok) {
                await fetchInvoices()
                setIsPaymentModalOpen(false)
                setPaymentInvoice(null)
                showSuccess('Payment recorded successfully!')
            } else {
                const error = await response.json()
                showError('Failed: ' + (error.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error recording payment:', error)
            showError('Failed to record payment')
        } finally {
            setSubmitting(false)
        }
    }

    function closeModal() {
        setIsAnimating(false)
        setTimeout(() => {
            setIsModalOpen(false)
            setForm(emptyForm)
            setEditingId(null)
        }, 200)
    }

    function editInvoice(invoice: any) {
        setEditingId(invoice.id)
        setForm({
            patientId: invoice.patientId ? String(invoice.patientId) : '',
            customerName: invoice.customerName || '',
            customerEmail: invoice.customerEmail || '',
            customerPhone: invoice.customerPhone || '',
            customerAddress: invoice.customerAddress || '',
            customerGSTIN: invoice.customerGSTIN || '',
            invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
            dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
            discount: invoice.discount ? String(invoice.discount) : '',
            notes: invoice.notes || '',
            termsAndConditions: invoice.termsAndConditions || 'Payment due within 30 days. Late payments may incur interest charges.',
            items: invoice.items && invoice.items.length > 0 
                ? invoice.items.map((item: any) => ({
                    productId: item.productId ? String(item.productId) : '',
                    description: item.description || '',
                    quantity: String(item.quantity || ''),
                    unitPrice: String(item.unitPrice || ''),
                    taxRate: String(item.taxRate || ''),
                    discount: String(item.discount || '')
                }))
                : [{ productId: '', description: '', quantity: '', unitPrice: '', taxRate: '', discount: '' }]
        })
        setIsModalOpen(true)
        setIsAnimating(false)
        setTimeout(() => setIsAnimating(true), 10)
    }

    function closePaymentModal() {
        setIsPaymentModalOpen(false)
        setPaymentInvoice(null)
    }

    function printInvoice(inv: any) {
        const printWindow = window.open('', '_blank')
        if (!printWindow) return
        
        const items = inv.items || []
        const subtotal = items.reduce((sum: number, item: any) => {
            const itemTotal = (item.quantity || 0) * (item.unitPrice || 0)
            const itemDiscount = (item.discount || 0)
            return sum + itemTotal - itemDiscount
        }, 0)
        const discount = inv.discount || 0
        const total = subtotal - discount
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${inv.invoiceNumber}</title>
                <style>
                    @page { size: A4; margin: 10mm; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; font-size: 10pt; padding: 10mm; }
                    .header { text-align: center; margin-bottom: 10mm; border-bottom: 2px solid #d32f2f; padding-bottom: 5mm; }
                    .header h1 { color: #d32f2f; font-size: 24pt; margin-bottom: 2mm; }
                    .header p { color: #666; font-size: 9pt; }
                    .info-section { display: flex; justify-content: space-between; margin-bottom: 8mm; }
                    .info-box { flex: 1; }
                    .info-box h3 { font-size: 11pt; color: #d32f2f; margin-bottom: 3mm; border-bottom: 1px solid #ddd; padding-bottom: 2mm; }
                    .info-box p { font-size: 9pt; margin-bottom: 1mm; color: #333; }
                    .info-box strong { color: #000; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; }
                    thead { background-color: #d32f2f; color: white; }
                    th, td { padding: 4mm 2mm; text-align: left; border-bottom: 1px solid #ddd; }
                    th { font-size: 10pt; font-weight: bold; }
                    td { font-size: 9pt; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .totals { margin-top: 5mm; border-top: 2px solid #333; padding-top: 3mm; }
                    .totals-row { display: flex; justify-content: flex-end; margin-bottom: 2mm; }
                    .totals-label { width: 150px; text-align: right; font-weight: bold; padding-right: 3mm; }
                    .totals-value { width: 100px; text-align: right; }
                    .grand-total { font-size: 14pt; color: #d32f2f; }
                    .footer { margin-top: 10mm; text-align: center; padding-top: 5mm; border-top: 2px solid #d32f2f; }
                    .footer p { font-size: 8pt; color: #666; }
                    .status { display: inline-block; padding: 2mm 4mm; border-radius: 3px; font-weight: bold; font-size: 9pt; }
                    .status-paid { background: #4caf50; color: white; }
                    .status-partial { background: #ff9800; color: white; }
                    .status-unpaid { background: #f44336; color: white; }
                    @media print {
                        body { padding: 0; }
                        @page { margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Last Leaf Care</h1>
                    <p>SCO-5, Royal Heights, Royal City, Chahal Road, Faridkot (Pb.) - 151203</p>
                    <p>Phone: 01639252777 | D.L. No. 160913, 160914</p>
                </div>
                
                <div class="info-section">
                    <div class="info-box">
                        <h3>CASH MEMO</h3>
                        <p><strong>Sr. No.:</strong> ${inv.invoiceNumber || 'N/A'}</p>
                        <p><strong>Date:</strong> ${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                    </div>
                    <div class="info-box">
                        <h3>Bill To</h3>
                        <p><strong>Prescriber:</strong> Dr. Sanjeev Juneja</p>
                        <p><strong>Name & Address of Patient:</strong> ${inv.customerName || 'N/A'}</p>
                        ${inv.customerPhone ? `<p><strong>Phone:</strong> ${inv.customerPhone}</p>` : ''}
                        ${inv.customerAddress ? `<p><strong>Address:</strong> ${inv.customerAddress}</p>` : ''}
                    </div>
                    <div class="info-box">
                        <h3>Status</h3>
                        <span class="status status-${inv.status}">${inv.status?.toUpperCase() || 'UNPAID'}</span>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th class="text-center">Qty.</th>
                            <th>Name of the Drug Prep. & Qty. or if made by licence the Ingredient & qty. there of</th>
                            <th class="text-center">If the drug is specified in Sch C</th>
                            <th class="text-right">Amount (Rs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item: any, idx: number) => `
                            <tr>
                                <td class="text-center">${item.quantity || 0}</td>
                                <td>${item.description || ''}</td>
                                <td class="text-center">-</td>
                                <td class="text-right">₹${((item.quantity || 0) * (item.unitPrice || 0) - (item.discount || 0)).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="totals-row">
                        <div class="totals-label">Subtotal:</div>
                        <div class="totals-value">₹${subtotal.toFixed(2)}</div>
                    </div>
                    ${discount > 0 ? `
                        <div class="totals-row">
                            <div class="totals-label">Discount:</div>
                            <div class="totals-value">-₹${discount.toFixed(2)}</div>
                        </div>
                    ` : ''}
                    <div class="totals-row grand-total">
                        <div class="totals-label">Total Amount:</div>
                        <div class="totals-value">₹${total.toFixed(2)}</div>
                    </div>
                    ${inv.paidAmount > 0 ? `
                        <div class="totals-row">
                            <div class="totals-label">Paid:</div>
                            <div class="totals-value">₹${(inv.paidAmount || 0).toFixed(2)}</div>
                        </div>
                        <div class="totals-row">
                            <div class="totals-label">Balance Due:</div>
                            <div class="totals-value">₹${(inv.balanceAmount || 0).toFixed(2)}</div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="footer">
                    <p>(Thank You)</p>
                    <p>Signature: _________________________</p>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    function closePaymentModal2() {
        setIsAnimating(false)
        setTimeout(() => {
            setIsPaymentModalOpen(false)
            setPaymentInvoice(null)
        }, 200)
    }

    // Bulk selection handlers
    function toggleSelectInvoice(id: number) {
        const newSelected = new Set(selectedInvoiceIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedInvoiceIds(newSelected)
    }

    function toggleSelectAll() {
        const filteredInvs = getFilteredAndSortedInvoices()
        
        if (selectedInvoiceIds.size === filteredInvs.length) {
            // Deselect all
            setSelectedInvoiceIds(new Set())
        } else {
            // Select all filtered invoices
            setSelectedInvoiceIds(new Set(filteredInvs.map(inv => inv.id)))
        }
    }

    function toggleExpandRow(id: number) {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
    }

    function getFilteredAndSortedInvoices() {
        // Filter invoices
        let filtered = invoices.filter(inv => {
            const matchesSearch = searchQuery ?
                inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase())
                : true
            
            const matchesStatus = filterStatus ?
                inv.status === filterStatus
                : true
            
            return matchesSearch && matchesStatus
        })

        // Sort invoices
        filtered.sort((a, b) => {
            let compareResult = 0
            
            if (sortField === 'invoiceNumber') {
                compareResult = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '')
            } else if (sortField === 'customerName') {
                compareResult = (a.customerName || '').localeCompare(b.customerName || '')
            } else if (sortField === 'invoiceDate') {
                const dateA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0
                const dateB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0
                compareResult = dateA - dateB
            } else if (sortField === 'totalAmount') {
                compareResult = (a.totalAmount || 0) - (b.totalAmount || 0)
            } else if (sortField === 'balanceAmount') {
                compareResult = (a.balanceAmount || 0) - (b.balanceAmount || 0)
            } else if (sortField === 'status') {
                compareResult = (a.status || '').localeCompare(b.status || '')
            } else if (sortField === 'createdAt') {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                compareResult = dateA - dateB
            }
            
            return sortOrder === 'asc' ? compareResult : -compareResult
        })

        return filtered
    }

    // Delete functions
    async function deleteInvoice(id: number) {
        setConfirmModal({ open: true, id, message: 'Are you sure you want to delete this invoice?' })
        setTimeout(() => setConfirmModalAnimating(true), 10)
    }

    function openBulkDeleteConfirm() {
        setConfirmModal({
            open: true,
            deleteMultiple: true,
            message: `Are you sure you want to delete ${selectedInvoiceIds.size} selected invoice(s)?`
        })
        setTimeout(() => setConfirmModalAnimating(true), 10)
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
        
        closeConfirmModal()
        setDeleting(true)
        
        try {
            if (confirmModal.deleteMultiple) {
                // Delete multiple invoices with progress tracking
                const idsArray = Array.from(selectedInvoiceIds)
                const total = idsArray.length
                setDeleteProgress({ current: 0, total })
                
                // Delete in chunks for better progress tracking
                const CHUNK_SIZE = 100
                let completed = 0
                let failed = 0
                
                for (let i = 0; i < idsArray.length; i += CHUNK_SIZE) {
                    const chunk = idsArray.slice(i, i + CHUNK_SIZE)
                    const deletePromises = chunk.map(async (invoiceId) => {
                        try {
                            const res = await fetch(`/api/customer-invoices/${invoiceId}`, { method: 'DELETE' })
                            if (!res.ok && res.status !== 404) {
                                throw new Error('Delete failed')
                            }
                            return { success: true, id: invoiceId }
                        } catch (error) {
                            console.error(`Failed to delete invoice ${invoiceId}:`, error)
                            return { success: false, id: invoiceId }
                        }
                    })
                    
                    const results = await Promise.all(deletePromises)
                    completed += results.filter(r => r.success).length
                    failed += results.filter(r => !r.success).length
                    
                    setDeleteProgress({ current: i + chunk.length, total })
                }
                
                await fetchInvoices()
                setSelectedInvoiceIds(new Set())
                
                if (failed > 0) {
                    showError(`Deleted ${completed} invoice(s), ${failed} failed`)
                } else {
                    showSuccess(`Successfully deleted ${completed} invoice(s)`)
                }
                setDeleteProgress({ current: 0, total: 0 })
            } else {
                // Single delete
                const res = await fetch(`/api/customer-invoices/${id}`, { method: 'DELETE' })
                if (!res.ok) {
                    if (res.status === 404) {
                        showError('Invoice not found - it may have already been deleted')
                    } else {
                        throw new Error('Delete failed')
                    }
                    return
                }
                await fetchInvoices()
                showSuccess('Invoice deleted successfully')
            }
        } catch (error: any) {
            console.error('Delete error:', error)
            showError(error.message || 'Failed to delete invoice(s)')
        } finally {
            setDeleting(false)
        }
    }

    // Export functions
    function exportData(format: 'csv' | 'json' | 'xlsx') {
        const dataToExport = selectedInvoiceIds.size > 0
            ? invoices.filter(inv => selectedInvoiceIds.has(inv.id))
            : getFilteredAndSortedInvoices()

        if (dataToExport.length === 0) {
            showError('No data to export')
            return
        }

        if (format === 'csv') {
            exportToCSV(dataToExport)
        } else if (format === 'json') {
            exportToJSON(dataToExport)
        } else if (format === 'xlsx') {
            exportToExcel(dataToExport)
        }
        
        setShowExportDropdown(false)
    }

    const exportToCSV = (data: any[]) => {
        const headers = ['Invoice Number', 'Customer', 'Phone', 'Email', 'Date', 'Due Date', 'Total Amount', 'Paid Amount', 'Balance', 'Status']
        const rows = data.map(inv => [
            inv.invoiceNumber || '',
            inv.customerName || '',
            inv.customerPhone || '',
            inv.customerEmail || '',
            inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '',
            inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '',
            inv.totalAmount?.toFixed(2) || '0.00',
            inv.paidAmount?.toFixed(2) || '0.00',
            inv.balanceAmount?.toFixed(2) || '0.00',
            inv.status || ''
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        
        showSuccess(`Exported ${data.length} invoice(s) to CSV`)
    }

    const exportToJSON = (data: any[]) => {
        const jsonData = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonData], { type: 'application/json' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `invoices_${new Date().toISOString().split('T')[0]}.json`
        link.click()
        
        showSuccess(`Exported ${data.length} invoice(s) to JSON`)
    }

    const exportToExcel = (data: any[]) => {
        const worksheet = XLSX.utils.json_to_sheet(data.map(inv => ({
            'Invoice Number': inv.invoiceNumber || '',
            'Customer': inv.customerName || '',
            'Phone': inv.customerPhone || '',
            'Email': inv.customerEmail || '',
            'Invoice Date': inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '',
            'Due Date': inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '',
            'Total Amount': inv.totalAmount || 0,
            'Paid Amount': inv.paidAmount || 0,
            'Balance': inv.balanceAmount || 0,
            'Status': inv.status || ''
        })))
        
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices')
        XLSX.writeFile(workbook, `invoices_${new Date().toISOString().split('T')[0]}.xlsx`)
        
        showSuccess(`Exported ${data.length} invoice(s) to Excel`)
    }

    const handlePDFUpload = async (file: File) => {
        try {
            setLoading(true)
            showInfo('Processing PDF file...')
            
            const formData = new FormData()
            formData.append('pdf', file)
            
            const response = await fetch('/api/invoices/parse-pdf', {
                method: 'POST',
                body: formData
            })
            
            if (!response.ok) {
                throw new Error('Failed to parse PDF')
            }
            
            const result = await response.json()
            
            if (result.error) {
                throw new Error(result.error)
            }
            
            // Populate form with extracted data
            setForm({
                ...emptyForm,
                customerName: result.customerName || '',
                customerEmail: result.customerEmail || '',
                customerPhone: result.customerPhone || '',
                customerAddress: result.customerAddress || '',
                customerGSTIN: result.customerGSTIN || '',
                invoiceDate: result.invoiceDate || new Date().toISOString().split('T')[0],
                dueDate: result.dueDate || '',
                discount: result.discount || '',
                notes: result.notes || '',
                items: result.items && result.items.length > 0 ? result.items : [{ productId: '', description: '', quantity: '', unitPrice: '', taxRate: '', discount: '' }]
            })
            
            setIsImportModalOpen(false)
            setIsModalOpen(true)
            setIsAnimating(true)
            
            showSuccess('PDF data extracted successfully! Please review and save.')
        } catch (error: any) {
            console.error('PDF import error:', error)
            showError(error.message || 'Failed to import PDF. Please try again or enter data manually.')
        } finally {
            setLoading(false)
        }
    }

    function calculateItemTotal(item: any) {
        const quantity = Number(item.quantity) || 0
        const unitPrice = Number(item.unitPrice) || 0
        const taxRate = Number(item.taxRate) || 0
        const discount = Number(item.discount) || 0

        const subtotal = quantity * unitPrice
        const afterDiscount = subtotal - discount
        const tax = afterDiscount * (taxRate / 100)

        return afterDiscount + tax
    }

    function calculateInvoiceTotal() {
        const itemsTotal = form.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
        const discount = Number(form.discount) || 0

        return itemsTotal - discount
    }

    async function generateInvoicesFromVisits() {
        const { addTask, updateTask } = importContext
        
        const taskId = addTask({
            type: 'invoices',
            operation: 'generate',
            status: 'generating',
            progress: { current: 0, total: 0 },
            summary: { success: 0, errors: 0 }
        })
        
        setCurrentGenerationTaskId(taskId)
        setIsGeneratingModalOpen(true)
        const abortController = new AbortController()
        setGenerationAbortController(abortController)
        
        try {
            const response = await fetch('/api/invoices/generate-from-visits', {
                method: 'POST',
                signal: abortController.signal
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            if (!response.body) {
                throw new Error('No response body')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                
                if (done) {
                    console.log('Stream complete')
                    break
                }

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            console.log('Received data:', data)
                            
                            if (data.type === 'progress') {
                                updateTask(taskId, {
                                    progress: { current: data.current || 0, total: data.total || 0 },
                                    summary: { success: data.created || 0, errors: data.errors || 0, skipped: data.skipped || 0 }
                                })
                            } else if (data.type === 'cancelled') {
                                updateTask(taskId, {
                                    status: 'cancelled',
                                    endTime: Date.now()
                                })
                                showInfo('Invoice generation cancelled')
                                setCurrentGenerationTaskId(null)
                                setIsGeneratingModalOpen(false)
                                setGenerationAbortController(null)
                                break
                            } else if (data.type === 'complete') {
                                updateTask(taskId, {
                                    status: 'success',
                                    endTime: Date.now(),
                                    progress: { current: data.total, total: data.total },
                                    summary: { success: data.created, errors: data.failed, skipped: data.skipped || 0 }
                                })
                                
                                // Refresh invoice list
                                await fetchInvoices()
                                setCurrentGenerationTaskId(null)
                                setIsGeneratingModalOpen(false)
                                setGenerationAbortController(null)
                            } else if (data.type === 'error') {
                                throw new Error(data.error)
                            }
                        } catch (parseError) {
                            console.error('Error parsing SSE data:', parseError, 'Line:', line)
                        }
                    }
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                updateTask(taskId, {
                    status: 'cancelled',
                    endTime: Date.now()
                })
                showInfo('Invoice generation cancelled')
            } else {
                console.error('Generate invoices error:', error)
                updateTask(taskId, {
                    status: 'error',
                    endTime: Date.now(),
                    error: error.message || 'Failed to generate invoices from visits'
                })
                showError(error.message || 'Failed to generate invoices from visits')
            }
            setCurrentGenerationTaskId(null)
            setIsGeneratingModalOpen(false)
            setGenerationAbortController(null)
        }
    }

    function cancelGeneration() {
        setShowCancelGenerationConfirm(true)
        setTimeout(() => setCancelConfirmAnimating(true), 10)
    }

    function confirmCancelGeneration() {
        if (generationAbortController) {
            generationAbortController.abort()
        }
        setShowCancelGenerationConfirm(false)
        setCancelConfirmAnimating(false)
    }

    function closeCancelConfirm() {
        setCancelConfirmAnimating(false)
        setTimeout(() => setShowCancelGenerationConfirm(false), 300)
    }

    const filteredInvoices = getFilteredAndSortedInvoices()
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">
                        Customer Invoices
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Generate and manage customer invoices</p>
                </div>
                {user && (
                    <div className="flex gap-2">
                        <RefreshButton onRefresh={fetchInvoices} />
                        <button 
                            onClick={() => setIsImportModalOpen(true)}
                            className="btn bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200 dark:shadow-green-900/50 transition-all duration-200 flex items-center gap-2 px-2 sm:px-4"
                            title="Import PDF invoices"
                            aria-label="Import PDF invoices"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="font-semibold hidden sm:inline">Import PDF</span>
                        </button>
                        <div className="relative">
                            <button 
                                onClick={() => setShowExportDropdown(!showExportDropdown)}
                                className="btn bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transition-all duration-200 flex items-center gap-2 shadow-lg shadow-green-200 dark:shadow-green-900/50 px-2 sm:px-4"
                                title={selectedInvoiceIds.size > 0 ? `Export ${selectedInvoiceIds.size} selected` : 'Export All'}
                                aria-label={selectedInvoiceIds.size > 0 ? `Export ${selectedInvoiceIds.size} selected` : 'Export All'}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                                <span className="font-semibold hidden sm:inline">{selectedInvoiceIds.size > 0 ? `Export (${selectedInvoiceIds.size})` : 'Export All'}</span>
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
                            onClick={() => setIsImportModalOpen(true)} 
                            className="btn bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200 dark:shadow-green-900/50 transition-all duration-200 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="hidden sm:inline font-semibold">Import</span>
                        </button>
                        <button
                            onClick={generateInvoicesFromVisits}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="hidden sm:inline font-semibold">{loading ? 'Generating...' : 'Generate from Visits'}</span>
                            <span className="sm:hidden text-sm font-semibold">{loading ? 'Gen...' : 'Generate'}</span>
                        </button>
                        <button
                            onClick={() => {
                                setIsModalOpen(true)
                                setIsAnimating(false)
                                setTimeout(() => setIsAnimating(true), 10)
                            }}
                            className="btn btn-primary flex items-center gap-1"
                        >
                            <span className="text-lg">+</span>
                            <span className="hidden sm:inline">Create Invoice</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Search and Filter Bar */}
            <div className="relative rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-3 sm:p-4 mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <div className="flex-1 relative min-w-0">
                        <input
                            type="text"
                            placeholder="🔍 Search invoices..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-2 sm:p-3 pr-10 text-sm sm:text-base border border-emerald-200 dark:border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                    <div className={`w-full sm:w-48 ${isFilterStatusOpen ? 'relative z-[10000]' : 'relative z-0'}`}>
                        <CustomSelect
                            value={filterStatus}
                            onChange={(value) => setFilterStatus(value)}
                            options={[
                                { value: '', label: 'All Status' },
                                { value: 'unpaid', label: 'Unpaid' },
                                { value: 'partial', label: 'Partially Paid' },
                                { value: 'paid', label: 'Paid' }
                            ]}
                            placeholder="All Status"
                            onOpenChange={setIsFilterStatusOpen}
                        />
                    </div>
                    {(searchQuery || filterStatus) && (
                        <button
                            onClick={() => {
                                setSearchQuery('')
                                setFilterStatus('')
                            }}
                            className="px-3 sm:px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Invoices Table */}
            <div className="relative rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-white via-emerald-50 to-green-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 shadow-lg shadow-emerald-500/10 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none rounded-xl"></div>
                <h3 className="relative text-lg font-semibold mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-3">
                        <label className="relative group/checkbox cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={filteredInvoices.length > 0 && selectedInvoiceIds.size === filteredInvoices.length}
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
                        <span className="font-bold text-gray-900 dark:text-gray-100">Invoice Records {selectedInvoiceIds.size > 0 && <span className="px-2 py-0.5 ml-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">({selectedInvoiceIds.size} selected)</span>}</span>
                    </span>
                    <span className="badge">{filteredInvoices.length} invoices</span>
                </h3>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                        <p className="text-muted">Loading invoices...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="relative text-center py-12 text-gray-500 dark:text-gray-400">
                        <p className="text-lg mb-2">No invoices found</p>
                        <p className="text-sm">Try adjusting your search or create a new invoice</p>
                    </div>
                ) : (
                    <>
                        <div className="relative space-y-2">
                            {paginatedInvoices.map(inv => {
                                const isExpanded = expandedRows.has(inv.id)
                                return (
                                    <div key={inv.id} className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-300 ${selectedInvoiceIds.has(inv.id) ? 'ring-2 ring-green-500 shadow-xl shadow-green-100 dark:shadow-green-900/30 bg-gradient-to-r from-green-50/30 to-emerald-50/30 dark:from-gray-800 dark:to-gray-800' : ''}`}>
                                        {/* Summary Row */}
                                        <div className="bg-gray-50 dark:bg-gray-800 p-3 flex items-center gap-3">
                                            {/* Checkbox */}
                                            <div className="flex-shrink-0">
                                                <label className="relative group/checkbox cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedInvoiceIds.has(inv.id)}
                                                        onChange={() => toggleSelectInvoice(inv.id)}
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

                                            {/* Invoice Info - Clickable to expand */}
                                            <div 
                                                className="flex-1 min-w-0 cursor-pointer"
                                                onClick={() => toggleExpandRow(inv.id)}
                                            >
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                        {inv.invoiceNumber}
                                                    </span>
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {inv.customerName}
                                                    </span>
                                                    {inv.customerPhone && (
                                                        <span className="text-xs text-muted">
                                                            📞 {inv.customerPhone}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted mt-1 flex items-center gap-3 flex-wrap">
                                                    <span>📅 {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '-'}</span>
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                                        Total: ₹{(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        printInvoice(inv)
                                                    }}
                                                    className="px-2 sm:px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-1"
                                                    title="Print Invoice"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                    </svg>
                                                    <span className="hidden sm:inline">Print</span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        editInvoice(inv)
                                                    }}
                                                    className="px-2 sm:px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    <span className="hidden sm:flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Edit
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deleteInvoice(inv.id)
                                                    }}
                                                    disabled={!user}
                                                    className="px-2 sm:px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    title="Delete"
                                                >
                                                    <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    <span className="hidden sm:flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Delete
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleExpandRow(inv.id)
                                                    }}
                                                    className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1 transition-transform duration-200"
                                                    title={isExpanded ? "Collapse" : "Expand"}
                                                >
                                                    <svg className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {inv.customerEmail && (
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Email</div>
                                                            <div className="text-sm font-medium">{inv.customerEmail}</div>
                                                        </div>
                                                    )}
                                                    {inv.customerAddress && (
                                                        <div className="md:col-span-2">
                                                            <div className="text-xs text-muted mb-1">Address</div>
                                                            <div className="text-sm font-medium">{inv.customerAddress}</div>
                                                        </div>
                                                    )}
                                                    {inv.customerGSTIN && (
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">GSTIN</div>
                                                            <div className="text-sm font-medium">{inv.customerGSTIN}</div>
                                                        </div>
                                                    )}
                                                    {inv.dueDate && (
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Due Date</div>
                                                            <div className="text-sm font-medium">{new Date(inv.dueDate).toLocaleDateString()}</div>
                                                        </div>
                                                    )}
                                                    {inv.discount > 0 && (
                                                        <div>
                                                            <div className="text-xs text-muted mb-1">Discount</div>
                                                            <div className="text-sm font-medium text-green-600">₹{inv.discount}</div>
                                                        </div>
                                                    )}
                                                    {inv.notes && (
                                                        <div className="col-span-2 md:col-span-4">
                                                            <div className="text-xs text-muted mb-1">Notes</div>
                                                            <div className="text-sm font-medium">{inv.notes}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination Controls */}
                        {filteredInvoices.length > itemsPerPage && (
                            <div className="mt-6 flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    title="Previous page"
                                    aria-label="Previous page"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span className="hidden sm:inline">Previous</span>
                                </button>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Page {currentPage} of {Math.ceil(filteredInvoices.length / itemsPerPage)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredInvoices.length / itemsPerPage), prev + 1))}
                                    disabled={currentPage === Math.ceil(filteredInvoices.length / itemsPerPage)}
                                    className="px-2 sm:px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    title="Next page"
                                    aria-label="Next page"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create/Edit Invoice Modal */}
            {isModalOpen && (
                <div className={`fixed inset-0 bg-black transition-opacity duration-300 ${isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`} style={{ zIndex: 9999 }} onClick={closeModal}>
                    <div className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-300 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ zIndex: 10000 }}>
                        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30 bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-900 shadow-lg shadow-emerald-500/20 backdrop-blur-sm max-w-5xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-transparent to-green-500/5 pointer-events-none"></div>
                            
                            {/* Header */}
                            <div className="relative bg-gradient-to-r from-emerald-50 to-green-50 dark:from-gray-800 dark:to-gray-800 px-4 sm:px-6 py-3 sm:py-4 border-b border-emerald-200/30 dark:border-emerald-700/30">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 flex items-center gap-2">
                                        {editingId ? (
                                            <>
                                                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit Invoice
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                New Invoice
                                            </>
                                        )}
                                    </h2>
                                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Form Content - Scrollable */}
                            <div className="relative p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                                    {/* Customer Information Section */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">👤 Customer Information</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div className={isPatientSelectOpen ? 'relative z-[10000]' : 'relative z-0'}>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Patient (Optional)</label>
                                                <CustomSelect
                                                    value={form.patientId}
                                                    onChange={(value) => {
                                                        setForm({ ...form, patientId: value })
                                                        if (value) fillFromPatient(value)
                                                    }}
                                                    options={[
                                                        { value: '', label: 'Select patient' },
                                                        ...patients.map(p => ({
                                                            value: p.id.toString(),
                                                            label: `${p.firstName} ${p.lastName}${p.opdNo ? ` (${p.opdNo})` : ''}`
                                                        }))
                                                    ]}
                                                    placeholder="Select patient"
                                                    onOpenChange={setIsPatientSelectOpen}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Customer Name *</label>
                                                <input
                                                    required
                                                    placeholder="Enter customer name"
                                                    value={form.customerName}
                                                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                                                <input
                                                    type="email"
                                                    placeholder="customer@example.com"
                                                    value={form.customerEmail}
                                                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
                                                <input
                                                    type="tel"
                                                    placeholder="+91 98765 43210"
                                                    value={form.customerPhone}
                                                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
                                                <textarea
                                                    placeholder="Customer address"
                                                    value={form.customerAddress}
                                                    onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                                                    rows={2}
                                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">GSTIN (Optional)</label>
                                                <input
                                                    placeholder="22AAAAA0000A1Z5"
                                                    value={form.customerGSTIN}
                                                    onChange={(e) => setForm({ ...form, customerGSTIN: e.target.value.toUpperCase() })}
                                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Invoice Details Section */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">📅 Invoice Details</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Invoice Date *</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={form.invoiceDate}
                                                    onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date</label>
                                                <input
                                                    type="date"
                                                    value={form.dueDate}
                                                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Discount (₹)</label>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={form.discount}
                                                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Line Items Section */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">🛒 Line Items</h3>
                                            <button
                                                type="button"
                                                onClick={addItem}
                                                className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all shadow-md"
                                            >
                                                ➕ Add Item
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {form.items.map((item, index) => (
                                                <div key={index} className="relative p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                                                    <div className="grid grid-cols-6 gap-3">
                                                        <div className={`col-span-2 ${isProductSelectOpen[index] ? 'relative z-[10000]' : 'relative z-0'}`}>
                                                            <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Product</label>
                                                            <CustomSelect
                                                                value={item.productId}
                                                                onChange={(value) => updateItem(index, 'productId', value)}
                                                                options={[
                                                                    { value: '', label: '-- Optional --' },
                                                                    ...products.map(p => ({
                                                                        value: p.id.toString(),
                                                                        label: p.name
                                                                    }))
                                                                ]}
                                                                placeholder="Select product"
                                                                onOpenChange={(isOpen) => setIsProductSelectOpen(prev => ({...prev, [index]: isOpen}))}
                                                            />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Description *</label>
                                                            <input
                                                                required
                                                                placeholder="Item description"
                                                                value={item.description}
                                                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Quantity *</label>
                                                            <input
                                                                type="number"
                                                                required
                                                                placeholder="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                                min="1"
                                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Price *</label>
                                                            <input
                                                                type="number"
                                                                required
                                                                placeholder="0.00"
                                                                value={item.unitPrice}
                                                                onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                                                min="0"
                                                                step="0.01"
                                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                                                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                            Total: ₹{calculateItemTotal(item).toFixed(2)}
                                                        </div>
                                                        {form.items.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(index)}
                                                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md transition-colors flex items-center gap-1"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Total Section */}
                                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white">💰 Invoice Total:</span>
                                            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">
                                                ₹{calculateInvoiceTotal().toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Notes Section */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">📝 Notes</label>
                                        <textarea
                                            placeholder="Add any additional notes or comments..."
                                            value={form.notes}
                                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                            rows={3}
                                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            disabled={submitting}
                                            className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting || !user}
                                            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                                        >
                                            {submitting ? 'Saving...' : (editingId ? '✓ Update Invoice' : '✓ Create Invoice')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && paymentInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Invoice: {paymentInvoice.invoiceNumber}</p>
                            </div>
                            <button
                                onClick={closePaymentModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {/* Content */}
                        <form onSubmit={handlePayment}>
                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Balance Due:</span>
                                    <span className="font-bold text-lg text-red-600 dark:text-red-400">
                                        ₹{(paymentInvoice.balanceAmount || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Payment Amount (₹) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        max={paymentInvoice.balanceAmount}
                                        step="0.01"
                                        placeholder="Enter payment amount"
                                    />
                                </div>

                                <div className={isPaymentMethodOpen ? 'relative z-[10000]' : 'relative z-0'}>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Payment Method *</label>
                                    <CustomSelect
                                        value={paymentForm.paymentMethod}
                                        onChange={(value) => setPaymentForm({ ...paymentForm, paymentMethod: value })}
                                        options={[
                                            { value: 'CASH', label: 'Cash' },
                                            { value: 'CARD', label: 'Card' },
                                            { value: 'UPI', label: 'UPI' },
                                            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                                            { value: 'CHEQUE', label: 'Cheque' }
                                        ]}
                                        placeholder="Select payment method"
                                        required
                                        onOpenChange={setIsPaymentMethodOpen}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closePaymentModal}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!user}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmModal.open && (
                <div className={`fixed inset-0 bg-black transition-opacity duration-300 z-50 ${confirmModalAnimating ? 'bg-opacity-50' : 'bg-opacity-0'}`} onClick={closeConfirmModal}>
                    <div className={`fixed inset-0 flex items-center justify-center p-4 z-50 transition-all duration-300 ${confirmModalAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                        <div className="bg-gradient-to-br from-white via-red-50/50 to-white dark:from-gray-900 dark:via-red-900/20 dark:to-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-red-200 dark:border-red-700" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-full ring-4 ring-red-100 dark:ring-red-900/20">
                                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
                                Confirm Delete
                            </h3>
                            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
                                {confirmModal.message}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={closeConfirmModal}
                                    className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleConfirmDelete(confirmModal.id)} 
                                    disabled={deleting} 
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl font-medium"
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

            {/* Delete Progress Modal (for bulk deletes) */}
            {deleting && deleteProgress.total > 0 && !isDeleteMinimized && (
                <div className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="relative overflow-hidden rounded-2xl border border-red-200/30 dark:border-red-700/30 bg-gradient-to-br from-white via-red-50/30 to-orange-50/20 dark:from-gray-900 dark:via-red-950/20 dark:to-gray-900 shadow-2xl shadow-red-500/20 max-w-md w-full">
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 via-transparent to-orange-500/5 pointer-events-none" />
                        
                        <div className="relative p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400">Deleting Invoices</h3>
                                <button
                                    onClick={() => setIsDeleteMinimized(true)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/40 rounded-full shadow-lg shadow-red-500/20 animate-pulse flex items-center justify-center">
                                    <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                            </div>
                            
                            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 mb-2 text-center tabular-nums">
                                {deleteProgress.current} / {deleteProgress.total}
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                                {Math.round((deleteProgress.current / deleteProgress.total) * 100)}% Complete
                            </p>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 overflow-hidden shadow-inner">
                                <div 
                                    className="bg-gradient-to-r from-red-500 via-red-600 to-orange-600 rounded-full shadow-lg shadow-red-500/50 h-5 transition-all duration-300 ease-out flex items-center justify-end pr-2"
                                    style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                                >
                                    <span className="text-xs text-white font-medium">
                                        {deleteProgress.current > 0 && `${Math.round((deleteProgress.current / deleteProgress.total) * 100)}%`}
                                    </span>
                                </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 text-center">
                                Please wait, deleting invoice {deleteProgress.current} of {deleteProgress.total}...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Export Button */}
            {selectedInvoiceIds.size > 0 && (
                <div className="relative">
                    <button
                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                        className="fixed bottom-8 right-40 z-50 group"
                        title={`Export ${selectedInvoiceIds.size} selected invoice(s)`}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-200"></div>
                            <div className="relative w-14 h-14 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 transform group-hover:scale-110">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                                <span className="absolute -top-1 -right-1 min-w-[24px] h-5 px-1.5 bg-green-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
                                    {selectedInvoiceIds.size}
                                </span>
                            </div>
                        </div>
                    </button>
                    {showExportDropdown && (
                        <div className="fixed bottom-24 right-40 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-green-200 dark:border-green-900 z-[9999] overflow-hidden">
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
            {selectedInvoiceIds.size > 0 && (
                <button
                    onClick={() => {
                        setConfirmModal({ open: true, deleteMultiple: true, message: `Are you sure you want to delete ${selectedInvoiceIds.size} selected invoice(s)?` })
                        setConfirmModalAnimating(true)
                    }}
                    className="fixed bottom-8 right-24 z-50 group"
                    title={`Delete ${selectedInvoiceIds.size} selected invoice(s)`}
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-200 animate-pulse"></div>
                        <div className="relative w-14 h-14 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 transform group-hover:scale-110">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="absolute -top-1 -right-1 min-w-[24px] h-5 px-1.5 bg-red-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
                                {selectedInvoiceIds.size}
                            </span>
                        </div>
                    </div>
                </button>
            )}

            {submitting && (
                <LoadingModal isOpen={true} message="Processing..." />
            )}

            {/* Generation Progress Modal */}
            {isGeneratingModalOpen && currentGenerationTaskId && (() => {
                const task = importContext.tasks.find(t => t.id === currentGenerationTaskId)
                if (!task) return null
                
                return (
                    <div className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
                        <div 
                            className="bg-gradient-to-br from-white via-emerald-50/50 to-white dark:from-gray-800 dark:via-emerald-900/20 dark:to-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full animate-fadeIn border-2 border-emerald-200 dark:border-emerald-700"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span className="text-gray-800 dark:text-white">Generating Invoices from Visits</span>
                                </h2>
                                <button
                                    onClick={() => {
                                        setIsGeneratingModalOpen(false)
                                        // Task will continue in background and show in notifications
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    title="Minimize to notification"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Progress Bar */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            {task.progress.total > 0 
                                                ? `Processing: ${task.progress.current} / ${task.progress.total}`
                                                : 'Initializing...'}
                                        </span>
                                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                            {task.progress.total > 0 ? Math.round((task.progress.current / task.progress.total) * 100) : 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                                        <div 
                                            className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 h-3 rounded-full transition-all duration-300 ease-out shadow-lg"
                                            style={{ 
                                                width: `${task.progress.total > 0 ? (task.progress.current / task.progress.total) * 100 : 0}%`,
                                                minWidth: task.progress.total === 0 ? '20%' : '0%'
                                            }}
                                        >
                                            {task.progress.total === 0 && (
                                                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10 rounded-xl p-4 border-2 border-green-200 dark:border-green-800 shadow-sm">
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                                            {task.summary?.success || 0}
                                        </div>
                                        <div className="text-xs font-semibold text-green-700 dark:text-green-300 mt-1 uppercase tracking-wide">
                                            ✓ Created
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-900/10 rounded-xl p-4 border-2 border-yellow-200 dark:border-yellow-800 shadow-sm">
                                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 tabular-nums">
                                            {task.summary?.skipped || 0}
                                        </div>
                                        <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 mt-1 uppercase tracking-wide">
                                            ⊘ Skipped
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10 rounded-xl p-4 border-2 border-red-200 dark:border-red-800 shadow-sm">
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                                            {task.summary?.errors || 0}
                                        </div>
                                        <div className="text-xs font-semibold text-red-700 dark:text-red-300 mt-1 uppercase tracking-wide">
                                            ✕ Errors
                                        </div>
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-xl p-4 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
                                    <div className="flex gap-3">
                                        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="text-sm text-emerald-700 dark:text-emerald-300">
                                            <p className="font-semibold mb-1.5">What's happening:</p>
                                            <ul className="space-y-1 text-xs leading-relaxed">
                                                <li className="flex items-start gap-2">
                                                    <span className="text-emerald-500 mt-0.5">•</span>
                                                    <span>Processing visits in batches of 100 for optimal performance</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-emerald-500 mt-0.5">•</span>
                                                    <span>Creating invoices from visit prescriptions (skipping duplicates)</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-emerald-500 mt-0.5">•</span>
                                                    <span>Updating product stock levels and creating transactions</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-emerald-500 mt-0.5">•</span>
                                                    <span>Skipping visits that already have invoices</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Cancel Button */}
                                <div className="flex gap-3 justify-end pt-2">
                                    <button 
                                        onClick={cancelGeneration}
                                        className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancel Generation
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Cancel Generation Confirmation Modal */}
            {showCancelGenerationConfirm && (
                <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10001] transition-opacity duration-300 ${cancelConfirmAnimating ? 'opacity-100' : 'opacity-0'}`}>
                    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ${cancelConfirmAnimating ? 'scale-100' : 'scale-95'}`}>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Cancel Invoice Generation?</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        This will stop the invoice generation process. Any invoices created so far will be saved.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={closeCancelConfirm}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Continue Generating
                                </button>
                                <button
                                    onClick={confirmCancelGeneration}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                >
                                    Yes, Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <div 
                    className="fixed inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
                    onClick={() => setIsImportModalOpen(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full animate-fadeIn border border-gray-200 dark:border-gray-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Import Invoice from PDF
                            </h2>
                            <button 
                                onClick={() => setIsImportModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                                <input 
                                    type="file" 
                                    accept=".pdf"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            handlePDFUpload(file)
                                        }
                                    }}
                                    className="hidden"
                                    id="pdf-upload"
                                />
                                <label 
                                    htmlFor="pdf-upload" 
                                    className="cursor-pointer flex flex-col items-center gap-3"
                                >
                                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <div>
                                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Click to upload PDF</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">PDF files only</p>
                                </label>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-sm text-blue-700 dark:text-blue-300">
                                        <p className="font-semibold mb-1">How it works:</p>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            <li>Upload a PDF invoice file</li>
                                            <li>The system will extract invoice details automatically</li>
                                            <li>Review and edit the extracted data</li>
                                            <li>Save to create the invoice in your system</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button 
                                    onClick={() => setIsImportModalOpen(false)}
                                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </div>
    )
}
