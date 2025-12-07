import { useRouter } from 'next/router'
import { useEffect, useState, useRef } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

export default function VisitDetail() {
    const router = useRouter()
    const { id } = router.query
    const [visit, setVisit] = useState<any>(null)
    const [products, setProducts] = useState<any[]>([])
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const [copyType, setCopyType] = useState<'PATIENT' | 'OFFICE'>('PATIENT')
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)
    const [showPrintDropdown, setShowPrintDropdown] = useState(false)
    const [showPrintSubmenu, setShowPrintSubmenu] = useState<'PATIENT' | 'OFFICE' | 'BOTH' | null>(null)
    const [showReportsDropdown, setShowReportsDropdown] = useState(false)
    const [reportsAttachments, setReportsAttachments] = useState<Array<{ url: string, name: string, type: string }>>([])
    const [selectedReportUrl, setSelectedReportUrl] = useState<string | null>(null)
    const [selectedReportName, setSelectedReportName] = useState<string>('')
    const [isPdfReady, setIsPdfReady] = useState(false)
    const prescriptionRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!id) return
        // Fetch the specific visit by ID instead of all visits
        fetch(`/api/visits?id=${id}`).then(r => r.json()).then(visitData => {
            setVisit(visitData)
            // Parse reportsAttachments if it exists (stored as JSON string)
            if (visitData.reportsAttachments) {
                try {
                    const parsed = JSON.parse(visitData.reportsAttachments)
                    if (Array.isArray(parsed)) {
                        setReportsAttachments(parsed)
                    }
                } catch (e) {
                    console.error('Failed to parse reportsAttachments:', e)
                    setReportsAttachments([])
                }
            }
        })

        // Fetch products for medicine names
        fetch('/api/products').then(r => r.json()).then(data => {
            setProducts(data)
        }).catch(err => console.error('Failed to fetch products:', err))
    }, [id])

    // Effect to check when DOM is ready for PDF generation
    useEffect(() => {
        if (visit && prescriptionRef.current) {
            console.log('📋 DOM is ready for PDF generation')
            setIsPdfReady(true)
        }
    }, [visit])

    // Separate effect to handle PDF generation after DOM is ready
    useEffect(() => {
        if (!visit || !isPdfReady) {
            console.log('⏳ Waiting for PDF generation readiness...', {
                hasVisit: !!visit,
                isPdfReady
            })
            return
        }
        
        // Auto-generate and upload office PDF if not already done (skip imported visits)
        if (visit.prescriptions && visit.prescriptions.length > 0 && !visit.isImported && !visit.officeCopyPdfUrl) {
            console.log('🔍 Conditions met for PDF generation - scheduling...', {
                prescriptionCount: visit.prescriptions.length,
                isImported: visit.isImported,
                hasOfficePdf: !!visit.officeCopyPdfUrl
            })
            
            // Wait for DOM to be fully ready and rendered
            const timer = setTimeout(() => {
                if (prescriptionRef.current) {
                    console.log('✅ Starting PDF generation now!')
                    generateAndUploadPdfs(visit)
                } else {
                    console.error('❌ prescriptionRef is null even after waiting')
                }
            }, 2000)
            
            return () => clearTimeout(timer)
        } else {
            console.log('⏭️ Skipping PDF generation:', {
                hasPrescriptions: !!(visit.prescriptions && visit.prescriptions.length > 0),
                isImported: visit.isImported,
                hasOfficePdf: !!visit.officeCopyPdfUrl
            })
        }
    }, [visit, isPdfReady])

    const generateAndUploadPdfs = async (visitData: any) => {
        if (!visitData || !prescriptionRef.current) {
            console.log('❌ Cannot generate PDFs: missing visitData or prescriptionRef', {
                hasVisitData: !!visitData,
                hasPrescriptionRef: !!prescriptionRef.current
            })
            return
        }

        try {
            console.log('🚀 Starting PDF generation for visit:', visitData.id)
            console.log('✓ prescriptionRef.current exists:', !!prescriptionRef.current)
            console.log('✓ Visit OPD No:', visitData.opdNo)

            // Wait for the component to render
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Store ref to avoid losing it during state changes
            const refElement = prescriptionRef.current

            // Generate only office copy PDF
            console.log('📄 Generating office copy...')
            const originalCopyType = copyType
            setCopyType('OFFICE')
            await new Promise(resolve => setTimeout(resolve, 800))
            
            console.log('📤 Uploading office copy to Cloudinary...')
            const officeCopyUrl = await uploadPdfToCloudinary('OFFICE', visitData, refElement)
            console.log('📋 Office copy URL:', officeCopyUrl)

            // Reset to original copy type
            setCopyType(originalCopyType)

            // Update visit with office PDF URL only
            if (officeCopyUrl) {
                console.log('✅ Updating visit with office PDF URL...')
                const updateResponse = await fetch('/api/visits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: visitData.id,
                        officeCopyPdfUrl: officeCopyUrl,
                        patientId: visitData.patientId,
                        opdNo: visitData.opdNo
                    })
                })

                if (updateResponse.ok) {
                    console.log('✅ Visit updated successfully with office PDF URL')
                    // Refresh visit data
                    const updatedVisit = await fetch(`/api/visits?id=${id}`).then(r => r.json())
                    setVisit(updatedVisit)
                } else {
                    const errorText = await updateResponse.text()
                    console.error('❌ Failed to update visit:', errorText)
                }
            } else {
                console.error('❌ Office PDF URL is null - upload failed')
            }
        } catch (error) {
            console.error('❌ Failed to generate/upload PDFs:', error)
        }
    }
    const uploadPdfToCloudinary = async (type: 'PATIENT' | 'OFFICE', visitData?: any, refElement?: HTMLDivElement | null) => {
        const currentVisit = visitData || visit
        const elementToCapture = refElement || prescriptionRef.current

        if (!currentVisit || !elementToCapture) {
            console.log('❌ Cannot upload PDF: missing visit or prescriptionRef', {
                hasVisit: !!currentVisit,
                hasRef: !!elementToCapture
            })
            return null
        }

        try {
            console.log(`📸 Capturing ${type} copy...`)
            console.log(`   Element dimensions: ${elementToCapture.scrollWidth}x${elementToCapture.scrollHeight}`)
            
            // Force A4 width
            const originalWidth = elementToCapture.style.width
            elementToCapture.style.width = '794px'
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Capture as canvas
            const canvas = await html2canvas(elementToCapture, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff',
                imageTimeout: 15000,
                scrollY: -window.scrollY,
                width: 794,
                onclone: (clonedDoc) => {
                    clonedDoc.documentElement.style.fontSize = '16px'
                    const clonedElement = clonedDoc.querySelector('.prescription-container') as HTMLElement
                    if (clonedElement) {
                        clonedElement.style.width = '794px'
                        clonedElement.style.boxShadow = 'none'
                        clonedElement.style.borderRadius = '0'
                    }
                }
            })
            
            // Restore width
            elementToCapture.style.width = originalWidth

            console.log(`✓ Canvas captured: ${canvas.width}x${canvas.height}`)

            // Convert canvas to PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            })

            const pdfWidth = 210
            const imgData = canvas.toDataURL('image/png')
            const imgProps = pdf.getImageProperties(imgData)
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight)

            // Get PDF as base64 data URI
            const pdfDataUri = pdf.output('datauristring')
            console.log(`✓ PDF generated, size: ${(pdfDataUri.length / 1024 / 1024).toFixed(2)} MB`)

            // Upload to Cloudinary with timeout
            console.log(`☁️  Uploading ${type} copy to Cloudinary...`)

            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

            try {
                const response = await fetch('/api/pdf/upload-cloudinary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pdfData: pdfDataUri,
                        filename: `${currentVisit.opdNo.replace(/\s+/g, '-')}-${type.toLowerCase()}`
                    }),
                    signal: controller.signal
                })

                clearTimeout(timeoutId)

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                    console.error(`❌ Cloudinary upload failed:`, errorData)
                    return null
                }

                const result = await response.json()
                console.log(`✅ ${type} copy uploaded successfully:`, result.url)

                return result.url
            } catch (fetchError: any) {
                clearTimeout(timeoutId)
                if (fetchError.name === 'AbortError') {
                    console.error(`⏱️  Upload timeout after 60 seconds`)
                } else {
                    console.error(`❌ Fetch error:`, fetchError)
                }
                return null
            }
        } catch (error) {
            console.error(`❌ Failed to upload ${type} copy to Cloudinary:`, error)
            return null
        }
    }

    const generatePDF = async (pdfCopyType?: 'PATIENT' | 'OFFICE') => {
        if (!visit) return

        const useCopyType = pdfCopyType || copyType
        setIsGeneratingPDF(true)

        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()

            // Fetch products and prescriptions data
            let products: any[] = []
            let prescriptions: any[] = visit.prescriptions || []

            try {
                const productsRes = await fetch('/api/products')
                products = await productsRes.json()
            } catch (error) {
                console.error('Failed to fetch products:', error)
            }

            // Function to generate a single page (will be called twice for patient and office copy)
            const generatePage = async (copyType: 'PATIENT' | 'OFFICE') => {

                let yPos = 0

                // Only add header and watermark for PATIENT copy
                if (copyType === 'PATIENT') {
                    // Add header image - full width, no margins (reduced size)
                    try {
                        const headerImg = new Image()
                        headerImg.crossOrigin = 'Anonymous'
                        await new Promise((resolve, reject) => {
                            headerImg.onload = () => {
                                doc.addImage(headerImg, 'JPEG', 0, 0, pageWidth, 25)
                                resolve(true)
                            }
                            headerImg.onerror = () => {
                                console.error('Failed to load header image')
                                resolve(false)
                            }
                            headerImg.src = '/header.png'
                        })
                        yPos = 27
                    } catch (error) {
                        console.error('Error adding header:', error)
                        yPos = 10
                    }

                    // Add watermark in center with 50% opacity - smaller size
                    try {
                        const watermark = new Image()
                        watermark.crossOrigin = 'Anonymous'
                        await new Promise((resolve) => {
                            watermark.onload = () => {
                                const wmWidth = 80
                                const wmHeight = 80
                                const wmX = (pageWidth - wmWidth) / 2
                                const wmY = (pageHeight - wmHeight) / 2 - 20 // Shifted up by 20mm
                                doc.saveGraphicsState()
                                const gState = (doc as any).GState({ opacity: 0.4 })
                                doc.setGState(gState)
                                doc.addImage(watermark, 'PNG', wmX, wmY, wmWidth, wmHeight)
                                doc.restoreGraphicsState()
                                resolve(true)
                            }
                            watermark.onerror = () => resolve(false)
                            watermark.src = '/watermark.png'
                        })
                    } catch (error) {
                        console.error('Error adding watermark:', error)
                    }
                } // End of PATIENT copy header and watermark

                // Only show patient info section for PATIENT copy
                if (copyType === 'PATIENT') {
                    // ===== PATIENT INFO SECTION (4 columns, 4 rows) =====
                    const col1X = 15        // Left column (OPDN, Date, Phone, Weight)
                    const col2X = 85        // Second column (Patient Name, F/H/G Name, Address) - moved to center
                    const col3X = 140       // Third column (Age/DOB, Gender, Visit, Height)
                    const col4X = 185       // Fourth column (Patient Image)

                    doc.setFontSize(9)
                    doc.setFont('helvetica', 'bold')

                    // Row 1
                    // Add green background only for OPDN label
                    doc.setFillColor(144, 238, 144) // Light green
                    doc.rect(col1X - 2, yPos - 4, 13, 6, 'F')

                    doc.setTextColor(0, 0, 0)
                    doc.text('OPDN:', col1X, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 255)
                    doc.text((visit.opdNo || 'N/A').toUpperCase(), col1X + 15, yPos)
                    doc.setTextColor(0, 0, 0)

                    doc.setFont('helvetica', 'bold')
                    doc.text('Patient Name:', col2X, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(255, 0, 0)
                    doc.text(`${visit.patient?.firstName || ''} ${visit.patient?.lastName || ''}`.toUpperCase(), col2X + 25, yPos)
                    doc.setTextColor(0, 0, 0)

                    doc.setFont('helvetica', 'bold')
                    doc.text('Age/DOB:', col3X, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 128, 0)
                    doc.text(`${(visit.age || visit.patient?.age || 'N/A')} YR`.toUpperCase(), col3X + 18, yPos)
                    doc.setTextColor(0, 0, 0)

                    // Add patient image (spans all 4 rows) - smaller size
                    if (visit.patient?.imageUrl) {
                        try {
                            const img = new Image()
                            img.crossOrigin = 'Anonymous'
                            await new Promise((resolve) => {
                                img.onload = () => {
                                    doc.addImage(img, 'JPEG', col4X, yPos - 3, 12, 16)
                                    resolve(true)
                                }
                                img.onerror = () => resolve(false)
                                img.src = visit.patient.imageUrl
                            })
                        } catch (error) {
                            console.error('Error adding patient image:', error)
                        }
                    }

                    yPos += 5

                    // Row 2
                    doc.setFont('helvetica', 'bold')
                    doc.text('Date:', col1X, yPos)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(0, 0, 255)
                    doc.text(new Date(visit.date).toLocaleDateString('en-GB').toUpperCase(), col1X + 15, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    doc.setFont('helvetica', 'bold')
                    doc.text('F/H/G Name:', col2X, yPos)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(128, 0, 128)
                    doc.text((visit.fatherHusbandGuardianName || visit.patient?.fatherHusbandGuardianName || 'N/A').toUpperCase(), col2X + 25, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    doc.setFont('helvetica', 'bold')
                    doc.text('Gender:', col3X, yPos)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(255, 140, 0)
                    doc.text((visit.gender || visit.patient?.gender || 'N/A').toUpperCase(), col3X + 18, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    yPos += 6

                    // Row 3
                    doc.setFont('helvetica', 'bold')
                    doc.text('Phone:', col1X, yPos)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(0, 128, 0)
                    doc.text((visit.phone || visit.patient?.phone || 'N/A').toUpperCase(), col1X + 15, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    doc.setFont('helvetica', 'bold')
                    doc.text('Address:', col2X, yPos)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(128, 0, 128)
                    const address = (visit.address || visit.patient?.address || 'N/A').toUpperCase()
                    doc.text(address.substring(0, 40), col2X + 25, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    doc.setFont('helvetica', 'bold')
                    doc.text('Visit No.:', col3X, yPos)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(0, 0, 255)
                    doc.text(`${visit.visitNumber || '1'}`.toUpperCase(), col3X + 18, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    yPos += 6

                    // Row 4
                    doc.setFont('helvetica', 'bold')
                    doc.text('Weight:', col1X, yPos)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(200, 0, 0)
                    doc.text((visit.weight ? `${visit.weight} KG` : 'N/A').toUpperCase(), col1X + 15, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    doc.setFont('helvetica', 'bold')
                    doc.text('Height:', col3X, yPos)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(200, 0, 0)
                    doc.text((visit.height ? `${visit.height} CM` : 'N/A').toUpperCase(), col3X + 18, yPos)
                    doc.setFont('helvetica', 'bold')

                    yPos += 6

                    // Orange separator line with margins
                    doc.setDrawColor(255, 140, 0)
                    doc.setLineWidth(0.5)
                    doc.line(10, yPos, pageWidth - 10, yPos)

                    yPos += 4

                    // ===== MEDICAL INFO SECTION =====
                    // Column 1: 5 rows on the left (under first column of previous section)
                    const medicalCol1X = col1X
                    const medicalCol2X = col3X  // Right side (under third column of previous section)

                    doc.setFontSize(8)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    // Column 1 - Row 1: Temperament
                    doc.text('Temperament:', medicalCol1X, yPos)
                    doc.setFont('courier', 'oblique')
                    doc.setTextColor(0, 0, 255)
                    doc.text((visit.temperament || 'N/A'), medicalCol1X + 25, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    yPos += 5

                    // Column 1 - Row 2: Pulse Diagnosis
                    doc.setFont('helvetica', 'bold')
                    doc.text('Pulse Diagnosis:', medicalCol1X, yPos)
                    doc.setFont('courier', 'oblique')
                    doc.setTextColor(0, 0, 255)
                    doc.text(([visit.pulseDiagnosis, visit.pulseDiagnosis2].filter(Boolean).join(', ') || 'N/A'), medicalCol1X + 28, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    yPos += 5

                    // Column 1 - Row 3: History/Reports
                    doc.setFont('helvetica', 'bold')
                    doc.text('History/Reports:', medicalCol1X, yPos)
                    doc.setFont('courier', 'oblique')
                    doc.setTextColor(0, 0, 255)
                    const historyText = (visit.historyReports || 'N/A')
                    const historyLines = doc.splitTextToSize(historyText, 85)
                    let historyYPos = yPos
                    historyLines.forEach((line: string, idx: number) => {
                        doc.text(line, medicalCol1X + 28, historyYPos)
                        if (idx < historyLines.length - 1) historyYPos += 4
                    })
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    yPos += Math.max(5, historyLines.length * 4)                    // Column 1 - Row 4: Major Complaints
                    doc.setFont('helvetica', 'bold')
                    doc.text('Major Complaints:', medicalCol1X, yPos)
                    doc.setFont('courier', 'oblique')
                    doc.setTextColor(0, 0, 255)
                    doc.text((visit.majorComplaints || 'N/A'), medicalCol1X + 30, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    yPos += 5

                    // Column 1 - Row 5: Improvement
                    doc.setFont('helvetica', 'bold')
                    doc.text('Improvement:', medicalCol1X, yPos)
                    doc.setFont('courier', 'oblique')
                    doc.setTextColor(0, 0, 255)
                    doc.text((visit.improvements || 'N/A'), medicalCol1X + 25, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    // Reset yPos for right column (2 rows aligned with last rows of left column)
                    const rightColYPos = yPos - 10  // Start at row 4 position

                    // Column 2 - Row 1: Investigation
                    doc.setFont('helvetica', 'bold')
                    doc.text('Investigation:', medicalCol2X, rightColYPos)
                    doc.setFont('courier', 'oblique')
                    doc.setTextColor(0, 0, 255)
                    doc.text((visit.investigations || 'N/A'), medicalCol2X + 25, rightColYPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    // Column 2 - Row 2: Prov. Diagnosis
                    doc.setFont('helvetica', 'bold')
                    doc.text('Prov. Diagnosis:', medicalCol2X, rightColYPos + 5)
                    doc.setFont('courier', 'oblique')
                    doc.setTextColor(0, 0, 255)
                    doc.text((visit.provisionalDiagnosis || visit.diagnoses || 'N/A'), medicalCol2X + 28, rightColYPos + 5)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    yPos += 5

                    // Orange separator line with margins
                    doc.setDrawColor(255, 140, 0)
                    doc.setLineWidth(0.5)
                    doc.line(10, yPos, pageWidth - 10, yPos)

                    yPos += 4

                    // ===== DISC SECTION =====
                    doc.setFontSize(9)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(200, 0, 0)
                    doc.text('DISC:', col1X, yPos)
                    doc.setFontSize(9)
                    doc.setFont('courier', 'oblique')
                    doc.setTextColor(0, 0, 255)
                    const diagnosis = visit.provisionalDiagnosis || visit.diagnoses || 'N/A'
                    doc.text(diagnosis, col1X + 15, yPos)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    yPos += 6

                    // Prepare table data with new SPY/Addition structure
                    const tableData = prescriptions.map((pr: any, index: number) => {
                        const product = products.find((p: any) => String(p.id) === String(pr.productId))
                        const row = [
                            String(index + 1),  // #
                            product?.name?.toUpperCase() || pr.treatment?.treatmentPlan?.toUpperCase() || '',  // Medicine name
                            '',  // spy1 - blank for handwriting
                            '',  // spy2 - blank for handwriting
                            '',  // spy3 - blank for handwriting
                            '',  // spy4 - blank for handwriting
                            '',  // spy5 - blank for handwriting
                            '',  // spy6 - blank for handwriting
                        ]

                        row.push(
                            (pr.timing || '').toUpperCase(),  // timing
                            (pr.dosage || '').toUpperCase(),  // dose
                            (pr.addition1 || '').toUpperCase(),  // addition1 (general)
                            (pr.procedure || '').toUpperCase(),  // procedure
                            (pr.presentation || '').toUpperCase(),  // presentation
                            (pr.droppersToday?.toString() || '').toUpperCase(),  // droppers today
                            pr.quantity || ''  // quantity
                        )

                        return row
                    })

                    // Build header for SPY 1-6
                    const tableHead = ['', '', '', '', '', '', '', '']  // #, Medicine, spy1-6
                    tableHead.push('', '', '', '', '', '', '')  // timing, dose, additions, procedure, presentation, droppers, qty

                    // Build column styles - SPY 1-6 in green
                    const columnStyles: any = {
                        0: { cellWidth: 8, halign: 'center', textColor: [0, 0, 0] },   // #
                        1: { cellWidth: 30, halign: 'left', textColor: [0, 0, 255], fontStyle: 'bold' },    // Medicine name (blue, bold)
                        2: { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] },  // spy1 (green)
                        3: { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] },  // spy2 (green)
                        4: { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] },  // spy3 (green)
                        5: { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] },  // spy4 (green)
                        6: { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] },  // spy5 (green)
                        7: { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] },  // spy6 (green)
                        8: { cellWidth: 15, halign: 'center', textColor: [200, 0, 0], fontStyle: 'bold' },  // timing (red, bold)
                        9: { cellWidth: 12, halign: 'center', textColor: [128, 0, 128] },  // dose (purple)
                        10: { cellWidth: 12, halign: 'center', textColor: [0, 0, 0] },  // additions (black)
                        11: { cellWidth: 12, halign: 'center', textColor: [0, 0, 0] },  // procedure (black)
                        12: { cellWidth: 14, halign: 'center', textColor: [0, 0, 0] },  // presentation (black)
                        13: { cellWidth: 12, halign: 'center', textColor: [255, 140, 0] },  // droppers today (orange)
                        14: { cellWidth: 10, halign: 'center', textColor: [0, 0, 0], fontStyle: 'bold' }  // quantity (black, bold)
                    }

                    autoTable(doc, {
                        startY: yPos,
                        head: [tableHead],
                        body: tableData,
                        styles: {
                            fontSize: 7,
                            cellPadding: 1,
                            lineWidth: 0,
                            fontStyle: 'bold'
                        },
                        headStyles: {
                            fillColor: [255, 255, 255],  // White background (no header)
                            textColor: [255, 255, 255],  // White text (invisible)
                            fontStyle: 'normal',
                            fontSize: 5,
                            halign: 'center',
                            lineWidth: 0,
                            minCellHeight: 0
                        },
                        columnStyles: columnStyles,
                        alternateRowStyles: {
                            fillColor: false  // Remove alternate row background
                        },
                        bodyStyles: {
                            fillColor: false  // Remove white background
                        },
                        didDrawCell: (data: any) => {
                            // Color medicine names in blue
                            if (data.column.index === 1 && data.section === 'body') {
                                doc.setTextColor(0, 0, 255)
                            }
                            // Color timing in red
                            if (data.column.index === 6 && data.section === 'body') {
                                doc.setTextColor(200, 0, 0)
                            }
                        }
                    })

                    // ===== AFTER TABLE: ORANGE SEPARATOR =====
                    let afterTableY = (doc as any).lastAutoTable.finalY + 3

                    // Orange separator line with margins
                    doc.setDrawColor(255, 140, 0)
                    doc.setLineWidth(0.5)
                    doc.line(10, afterTableY, pageWidth - 10, afterTableY)

                    // Add separator image at bottom as footer - full width, no margins
                    // Add Footer Image
                    const footerY = pageHeight - 25
                    try {
                        const footerImg = new Image()
                        footerImg.crossOrigin = 'Anonymous'
                        await new Promise((resolve) => {
                            footerImg.onload = () => {
                                doc.addImage(footerImg, 'PNG', 0, footerY, pageWidth, 25)
                                resolve(true)
                            }
                            footerImg.onerror = () => {
                                console.error('Failed to load footer image')
                                resolve(false)
                            }
                            footerImg.src = '/footer.png'
                        })
                    } catch (error) {
                        console.error('Error adding footer:', error)
                    }
                } // End of PATIENT copy patient info section

                // ===== BLUE LINE SEPARATOR (FULL WIDTH) =====
                // Only add blue line and content after it for OFFICE copy
                if (copyType === 'OFFICE') {
                    let currentY = 10  // Start from top for OFFICE copy
                    doc.setDrawColor(0, 0, 255) // Blue color
                    doc.setLineWidth(0.5)
                    doc.line(0, currentY, pageWidth, currentY)

                    currentY += 5
                    doc.setFontSize(9)
                    doc.setTextColor(0, 0, 0)
                    doc.setFont('helvetica', 'bold')

                    // Check if spy4 and spy6 columns are needed
                    const hasSpy4 = prescriptions.some((p: any) => p.spy4)
                    const hasSpy6 = prescriptions.some((p: any) => p.spy6)

                    const imgStartY = currentY

                    // ===== ROW 1: 6 COLUMNS =====
                    // opdn, patient name, visit no, phone, father's name, location
                    const row1Col1 = 14
                    const row1Col2 = 45
                    const row1Col3 = 90
                    const row1Col4 = 115
                    const row1Col5 = 145
                    const row1Col6 = 175

                    // Add green background only for OPDN label in blue section
                    doc.setFillColor(144, 238, 144) // Light green
                    doc.rect(row1Col1 - 2, currentY - 4, 13, 4, 'F')

                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)
                    doc.setFontSize(6)
                    doc.text('OPDN:', row1Col1, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(0, 0, 255)
                    doc.text(`${(visit.patient?.opdNo || visit.opdNo || '').toUpperCase()}`, row1Col1, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Patient Name:', row1Col2, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(255, 0, 0)
                    const patientName = `${(visit.patient?.firstName || '').toUpperCase()} ${(visit.patient?.lastName || '').toUpperCase()}`
                    const patientNameLines = doc.splitTextToSize(patientName, 40)
                    doc.text(patientNameLines[0] || '', row1Col2, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Visit No.:', row1Col3, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(0, 128, 0)
                    const visitNum = visit.visitNumber || visit.visit_number || '1'
                    doc.text(`${visitNum.toString().toUpperCase()}`, row1Col3, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Phone:', row1Col4, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(128, 0, 128)
                    doc.text(`${(visit.patient?.phone || visit.phone || '').toUpperCase()}`, row1Col4, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Father:', row1Col5, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(255, 140, 0)
                    const fatherName = (visit.patient?.fatherHusbandGuardianName || visit.fatherHusbandGuardianName || '').toUpperCase()
                    const fatherLines = doc.splitTextToSize(fatherName, 25)
                    doc.text(fatherLines[0] || '', row1Col5, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Address:', row1Col6, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(0, 0, 255)
                    const address = (visit.patient?.address || visit.address || '').toUpperCase()
                    const addressLines = doc.splitTextToSize(address, 25)
                    doc.text(addressLines[0] || '', row1Col6, currentY + 2)

                    currentY += 7

                    // ===== ROW 2: 3 COLUMNS =====
                    // temperament, age/dob, disc
                    const row2Col1 = 14
                    const row2Col2 = 80
                    const row2Col3 = 145

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Temperament:', row2Col1, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(128, 0, 128)
                    const temperament = (visit.temperament || '').toUpperCase()
                    const tempLines = doc.splitTextToSize(temperament, 60)
                    doc.text(tempLines[0] || '', row2Col1, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('DOB:', row2Col2, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(0, 128, 0)
                    const dob = visit.patient?.dob || visit.dob ? new Date(visit.patient?.dob || visit.dob).toLocaleDateString() : ''
                    doc.text(`${dob.toUpperCase()}`, row2Col2, currentY + 2)

                    currentY += 7

                    // ===== ROW 3: 3 COLUMNS =====
                    // pulse diagnosis, date, history/report
                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Pulse:', row2Col1, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(0, 0, 255)
                    const pulse = (visit.pulseDiagnosis || '').toUpperCase()
                    const pulseLines = doc.splitTextToSize(pulse, 60)
                    doc.text(pulseLines[0] || '', row2Col1, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Date:', row2Col2, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(200, 0, 0)
                    const visitDate = new Date(visit.date).toLocaleDateString()
                    doc.text(`${visitDate.toUpperCase()}`, row2Col2, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('History:', row2Col3, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(0, 128, 0)
                    const history = (visit.historyReports || '').toUpperCase()
                    const histLines = doc.splitTextToSize(history, 45)
                    doc.text(histLines[0] || '', row2Col3, currentY + 2)

                    currentY += 7

                    // ===== ROW 4: 3 COLUMNS =====
                    // gender, next visit, major complaints
                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Gender:', row2Col1, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(255, 140, 0)
                    doc.text(`${(visit.patient?.gender || visit.gender || '').toUpperCase()}`, row2Col1, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Next Visit:', row2Col2, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(200, 0, 0)
                    const nextVisit = visit.nextVisit ? new Date(visit.nextVisit).toLocaleDateString() : ''
                    doc.text(`${nextVisit.toUpperCase()}`, row2Col2, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Complaints:', row2Col3, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(0, 0, 255)
                    const complaints = (visit.majorComplaints || '').toUpperCase()
                    const complaintLines = doc.splitTextToSize(complaints, 45)
                    doc.text(complaintLines[0] || '', row2Col3, currentY + 2)

                    currentY += 7

                    // ===== ROW 5: 2 COLUMNS =====
                    // improvements, provisional diagnosis
                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Improvements:', row2Col1, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(0, 128, 0)
                    const improvements = (visit.improvements || '').toUpperCase()
                    const improvLines = doc.splitTextToSize(improvements, 60)
                    doc.text(improvLines[0] || '', row2Col1, currentY + 2)

                    doc.setFontSize(6)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Prov. Diagnosis:', row2Col2 + 30, currentY - 2)
                    doc.setFontSize(9)
                    doc.setTextColor(0, 0, 255)
                    const provDiag = (visit.provisionalDiagnosis || '').toUpperCase()
                    const provDiagLines = doc.splitTextToSize(provDiag, 60)
                    doc.text(provDiagLines[0] || '', row2Col2 + 30, currentY + 2)
                    doc.setTextColor(0, 0, 0)                    // Add patient image on the right side (parallel to all rows) - smaller size
                    const imgX = 185
                    const imgWidth = 12
                    const imgHeight = 16
                    const imageUrl = visit.patient?.imageUrl || process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || '/default-patient.png'

                    try {
                        const img2 = new Image()
                        img2.crossOrigin = 'Anonymous'
                        await new Promise((resolve) => {
                            img2.onload = () => {
                                doc.addImage(img2, 'JPEG', imgX, imgStartY - 2, imgWidth, imgHeight)
                                resolve(true)
                            }
                            img2.onerror = () => {
                                // Try to load default image
                                const defaultImg = new Image()
                                defaultImg.crossOrigin = 'Anonymous'
                                defaultImg.onload = () => {
                                    doc.addImage(defaultImg, 'JPEG', imgX, imgStartY - 2, imgWidth, imgHeight)
                                    resolve(true)
                                }
                                defaultImg.onerror = () => resolve(false)
                                defaultImg.src = '/default-patient.png'
                            }
                            img2.src = imageUrl
                        })
                    } catch (error) {
                        console.error('Error adding patient image:', error)
                    }

                    currentY += 4

                    // ===== ORANGE SEPARATOR WITH MARGINS =====
                    doc.setDrawColor(255, 165, 0)
                    doc.setLineWidth(0.5)
                    doc.line(10, currentY, pageWidth - 10, currentY)

                    currentY += 3

                    // ===== SECOND MEDICINE TABLE (WITH UNITS COLUMN) =====
                    const table2Headers = ['UNITS']
                    table2Headers.push('#', 'MEDICINE NAME', 'SPY1', 'SPY2', 'SPY3', 'SPY4', 'SPY5', 'SPY6')
                    table2Headers.push('TIMING', 'DOSE', 'ADDITIONS', 'PROCEDURE', 'PRESENTATION', 'DROPPERS TODAY', 'QUANTITY')

                    const table2Body = prescriptions.map((prescription: any, index: number) => {
                        const product = products.find((p: any) => p.id === prescription.productId)
                        const availableUnits = product?.units || 0
                        const requestedQty = prescription.quantity || 0
                        const remainingUnits = Math.max(0, availableUnits - requestedQty)
                        const isLowStock = remainingUnits <= 0
                        const row = [
                            remainingUnits.toString(),
                            (index + 1).toString(),
                            (product?.name || '').toUpperCase(),
                            (prescription.spy1 || '').toUpperCase(),
                            (prescription.spy2 || '').toUpperCase(),
                            (prescription.spy3 || '').toUpperCase(),
                            (prescription.spy4 || '').toUpperCase(),
                            (prescription.spy5 || '').toUpperCase(),
                            (prescription.spy6 || '').toUpperCase()
                        ]
                        row.push(
                            (prescription.timing || '').toUpperCase(),
                            (prescription.dosage || '').toUpperCase(),
                            (prescription.addition1 || '').toUpperCase(),
                            (prescription.procedure || '').toUpperCase(),
                            (prescription.presentation || '').toUpperCase(),
                            (prescription.droppersToday?.toString() || '').toUpperCase(),
                            prescription.quantity?.toString() || ''
                        )
                        return row
                    })

                    const table2ColumnStyles: any = {
                        0: { cellWidth: 12, halign: 'center', textColor: [0, 0, 0] },  // UNITS
                        1: { cellWidth: 8, halign: 'center' },  // #
                        2: { cellWidth: 25 },  // MEDICINE NAME
                        3: { cellWidth: 10 },  // SPY1
                        4: { cellWidth: 10 },  // SPY2
                        5: { cellWidth: 10 },  // SPY3
                        6: { cellWidth: 10 },  // SPY4
                        7: { cellWidth: 10 },  // SPY5
                        8: { cellWidth: 10 },  // SPY6
                        9: { cellWidth: 12 },  // TIMING
                        10: { cellWidth: 12 },  // DOSE
                        11: { cellWidth: 12 },  // ADDITIONS
                        12: { cellWidth: 12 },  // PROCEDURE
                        13: { cellWidth: 12 },  // PRESENTATION
                        14: { cellWidth: 12 },  // DROPPERS TODAY
                        15: { cellWidth: 10 }   // QUANTITY
                    }

                    autoTable(doc, {
                        startY: currentY,
                        head: [table2Headers],
                        body: table2Body,
                        theme: 'plain',
                        styles: {
                            fontSize: 6,
                            cellPadding: 0.5,
                            lineColor: [255, 255, 255],
                            lineWidth: 0,
                        },
                        headStyles: {
                            fillColor: [255, 255, 255],
                            textColor: [255, 255, 255],
                            fontSize: 6,
                            fontStyle: 'bold',
                            halign: 'center',
                        },
                        columnStyles: table2ColumnStyles,
                        margin: { left: 14, right: 14 },
                        didDrawCell: (data: any) => {
                            // Color units column red if value is 0 or negative
                            if (data.column.index === 0 && data.section === 'body') {
                                const units = parseInt(data.cell.text[0] || '0')
                                if (units <= 0) {
                                    doc.setTextColor(255, 0, 0)
                                }
                            }
                        }
                    })

                    const finalTable = (doc as any).lastAutoTable
                    const afterFinalTableY = finalTable.finalY + 8

                    // ===== SUMMARY ROW (matching table columns) =====
                    doc.setFontSize(7)
                    doc.setFont('helvetica', 'bold')
                    doc.setTextColor(0, 0, 0)

                    // Calculate totals
                    const totalUnits = prescriptions.reduce((sum: number, p: any) => {
                        const product = products.find((prod: any) => prod.id === p.productId)
                        const remaining = Math.max(0, (product?.units || 0) - (p.quantity || 0))
                        return sum + remaining
                    }, 0)
                    const totalMedicines = prescriptions.length
                    const daysDiff = visit.nextVisit && visit.date
                        ? Math.ceil((new Date(visit.nextVisit).getTime() - new Date(visit.date).getTime()) / (1000 * 60 * 60 * 24))
                        : 0
                    const finalAmount = (visit.amount || 0) - (visit.discount || 0)

                    // Position summary row according to table columns
                    const summaryY = afterFinalTableY
                    const baseX = 14

                    // Add light green background to summary row
                    doc.setFillColor(144, 238, 144) // Light green
                    doc.rect(baseX - 2, summaryY - 5, pageWidth - 28, 7, 'F')

                    doc.setTextColor(0, 0, 0)
                    doc.text(totalUnits.toString(), baseX + 5, summaryY, { align: 'center' })
                    doc.text(totalMedicines.toString(), baseX + 20, summaryY, { align: 'center' })
                    doc.text(`${daysDiff} DAYS`, baseX + 70, summaryY)

                    // Show final amount in the last column (rightmost)
                    doc.text(`₹${finalAmount.toFixed(2)}`, 196, summaryY, { align: 'right' })

                } // End of OFFICE copy only content

                // ===== FOOTER =====
                // Position footer at the bottom of the page for PATIENT copy
                if (copyType === 'PATIENT') {
                    doc.setFontSize(6)
                    doc.setTextColor(150, 150, 150)
                    doc.text('Designed by DrugBase', pageWidth / 2, pageHeight - 10, { align: 'center' })
                } else {
                    doc.setFontSize(6)
                    doc.setTextColor(150, 150, 150)
                    doc.text('Designed by DrugBase', pageWidth - 40, pageHeight - 10)
                }

                // Add copy label watermark in corner - position differently based on copy type
                doc.setFontSize(14)
                doc.setFont('helvetica', 'bold')
                if (copyType === 'PATIENT') {
                    doc.setTextColor(0, 128, 255) // Blue for patient copy
                    doc.text('PATIENT COPY', pageWidth / 2, 10, { align: 'center' })
                } else {
                    doc.setTextColor(255, 0, 0) // Red for office copy
                    // Position at bottom for OFFICE copy since top is used by blue line
                    doc.text('OFFICE COPY', pageWidth / 2, pageHeight - 5, { align: 'center' })
                }
                doc.setTextColor(0, 0, 0) // Reset color
            }

            // Generate only the selected copy type (patient or office)
            await generatePage(useCopyType)

            // Save the PDF with patient name, OPD number, and copy type
            const patientName = `${visit.patient?.firstName || ''} ${visit.patient?.lastName || ''}`.trim() || 'Patient'
            const opdNo = visit.opdNo || visit.id || 'Unknown'
            const fileName = `${patientName} ${opdNo} - ${useCopyType}.pdf`
            doc.save(fileName)
        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Failed to generate PDF. Please try again.')
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const downloadPreviewAsPDF = async (customFileName?: string, skipLoadingState?: boolean) => {
        if (!prescriptionRef.current || !visit) return

        if (!skipLoadingState) setIsGeneratingPDF(true)

        try {
            const element = prescriptionRef.current
            
            // Force element to exact A4 pixel width during capture
            const originalWidth = element.style.width
            element.style.width = '794px' // 210mm at 96 DPI
            
            // Wait for layout to settle
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Capture with exact dimensions
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff',
                imageTimeout: 15000,
                scrollY: -window.scrollY,
                width: 794, // Force exact A4 width in pixels
                onclone: (clonedDoc) => {
                    clonedDoc.documentElement.style.fontSize = '16px'
                    const clonedElement = clonedDoc.querySelector('.prescription-container') as HTMLElement
                    if (clonedElement) {
                        clonedElement.style.width = '794px'
                        clonedElement.style.boxShadow = 'none'
                        clonedElement.style.borderRadius = '0'
                    }
                }
            })
            
            // Restore original width
            element.style.width = originalWidth

            // Create standard A4 PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            })

            const pdfWidth = 210 // A4 width in mm
            const pdfHeight = 297 // A4 height in mm
            
            // Convert canvas to image data
            const imgData = canvas.toDataURL('image/png')
            
            // Calculate height to maintain aspect ratio
            const imgProps = pdf.getImageProperties(imgData)
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width

            // Add image fitting the width of A4
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight)

            // Save with patient name and OPD number
            const patientName = `${visit.patient?.firstName || ''} ${visit.patient?.lastName || ''}`.trim() || 'Patient'
            const opdNo = visit.opdNo || visit.id || 'Unknown'
            const fileName = customFileName || `${patientName} ${opdNo}.pdf`

            pdf.save(fileName)
        } catch (error) {
            console.error('Error generating PDF from preview:', error)
            alert('Failed to generate PDF. Please try again.')
        } finally {
            if (!skipLoadingState) setIsGeneratingPDF(false)
        }
    }

    const downloadPatientCopy = async () => {
        setShowDownloadDropdown(false)
        const originalCopyType = copyType
        setCopyType('PATIENT')
        await new Promise(resolve => setTimeout(resolve, 100))
        await downloadPreviewAsPDF()
        setCopyType(originalCopyType)
    }

    const downloadOfficeCopy = async () => {
        setShowDownloadDropdown(false)
        const originalCopyType = copyType
        setCopyType('OFFICE')
        await new Promise(resolve => setTimeout(resolve, 100))
        await downloadPreviewAsPDF()
        setCopyType(originalCopyType)
    }

    const downloadBothCopies = async () => {
        setShowDownloadDropdown(false)
        if (!prescriptionRef.current || !visit) return

        setIsGeneratingPDF(true)

        try {
            const originalCopyType = copyType
            
            // Force A4 pixel width
            const originalWidth = prescriptionRef.current.style.width
            prescriptionRef.current.style.width = '794px'
            await new Promise(resolve => setTimeout(resolve, 200))
            
            // Capture patient copy
            setCopyType('PATIENT')
            await new Promise(resolve => setTimeout(resolve, 300))

            const canvas1 = await html2canvas(prescriptionRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff',
                imageTimeout: 15000,
                scrollY: -window.scrollY,
                width: 794,
                onclone: (clonedDoc) => {
                    clonedDoc.documentElement.style.fontSize = '16px'
                    const clonedElement = clonedDoc.querySelector('.prescription-container') as HTMLElement
                    if (clonedElement) {
                        clonedElement.style.width = '794px'
                        clonedElement.style.boxShadow = 'none'
                        clonedElement.style.borderRadius = '0'
                    }
                }
            })

            // Capture office copy
            setCopyType('OFFICE')
            await new Promise(resolve => setTimeout(resolve, 300))

            const canvas2 = await html2canvas(prescriptionRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff',
                imageTimeout: 15000,
                scrollY: -window.scrollY,
                width: 794,
                onclone: (clonedDoc) => {
                    clonedDoc.documentElement.style.fontSize = '16px'
                    const clonedElement = clonedDoc.querySelector('.prescription-container') as HTMLElement
                    if (clonedElement) {
                        clonedElement.style.width = '794px'
                        clonedElement.style.boxShadow = 'none'
                        clonedElement.style.borderRadius = '0'
                    }
                }
            })
            
            // Restore width
            prescriptionRef.current.style.width = originalWidth
            
            // Restore width
            prescriptionRef.current.style.width = originalWidth

            // Create PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            })

            const pdfWidth = 210
            
            // Add patient copy
            const imgData1 = canvas1.toDataURL('image/png')
            const imgProps1 = pdf.getImageProperties(imgData1)
            const imgHeight1 = (imgProps1.height * pdfWidth) / imgProps1.width
            pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, imgHeight1)

            // Add office copy
            pdf.addPage()
            const imgData2 = canvas2.toDataURL('image/png')
            const imgProps2 = pdf.getImageProperties(imgData2)
            const imgHeight2 = (imgProps2.height * pdfWidth) / imgProps2.width
            pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, imgHeight2)

            // Save with patient name and OPD number
            const patientName = `${visit.patient?.firstName || ''} ${visit.patient?.lastName || ''}`.trim() || 'Patient'
            const opdNo = visit.opdNo || visit.id || 'Unknown'
            const fileName = `${patientName} ${opdNo} - Both Copies.pdf`

            pdf.save(fileName)

            setCopyType(originalCopyType)
        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Failed to generate PDF. Please try again.')
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const handlePrintLetterhead = async (copyTypeParam?: 'PATIENT' | 'OFFICE') => {
        setShowPrintDropdown(false)
        setShowPrintSubmenu(null)
        if (!prescriptionRef.current) return

        const originalCopyType = copyType
        if (copyTypeParam) {
            setCopyType(copyTypeParam)
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        try {
            // Add letterhead class to hide images
            prescriptionRef.current.classList.add('print-letterhead')
            
            // Force A4 width
            const originalWidth = prescriptionRef.current.style.width
            prescriptionRef.current.style.width = '794px'
            await new Promise(resolve => setTimeout(resolve, 200))
            
            // Capture as canvas
            const canvas = await html2canvas(prescriptionRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                imageTimeout: 15000,
                scrollY: -window.scrollY,
                width: 794,
                onclone: (clonedDoc) => {
                    clonedDoc.documentElement.style.fontSize = '16px'
                    const clonedElement = clonedDoc.querySelector('.prescription-container') as HTMLElement
                    if (clonedElement) {
                        clonedElement.style.width = '794px'
                        clonedElement.style.boxShadow = 'none'
                        clonedElement.style.borderRadius = '0'
                    }
                }
            })

            // Remove letterhead class and restore width
            prescriptionRef.current.classList.remove('print-letterhead')
            prescriptionRef.current.style.width = originalWidth

            // Create a temporary image to print
            const imgData = canvas.toDataURL('image/png')
            const printWindow = window.open('', '_blank')
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Print Prescription</title>
                        <style>
                            @page { 
                                size: letter portrait; 
                                margin: 0mm; 
                            }
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            html, body { 
                                margin: 0 !important; 
                                padding: 0 !important; 
                                width: 100% !important;
                                height: 100% !important;
                                overflow: hidden !important;
                            }
                            img { 
                                display: block !important;
                                width: 100% !important; 
                                height: 100% !important;
                                max-width: 100% !important;
                                max-height: 100% !important;
                                object-fit: fill !important;
                                position: absolute !important;
                                top: 0 !important;
                                left: 0 !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                        </style>
                    </head>
                    <body>
                        <img src="${imgData}" onload="window.print(); window.close();" />
                    </body>
                    </html>
                `)
                printWindow.document.close()
            }
        } catch (error) {
            console.error('Error printing:', error)
            prescriptionRef.current?.classList.remove('print-letterhead')
        } finally {
            if (copyTypeParam) {
                setCopyType(originalCopyType)
            }
        }
    }

    const handlePrintPlain = async (copyTypeParam?: 'PATIENT' | 'OFFICE') => {
        setShowPrintDropdown(false)
        setShowPrintSubmenu(null)
        if (!prescriptionRef.current) return

        const originalCopyType = copyType
        if (copyTypeParam) {
            setCopyType(copyTypeParam)
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        try {
            // Force A4 width
            const originalWidth = prescriptionRef.current.style.width
            prescriptionRef.current.style.width = '794px'
            await new Promise(resolve => setTimeout(resolve, 200))
            
            // Capture as canvas
            const canvas = await html2canvas(prescriptionRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                imageTimeout: 15000,
                scrollY: -window.scrollY,
                width: 794,
                onclone: (clonedDoc) => {
                    clonedDoc.documentElement.style.fontSize = '16px'
                    const clonedElement = clonedDoc.querySelector('.prescription-container') as HTMLElement
                    if (clonedElement) {
                        clonedElement.style.width = '794px'
                        clonedElement.style.boxShadow = 'none'
                        clonedElement.style.borderRadius = '0'
                    }
                }
            })
            
            // Restore width
            prescriptionRef.current.style.width = originalWidth

            // Create a temporary image to print
            const imgData = canvas.toDataURL('image/png')
            const printWindow = window.open('', '_blank')
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Print Prescription</title>
                        <style>
                            @page { 
                                size: letter portrait; 
                                margin: 0mm; 
                            }
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            html, body { 
                                margin: 0 !important; 
                                padding: 0 !important; 
                                width: 100% !important;
                                height: 100% !important;
                                overflow: hidden !important;
                            }
                            img { 
                                display: block !important;
                                width: 100% !important; 
                                height: 100% !important;
                                max-width: 100% !important;
                                max-height: 100% !important;
                                object-fit: fill !important;
                                position: absolute !important;
                                top: 0 !important;
                                left: 0 !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                        </style>
                    </head>
                    <body>
                        <img src="${imgData}" onload="window.print(); window.close();" />
                    </body>
                    </html>
                `)
                printWindow.document.close()
            }
        } catch (error) {
            console.error('Error printing:', error)
        } finally {
            if (copyTypeParam) {
                setCopyType(originalCopyType)
            }
        }
    }

    const handlePrintBoth = async (paperType: 'letterhead' | 'plain') => {
        setShowPrintDropdown(false)
        setShowPrintSubmenu(null)
        if (!prescriptionRef.current || !visit) return

        const originalCopyType = copyType

        try {
            // Capture patient copy
            setCopyType('PATIENT')
            await new Promise(resolve => setTimeout(resolve, 100))

            if (paperType === 'letterhead') {
                prescriptionRef.current.classList.add('print-letterhead')
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            const canvas1 = await html2canvas(prescriptionRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                imageTimeout: 15000,
                scrollY: -window.scrollY,
                onclone: (clonedDoc) => {
                    clonedDoc.documentElement.style.fontSize = '16px'
                    const clonedElement = clonedDoc.querySelector('.prescription-container') as HTMLElement
                    if (clonedElement) {
                        clonedElement.style.boxShadow = 'none'
                        clonedElement.style.borderRadius = '0'
                    }
                }
            })

            if (paperType === 'letterhead') {
                prescriptionRef.current.classList.remove('print-letterhead')
            }

            // Capture office copy
            setCopyType('OFFICE')
            await new Promise(resolve => setTimeout(resolve, 100))

            if (paperType === 'letterhead') {
                prescriptionRef.current.classList.add('print-letterhead')
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            const canvas2 = await html2canvas(prescriptionRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                imageTimeout: 15000,
                scrollY: -window.scrollY,
                onclone: (clonedDoc) => {
                    clonedDoc.documentElement.style.fontSize = '16px'
                    const clonedElement = clonedDoc.querySelector('.prescription-container') as HTMLElement
                    if (clonedElement) {
                        clonedElement.style.boxShadow = 'none'
                        clonedElement.style.borderRadius = '0'
                    }
                }
            })

            if (paperType === 'letterhead') {
                prescriptionRef.current.classList.remove('print-letterhead')
            }

            // Create two images in print window
            const imgData1 = canvas1.toDataURL('image/png')
            const imgData2 = canvas2.toDataURL('image/png')

            const printWindow = window.open('', '_blank')
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Print Prescriptions</title>
                        <style>
                            @page { 
                                size: a4 portrait; 
                                margin: 0mm; 
                            }
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            html, body { 
                                margin: 0 !important; 
                                padding: 0 !important; 
                                width: 100% !important;
                                height: 100% !important;
                            }
                            .page {
                                page-break-after: always;
                                width: 100%;
                                height: 100vh;
                                display: flex;
                                justify-content: center;
                                align-items: flex-start;
                            }
                            .page:last-child {
                                page-break-after: auto;
                            }
                            img { 
                                display: block !important;
                                width: 100% !important; 
                                height: auto !important;
                                max-width: 100% !important;
                                object-fit: contain !important;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="page">
                            <img src="${imgData1}" />
                        </div>
                        <div class="page">
                            <img src="${imgData2}" />
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

            setCopyType(originalCopyType)
        } catch (error) {
            console.error('Error printing:', error)
            setCopyType(originalCopyType)
        }
    }

    if (!visit) return <div className="flex items-center justify-center h-64"><div className="text-muted">Loading...</div></div>

    return (
        <div className="bg-gray-50 min-h-screen py-6">
            <style dangerouslySetInnerHTML={{
                __html: `
                .prescription-container-wrapper {
                    width: 100%;
                    overflow-x: auto;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                .prescription-container {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                }
            `}} />
            <div className="max-w-7xl mx-auto px-4">
                {/* Info Bar - Simple, No Background with Dark Mode */}
                <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">OPD No:</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{visit?.opdNo || visit?.id || 'N/A'}</span>
                        </div>
                        <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient:</span>
                            <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                                {visit?.patient?.firstName || ''} {visit?.patient?.lastName || ''}
                            </span>
                        </div>
                        <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Date:</span>
                            <span className="text-base font-semibold text-gray-700 dark:text-gray-300">
                                {visit?.date ? new Date(visit.date).toLocaleDateString('en-GB') : 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => router.push('/visits')}
                            className="px-2 sm:px-3 py-1.5 bg-gray-600 dark:bg-gray-700 text-white text-sm rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-all shadow-sm flex items-center gap-1"
                            title="Back to visits"
                            aria-label="Back to visits"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        <button
                            onClick={() => router.push(`/prescriptions?visitId=${visit.id}&edit=true`)}
                            className="px-2 sm:px-3 py-1.5 bg-orange-500 dark:bg-orange-600 text-white text-sm rounded-md hover:bg-orange-600 dark:hover:bg-orange-500 transition-all shadow-sm flex items-center gap-1"
                            title="Edit visit"
                            aria-label="Edit visit"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="hidden sm:inline">Edit</span>
                        </button>

                        {/* Copy Type Toggle */}
                        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                            <button
                                onClick={() => setCopyType('PATIENT')}
                                className={`px-3 py-1.5 text-sm font-medium transition-all ${copyType === 'PATIENT'
                                    ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Patient
                            </button>
                            <button
                                onClick={() => setCopyType('OFFICE')}
                                className={`px-3 py-1.5 text-sm font-medium transition-all border-l border-gray-300 dark:border-gray-600 ${copyType === 'OFFICE'
                                    ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Office
                            </button>
                        </div>

                        {/* Download Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                                onBlur={() => setTimeout(() => setShowDownloadDropdown(false), 200)}
                                disabled={isGeneratingPDF}
                                className="px-2 sm:px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white text-sm rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                title="Download PDF"
                                aria-label="Download PDF"
                            >
                                {isGeneratingPDF ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="hidden sm:inline">Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="hidden sm:inline">Download</span>
                                        <svg className="w-3 h-3 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                            {showDownloadDropdown && (
                                <div className="absolute right-0 mt-1 w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-emerald-200 dark:border-emerald-700 rounded-md shadow-lg z-50">
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); downloadPatientCopy(); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all"
                                    >
                                        Download Patient Copy
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); downloadOfficeCopy(); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all"
                                    >
                                        Download Office Copy
                                    </button>
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); downloadBothCopies(); }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all rounded-b-md"
                                    >
                                        Download Both
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Print Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowPrintDropdown(!showPrintDropdown)}
                                onBlur={() => setTimeout(() => {
                                    setShowPrintDropdown(false)
                                    setShowPrintSubmenu(null)
                                }, 200)}
                                className="px-2 sm:px-3 py-1.5 bg-emerald-600/90 dark:bg-emerald-700/90 text-white text-sm rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-sm flex items-center gap-1.5 backdrop-blur-sm"
                                title="Print"
                                aria-label="Print"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                <span className="hidden sm:inline">Print</span>
                                <svg className="w-3 h-3 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {showPrintDropdown && (
                                <div className="absolute right-0 mt-1 w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-emerald-200 dark:border-emerald-700 rounded-md shadow-lg z-50">
                                    {/* Patient Copy with Submenu */}
                                    <div className="relative">
                                        <button
                                            onMouseEnter={() => setShowPrintSubmenu('PATIENT')}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all flex items-center justify-between"
                                        >
                                            <span>Print Patient Copy</span>
                                            <span>▶</span>
                                        </button>
                                        {showPrintSubmenu === 'PATIENT' && (
                                            <div className="absolute left-full top-0 ml-1 w-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-emerald-200 dark:border-emerald-700 rounded-md shadow-lg">
                                                <button
                                                    onMouseDown={(e) => { e.preventDefault(); handlePrintLetterhead('PATIENT'); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all rounded-t-md"
                                                >
                                                    Letterhead Paper
                                                </button>
                                                <button
                                                    onMouseDown={(e) => { e.preventDefault(); handlePrintPlain('PATIENT'); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all rounded-b-md"
                                                >
                                                    Plain Paper
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Office Copy with Submenu */}
                                    <div className="relative">
                                        <button
                                            onMouseEnter={() => setShowPrintSubmenu('OFFICE')}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all flex items-center justify-between"
                                        >
                                            <span>Print Office Copy</span>
                                            <span>▶</span>
                                        </button>
                                        {showPrintSubmenu === 'OFFICE' && (
                                            <div className="absolute left-full top-0 ml-1 w-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-emerald-200 dark:border-emerald-700 rounded-md shadow-lg">
                                                <button
                                                    onMouseDown={(e) => { e.preventDefault(); handlePrintLetterhead('OFFICE'); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all rounded-t-md"
                                                >
                                                    Letterhead Paper
                                                </button>
                                                <button
                                                    onMouseDown={(e) => { e.preventDefault(); handlePrintPlain('OFFICE'); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all rounded-b-md"
                                                >
                                                    Plain Paper
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Both Copies with Submenu */}
                                    <div className="relative">
                                        <button
                                            onMouseEnter={() => setShowPrintSubmenu('BOTH')}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all flex items-center justify-between rounded-b-md"
                                        >
                                            <span>Print Both</span>
                                            <span>▶</span>
                                        </button>
                                        {showPrintSubmenu === 'BOTH' && (
                                            <div className="absolute left-full top-0 ml-1 w-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-emerald-200 dark:border-emerald-700 rounded-md shadow-lg">
                                                <button
                                                    onMouseDown={(e) => { e.preventDefault(); handlePrintBoth('letterhead'); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all rounded-t-md"
                                                >
                                                    Letterhead Paper
                                                </button>
                                                <button
                                                    onMouseDown={(e) => { e.preventDefault(); handlePrintBoth('plain'); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all rounded-b-md"
                                                >
                                                    Plain Paper
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Main Content Area with PDF Preview and Reports Sidebar */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Prescription Sheet - Left Side */}
                    <div className="flex-1 w-full lg:w-auto overflow-hidden" style={{ marginBottom: '3rem' }}>
                        <div className="prescription-container-wrapper">
                            <div ref={prescriptionRef} className="prescription-container" style={{ background: 'white', color: 'black', padding: '0', position: 'relative', width: '210mm', minHeight: '297mm', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                {/* Watermark - Only show in PATIENT copy */}
                                {copyType === 'PATIENT' && (
                                    <div className="watermark-container" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.175, zIndex: 0, pointerEvents: 'none', width: '65%', height: 'auto' }}>
                                        <img src="/watermark.png" alt="Watermark" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                    </div>
                                )}

                                {/* Header Image - Full width, no margin - Only show in PATIENT copy */}
                                {copyType === 'PATIENT' && (
                                    <div className="header-container" style={{ width: '100%', overflow: 'hidden', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                                        <img src="/header.png" alt="Header" style={{ width: '100%', height: '90%', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                    </div>
                                )}

                                {/* Patient Info and Prescription Section - Only show in PATIENT copy */}
                                {copyType === 'PATIENT' && (
                                    <>
                                        <div style={{ padding: '0 1.5rem', position: 'relative', zIndex: 1, flex: '1 0 auto' }}>

                                            {/* Top Section: Particulars and Basic Info */}
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>

                                                {/* Particulars Box (Left) */}
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Particulars</span>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '9px', gap: '2px', lineHeight: '1.1', marginTop: '-4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>OPDN</span> <span style={{ color: 'blue', fontWeight: 'bold', marginLeft: '4px' }}>{visit.opdNo || 'N/A'}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>VISIT</span> <span style={{ marginLeft: '4px' }}>{visit.visitNumber || '1'}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>SEX</span> <span style={{ marginLeft: '4px' }}>{visit.gender || visit.patient?.gender || 'N/A'}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>AGE</span> <span style={{ marginLeft: '4px' }}>{visit.age || visit.patient?.age || 'N/A'}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>DOB</span> <span style={{ marginLeft: '4px' }}>{visit.dob || visit.patient?.dob ? new Date(visit.dob || visit.patient?.dob).toLocaleDateString('en-GB') : ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>PHONE</span> <span style={{ marginLeft: '4px' }}>{visit.phone || visit.patient?.phone}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><a href={`#nextVisit`} style={{ fontWeight: 'bold', textDecoration: 'underline', color: '#000', cursor: 'pointer' }}>F UP</a> <span style={{ marginLeft: '4px', color: '#C80000', fontWeight: 'bold' }}>{visit.followUpCount ? `#${visit.followUpCount}` : ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>NEXT VISIT</span> <span style={{ marginLeft: '4px', color: '#C80000', fontWeight: 'bold' }}>{visit.nextVisit ? new Date(visit.nextVisit).toLocaleDateString('en-GB') : ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>HT</span> <span style={{ marginLeft: '4px' }}>{visit.height}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>WT</span> <span style={{ marginLeft: '4px' }}>{visit.weight}</span></div>
                                                    </div>
                                                </div>

                                                {/* Right Box: Patient Info */}
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', display: 'flex', gap: '5px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-8px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Patient Info</span>
                                                    
                                                    <div style={{ flex: 1 }}>
                                                        {/* Indicator Box - Added to Patient Copy */}
                                                        <div style={{ width: '30px', height: '15px', background: visit.improvements ? 'green' : 'red', marginBottom: '3px', border: '1px solid #000' }}></div>

                                                        <div style={{ fontSize: '0.75rem', lineHeight: '1.1', marginTop: '-4px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>NAME:</span> <span style={{ fontWeight: 'bold', color: '#FF0000', marginLeft: '4px' }}>{visit.patient?.firstName || ''} {visit.patient?.lastName || ''}</span></div>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>FATHER:</span> <span style={{ fontWeight: 'bold', color: '#FF8C00', marginLeft: '4px' }}>{visit.patient?.fatherHusbandGuardianName || ''}</span></div>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>ADDRESS:</span> <span style={{ fontWeight: 'bold', color: '#0000FF', marginLeft: '4px' }}>{visit.patient?.address || visit.address || ''}</span></div>
                                                        </div>
                                                    </div>

                                                    {/* Patient Image */}
                                                    <div style={{ width: '60px', height: '75px', border: '1px solid #ddd', overflow: 'hidden', flexShrink: 0 }}>
                                                        {visit.patient?.imageUrl ? (
                                                            <img
                                                                src={visit.patient.imageUrl}
                                                                alt="Patient"
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                onError={(e) => {
                                                                    e.currentTarget.src = process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || '/default-patient.png'
                                                                }}
                                                            />
                                                        ) : (
                                                            <img
                                                                src={process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || '/default-patient.png'}
                                                                alt="Patient"
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                onError={(e) => {
                                                                    const target = e.currentTarget as HTMLImageElement
                                                                    target.style.display = 'none'
                                                                    const parent = target.parentElement
                                                                    if (parent) {
                                                                        parent.style.backgroundColor = '#f0f0f0'
                                                                        parent.style.display = 'flex'
                                                                        parent.style.alignItems = 'center'
                                                                        parent.style.justifyContent = 'center'
                                                                        parent.innerHTML = '<div style="font-size: 0.6rem; color: #999;">No Image</div>'
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* EH Parameters Row */}
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>EH Parameters</span>
                                                    <div style={{ fontSize: '9px', display: 'flex', alignItems: 'flex-start', lineHeight: '1.1' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>TEMP</span> <span style={{ marginLeft: '4px' }}>{visit.temperament}</span></div>
                                                </div>
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '12px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>EH Parameters</span>
                                                    <div style={{ fontSize: '9px', display: 'flex', alignItems: 'flex-start', lineHeight: '1.1' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>PULSE-1</span> <span style={{ marginLeft: '4px' }}>{visit.pulseDiagnosis}</span></div>
                                                </div>
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '12px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>EH Parameters</span>
                                                    <div style={{ fontSize: '9px', display: 'flex', alignItems: 'flex-start', lineHeight: '1.1' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>PULSE-2</span> <span style={{ marginLeft: '4px' }}>{visit.pulseDiagnosis2}</span></div>
                                                </div>
                                            </div>

                                            {/* History & Reports */}
                                            <div style={{ border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', marginBottom: '5px', minHeight: '40px', borderSpacing: '2px' }}>
                                                <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Prev Info</span>
                                                <div style={{ fontSize: '9px', display: 'flex', alignItems: 'flex-start', lineHeight: '1.1', marginTop: '-4px' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>HISTORY & REPORTS</span> <span style={{ fontFamily: 'Brush Script MT, cursive', fontStyle: 'italic', color: '#0000FF', fontSize: '12px', marginLeft: '4px' }}>{visit.historyReports}</span></div>
                                            </div>

                                            {/* Chief Complaints */}
                                            <div style={{ border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', marginBottom: '5px', minHeight: '30px', borderSpacing: '2px' }}>
                                                <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Sign & Symptoms</span>
                                                <div style={{ fontSize: '9px', display: 'flex', alignItems: 'flex-start', lineHeight: '1.1', marginTop: '-4px' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>CHIEF COMPLAINTS</span> <span style={{ fontFamily: 'Brush Script MT, cursive', fontStyle: 'italic', color: '#0000FF', fontSize: '12px', marginLeft: '4px' }}>{visit.majorComplaints}</span></div>
                                            </div>

                                            {/* Investigations & Prov Diagnosis */}
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', minHeight: '22px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Investigations Order</span>
                                                    <div style={{ fontFamily: 'Brush Script MT, cursive', fontStyle: 'italic', color: '#0000FF', fontSize: '12px', lineHeight: '1.1', marginTop: '-4px' }}>{visit.investigations}</div>
                                                </div>
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', minHeight: '22px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Prov Diagnosis</span>
                                                    <div style={{ fontFamily: 'Brush Script MT, cursive', fontStyle: 'italic', color: '#0000FF', fontSize: '12px', lineHeight: '1.1', marginTop: '-4px' }}>{visit.provisionalDiagnosis || visit.diagnoses}</div>
                                                </div>
                                            </div>

                                            {/* Improvements */}
                                            <div style={{ border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', marginBottom: '5px', minHeight: '22px', borderSpacing: '2px' }}>
                                                <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Cure</span>
                                                <div style={{ fontSize: '9px', display: 'flex', alignItems: 'flex-start', lineHeight: '1.1', marginTop: '-4px' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>IMPROVEMENTS</span> <span style={{ fontFamily: 'Brush Script MT, cursive', fontStyle: 'italic', color: '#0000FF', fontSize: '12px', marginLeft: '4px' }}>{visit.improvements}</span></div>
                                            </div>

                                            {/* Discuss */}
                                            <div style={{ border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', marginBottom: '5px', minHeight: '22px', borderSpacing: '2px' }}>
                                                <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Discuss</span>
                                                <div style={{ fontSize: '9px', display: 'flex', alignItems: 'flex-start', marginTop: '-4px' }}><span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>DISCUSS</span> <span style={{ fontFamily: 'Brush Script MT, cursive', fontStyle: 'italic', color: '#0000FF', fontSize: '12px', marginLeft: '4px' }}>{visit.discussion}</span></div>
                                            </div>

                                            {/* Prescription Table */}
                                            <div className="mb-2" style={{ marginTop: '0.25rem' }}>
                                                {(() => {
                                                    const hasSpy4 = visit.prescriptions?.some((p: any) => p.spy4) || false
                                                    const hasSpy6 = visit.prescriptions?.some((p: any) => p.spy6) || false

                                                    return (
                                                        <table className="w-full" style={{ fontSize: '0.55rem', borderCollapse: 'collapse' }}>
                                                            <tbody>
                                                                {!visit.prescriptions || visit.prescriptions.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={11} style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>No medications prescribed</td>
                                                                    </tr>
                                                                ) : (
                                                                    visit.prescriptions.map((p: any, index: number) => {
                                                                        const product = products.find((prod) => prod.id === p.productId)
                                                                        const medicineName = (product?.name || p.product?.name || p.treatment?.treatmentPlan || '').toUpperCase()
                                                                        const textColor = p.patientHasMedicine ? '#FF0000' : '#000'

                                                                        return (
                                                                            <tr key={p.id}>
                                                                                <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '3%', fontWeight: 'bold', fontSize: '0.5rem', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{index + 1}</td>
                                                                                <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', color: p.patientHasMedicine ? '#FF0000' : '#008000', width: '15%', fontWeight: 'bold', fontSize: '0.55rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{medicineName}</td>
                                                                                <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '6%', color: p.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}></td>
                                                                                <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '6%', color: p.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}></td>
                                                                                <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '6%', color: p.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}></td>
                                                                                {hasSpy4 && <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '6%', color: p.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}></td>}
                                                                                {hasSpy6 && <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '6%', color: p.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}></td>}
                                                                                <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', color: p.patientHasMedicine ? '#FF0000' : '#C80000', textTransform: 'uppercase', width: '8%', fontWeight: 'bold', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.timing || ''}</td>
                                                                                <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '6%', color: p.patientHasMedicine ? '#FF0000' : '#800080', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.dosage || ''}</td>
                                                                                <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '6%', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.additions || ''}</td>
                                                                                <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '8%', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.presentation || ''}</td>
                                                                                <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '6%', color: p.patientHasMedicine ? '#FF0000' : '#FF8C00', fontWeight: 'bold', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(p.droppersToday?.toString() || '').toUpperCase()}</td>
                                                                            </tr>
                                                                        )
                                                                    })
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    )
                                                })()}
                                            </div>

                                            {/* Orange Separator after table */}
                                            <div style={{ borderBottom: '2px solid #FF8C00', marginBottom: '1rem', marginLeft: '0.5rem', marginRight: '0.5rem' }}></div>
                                        </div>

                                        {/* Watermark Stamp - Positioned above footer on the right */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '2rem', marginBottom: '0.5rem', marginTop: '1.5rem' }}>
                                            <img src="/watermark.png" alt="Watermark" style={{ width: '90px', height: 'auto', display: 'block', opacity: 0.8 }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                        </div>

                                        {/* Footer Image */}
                                        <div style={{ marginTop: 'auto', width: '100%', flexShrink: 0, marginBottom: '1.5rem' }}>
                                            <img src="/footer.png" alt="Footer" style={{ width: '100%', height: 'auto', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                        </div>
                                    </>
                                )}

                                {/* Blue Separator Line and everything after it - Only show in OFFICE copy */}
                                {copyType === 'OFFICE' && (
                                    <>
                                        <div style={{ padding: '0 1.5rem' }}>
                                            {/* Blue Separator Line - Full Width */}
                                            <div style={{ borderBottom: '2px solid #0000FF', marginBottom: '0.5rem', marginLeft: '-1.5rem', marginRight: '-1.5rem' }}></div>

                                            {/* Top Row: Particulars and Patient Info */}
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                                                
                                                {/* Left Box: Particulars */}
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Particulars</span>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', fontSize: '0.75rem', lineHeight: '1.2', marginTop: '-4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>OPDN:</span> <span style={{ fontWeight: 'bold', color: '#0000FF', marginLeft: '3px' }}>{visit.patient?.opdNo || visit.opdNo || ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>VISIT:</span> <span style={{ fontWeight: 'bold', color: '#008000', marginLeft: '3px' }}>{visit.visitNumber || visit.visit_number || visit.followUpCount || '1'}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>PHONE:</span> <span style={{ fontWeight: 'bold', color: '#800080', marginLeft: '3px' }}>{visit.patient?.phone || visit.phone || ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>DOB:</span> <span style={{ fontWeight: 'bold', color: '#008000', marginLeft: '3px' }}>{visit.patient?.dob || visit.dob ? new Date(visit.patient?.dob || visit.dob).toLocaleDateString() : ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>GENDER:</span> <span style={{ fontWeight: 'bold', color: '#FF8C00', marginLeft: '3px' }}>{visit.patient?.gender || visit.gender || ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>AGE:</span> <span style={{ fontWeight: 'bold', color: '#008000', marginLeft: '3px' }}>{visit.age || visit.patient?.age || 'N/A'}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>DATE:</span> <span style={{ fontWeight: 'bold', color: '#C80000', marginLeft: '3px' }}>{new Date(visit.date).toLocaleDateString()}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><a href={`#nextVisit`} style={{ fontSize: '0.55rem', fontWeight: 'bold', textDecoration: 'none', color: '#000', cursor: 'pointer' }}>F UP:</a> <span style={{ fontWeight: 'bold', color: '#C80000', marginLeft: '3px' }}>{visit.nextVisit ? new Date(visit.nextVisit).toLocaleDateString() : ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>NEXT VISIT:</span> <span style={{ fontWeight: 'bold', color: '#C80000', marginLeft: '3px' }}>{visit.nextVisit ? new Date(visit.nextVisit).toLocaleDateString() : ''}</span></div>
                                                    </div>
                                                </div>

                                                {/* Right Box: Patient Info */}
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', display: 'flex', gap: '5px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Patient Info</span>
                                                    
                                                    <div style={{ flex: 1 }}>
                                                        {/* Indicator Box Removed from Office Copy */}
                                                        
                                                        <div style={{ fontSize: '0.75rem', lineHeight: '1.2', marginTop: '-4px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>NAME:</span> <span style={{ fontWeight: 'bold', color: '#FF0000', marginLeft: '3px' }}>{visit.patient?.firstName || ''} {visit.patient?.lastName || ''}</span></div>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>FATHER:</span> <span style={{ fontWeight: 'bold', color: '#FF8C00', marginLeft: '3px' }}>{visit.patient?.fatherHusbandGuardianName || ''}</span></div>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.55rem', fontWeight: 'bold' }}>ADDRESS:</span> <span style={{ fontWeight: 'bold', color: '#0000FF', marginLeft: '3px' }}>{visit.patient?.address || visit.address || ''}</span></div>
                                                        </div>
                                                    </div>

                                                    {/* Patient Image */}
                                                    <div style={{ width: '60px', height: '75px', border: '1px solid #ddd', overflow: 'hidden', flexShrink: 0 }}>
                                                        {visit.patient?.imageUrl ? (
                                                            <img
                                                                src={visit.patient.imageUrl}
                                                                alt="Patient"
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                onError={(e) => {
                                                                    e.currentTarget.src = process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || '/default-patient.png'
                                                                }}
                                                            />
                                                        ) : (
                                                            <img
                                                                src={process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || '/default-patient.png'}
                                                                alt="Patient"
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                onError={(e) => {
                                                                    const target = e.currentTarget as HTMLImageElement
                                                                    target.style.display = 'none'
                                                                    const parent = target.parentElement
                                                                    if (parent) {
                                                                        parent.style.backgroundColor = '#f0f0f0'
                                                                        parent.style.display = 'flex'
                                                                        parent.style.alignItems = 'center'
                                                                        parent.style.justifyContent = 'center'
                                                                        parent.innerHTML = '<div style="font-size: 0.6rem; color: #999;">No Image</div>'
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Middle Row: Medical Info */}
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                                                {/* Box 1: Parameters */}
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Parameters</span>
                                                    <div style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>TEMP:</span> <span style={{ fontWeight: 'bold', color: '#800080', marginLeft: '4px' }}>{visit.temperament || ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>PULSE:</span> <span style={{ fontWeight: 'bold', color: '#0000FF', marginLeft: '4px' }}>{visit.pulseDiagnosis || ''}</span></div>
                                                    </div>
                                                </div>

                                                {/* Box 2: History & Complaints */}
                                                <div style={{ flex: 2, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>History & Complaints</span>
                                                    <div style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                                                        <div style={{ marginBottom: '2px', display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>HISTORY:</span> <span style={{ fontWeight: 'bold', color: '#008000', marginLeft: '4px' }}>{visit.historyReports || ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>COMPLAINTS:</span> <span style={{ fontWeight: 'bold', color: '#0000FF', marginLeft: '4px' }}>{visit.majorComplaints || ''}</span></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom Row: Diagnosis & Cure */}
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                                                <div style={{ flex: 1, border: '3px double #DAA520', borderRadius: '4px', padding: '8px', position: 'relative', paddingTop: '8px', borderSpacing: '2px' }}>
                                                    <span style={{ position: 'absolute', top: '-6px', right: '10px', background: 'linear-gradient(to bottom, #fff, #f0e68c)', padding: '0 8px', fontWeight: 'bold', fontSize: '10px', color: '#000', border: '1px solid #DAA520' }}>Diagnosis & Cure</span>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem', lineHeight: '1.2' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>IMPROVEMENTS:</span> <span style={{ fontWeight: 'bold', color: '#008000', marginLeft: '4px' }}>{visit.improvements || ''}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start' }}><span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>PROV. DIAGNOSIS:</span> <span style={{ fontWeight: 'bold', color: '#0000FF', marginLeft: '4px' }}>{visit.provisionalDiagnosis || ''}</span></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Orange Separator with margins */}
                                            <div style={{ borderBottom: '2px solid #FFA500', marginBottom: '0.5rem', marginLeft: '0.5rem', marginRight: '0.5rem' }}></div>

                                            {/* Second Medicine Table with UNITS column */}
                                            <div style={{ marginBottom: '1rem' }}>
                                                {(() => {
                                                    const hasSpy4 = visit.prescriptions?.some((p: any) => p.spy4)
                                                    const hasSpy5 = visit.prescriptions?.some((p: any) => p.spy5)
                                                    const hasSpy6 = visit.prescriptions?.some((p: any) => p.spy6)
                                                    const hasAdd2 = visit.prescriptions?.some((p: any) => p.addition2)
                                                    const hasAdd3 = visit.prescriptions?.some((p: any) => p.addition3)

                                                    return (
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.55rem' }}>
                                                            <tbody>
                                                                {visit.prescriptions?.map((prescription: any, index: number) => {
                                                                    const product = products.find((p: any) => p.id === prescription.productId)
                                                                    const availableUnits = product?.units || 0
                                                                    const isLowStock = availableUnits <= 0
                                                                    const totalPrice = (product?.priceRupees || 0) * (prescription.quantity || 0)
                                                                    const textColor = prescription.patientHasMedicine ? '#FF0000' : '#000'
                                                                    
                                                                    return (
                                                                        <tr key={index}>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '60px', fontWeight: 'bold', color: textColor, fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{totalPrice.toFixed(2)}</td>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '30px', fontWeight: 'bold', fontSize: '0.5rem', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{index + 1}</td>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '120px', color: prescription.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', fontSize: '0.55rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product?.name?.toUpperCase() || ''}</td>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '40px', color: prescription.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.spy1 || ''}</td>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '40px', color: prescription.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.spy2 || ''}</td>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '40px', color: prescription.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.spy3 || ''}</td>
                                                                            {hasSpy4 && <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '40px', color: prescription.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.spy4 || ''}</td>}
                                                                            {hasSpy5 && <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '40px', color: prescription.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.spy5 || ''}</td>}
                                                                            {hasSpy6 && <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '40px', color: prescription.patientHasMedicine ? '#FF0000' : '#008000', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.spy6 || ''}</td>}
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '60px', color: prescription.patientHasMedicine ? '#FF0000' : '#C80000', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.timing || ''}</td>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '60px', color: prescription.patientHasMedicine ? '#FF0000' : '#800080', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.dosage || ''}</td>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '60px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.addition1 || prescription.additions || ''}</td>
                                                                            {hasAdd2 && <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '60px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.addition2 || ''}</td>}
                                                                            {hasAdd3 && <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '60px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.addition3 || ''}</td>}
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '60px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.procedure || ''}</td>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '60px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.5rem', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.presentation || ''}</td>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '60px', color: prescription.patientHasMedicine ? '#FF0000' : '#FF8C00', fontWeight: 'bold', fontSize: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(prescription.droppersToday?.toString() || '').toUpperCase()}</td>
                                                                            <td style={{ padding: '0.1rem 0.2rem', textAlign: 'center', width: '60px', fontWeight: 'bold', fontSize: '0.5rem', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prescription.quantity || ''}</td>
                                                                        </tr>
                                                                    )
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    )
                                                })()}
                                            </div>

                                            {/* Summary Row matching table columns */}
                                            <div style={{ display: 'flex', marginBottom: '1rem', marginTop: '1.5rem', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#90EE90', padding: '0.5rem', borderRadius: '4px' }}>
                                                {(() => {
                                                    // Calculate total price excluding items where patientHasMedicine is true
                                                    const totalPrice = visit.prescriptions?.reduce((sum: number, p: any) => {
                                                        if (p.patientHasMedicine) return sum
                                                        const product = products.find((prod: any) => prod.id === p.productId)
                                                        const itemPrice = (product?.priceRupees || 0) * (p.quantity || 0)
                                                        return sum + itemPrice
                                                    }, 0) || 0
                                                    
                                                    const totalMedicines = visit.prescriptions?.length || 0
                                                    const daysDiff = visit.nextVisit && visit.date
                                                        ? Math.ceil((new Date(visit.nextVisit).getTime() - new Date(visit.date).getTime()) / (1000 * 60 * 60 * 24))
                                                        : 0

                                                    return (
                                                        <>
                                                            <div style={{ width: '60px', textAlign: 'center' }}>{totalPrice.toFixed(2)}</div>
                                                            <div style={{ width: '30px', textAlign: 'center' }}>{totalMedicines}</div>
                                                            <div style={{ width: '120px', paddingLeft: '0.5rem' }}>{daysDiff} DAYS</div>
                                                            <div style={{ flex: 1 }}></div>
                                                            <div style={{ width: '60px', textAlign: 'right' }}>₹{totalPrice.toFixed(2)}</div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    </>
                                )}

                            </div>
                        </div>
                    </div>

                    {/* Reports Sidebar - Right Side */}
                    <div className="w-full lg:w-80 flex-shrink-0">
                        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg shadow-md p-4 sticky top-4 border border-emerald-200 dark:border-emerald-700">
                            <h2 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Reports
                            </h2>

                            {/* Reports Description */}
                            {visit.reports && (
                                <div className="mb-4 p-3 bg-emerald-50/50 dark:bg-emerald-900/20 backdrop-blur-sm rounded-md border border-emerald-200 dark:border-emerald-700">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {visit.reports}
                                    </p>
                                </div>
                            )}

                            {/* Reports List */}
                            {reportsAttachments.length > 0 ? (
                                <div className="space-y-3">
                                    {reportsAttachments.map((attachment, index) => (
                                        <div
                                            key={index}
                                            onClick={() => {
                                                setSelectedReportUrl(attachment.url)
                                                setSelectedReportName(attachment.name)
                                            }}
                                            className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-700 dark:to-gray-600 border border-emerald-200 dark:border-emerald-600 rounded-lg cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0">
                                                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                        {attachment.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {attachment.type || 'PDF Document'}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No reports found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* PDF Viewer Modal */}
                {selectedReportUrl && (
                    <div
                        className="fixed inset-0 bg-emerald-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => {
                            setSelectedReportUrl(null)
                            setSelectedReportName('')
                        }}
                    >
                        <div
                            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-emerald-200 dark:border-emerald-700"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/20">
                                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                                    {selectedReportName}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={selectedReportUrl}
                                        download={selectedReportName}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download
                                    </a>
                                    <button
                                        onClick={() => window.open(selectedReportUrl, '_blank')}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        Open in New Tab
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedReportUrl(null)
                                            setSelectedReportName('')
                                        }}
                                        className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                                    >
                                        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* PDF Viewer */}
                            <div className="flex-1 overflow-hidden">
                                <iframe
                                    src={selectedReportUrl}
                                    className="w-full h-full"
                                    title={selectedReportName}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Print and Animation Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out;
                }
                
                @media print {
                    @page {
                        size: letter;
                        margin: 0;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    .prescription-container,
                    .prescription-container * {
                        visibility: visible;
                    }
                    
                    /* Hide the red boundary line in print */
                    .prescription-container::after {
                        display: none !important;
                    }
                    
                    .prescription-container {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 8.5in;
                        margin: 0;
                        padding: 0;
                        box-shadow: none;
                        border-radius: 0;
                        transform: scale(0.68);
                        transform-origin: top left;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    .no-print {
                        display: none !important;
                        visibility: hidden !important;
                    }
                    
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    
                    /* Preserve ALL inline color styles */
                    [style*="color: #0000FF"],
                    [style*="color: #2563eb"],
                    .text-blue-600 {
                        color: #0000FF !important;
                    }
                    [style*="color: #008000"],
                    [style*="color: #16a34a"],
                    .text-green-600 {
                        color: #008000 !important;
                    }
                    [style*="color: #C80000"],
                    [style*="color: #dc2626"],
                    .text-red-600 {
                        color: #C80000 !important;
                    }
                    [style*="color: #FF8C00"],
                    .text-orange-600 {
                        color: #FF8C00 !important;
                    }
                    [style*="color: #800080"],
                    .text-purple-600 {
                        color: #800080 !important;
                    }
                    [style*="color: #1f2937"],
                    .text-gray-800 {
                        color: #1f2937 !important;
                    }
                    [style*="color: #374151"],
                    .text-gray-700 {
                        color: #374151 !important;
                    }
                    [style*="color: #4b5563"],
                    .text-gray-600 {
                        color: #4b5563 !important;
                    }
                    [style*="background: #fef3c7"],
                    .bg-yellow-100 {
                        background-color: #fef3c7 !important;
                    }
                    
                    * {
                        background-color: transparent !important;
                    }
                    
                    .prescription-container {
                        background-color: white !important;
                    }
                    
                    @page {
                        size: letter;
                        margin: 0;
                    }
                    
                    /* Print on Letterhead - Hide images but keep their space */
                    .print-letterhead .header-container img,
                    .print-letterhead .separator-container img,
                    .print-letterhead .watermark-container img {
                        visibility: hidden !important;
                    }
                }
                /* Screen view - exact A4 dimensions to match PDF output */
                .prescription-container {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    border-radius: 8px;
                    background: white !important;
                    color: black !important;
                    position: relative;
                }
                
                /* Letterhead mode - Hide images but keep space (for html2canvas capture) */
                .print-letterhead .header-container img,
                .print-letterhead .separator-container img,
                .print-letterhead .watermark-container img {
                    opacity: 0 !important;
                    visibility: hidden !important;
                }
            `}} />
        </div>
    )
}
