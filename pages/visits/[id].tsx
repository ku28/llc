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
    const [showPrintModal, setShowPrintModal] = useState(false)
    const prescriptionRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!id) return
        fetch('/api/visits').then(r => r.json()).then(list => {
            const found = list.find((v: any) => String(v.id) === String(id))
            setVisit(found)
        })
        
        // Fetch products for medicine names
        fetch('/api/products').then(r => r.json()).then(data => {
            setProducts(data)
        }).catch(err => console.error('Failed to fetch products:', err))
    }, [id])

    const generatePDF = async () => {
        if (!visit) return
        
        setIsGeneratingPDF(true)
        
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
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

        // Add header image - full width, no margins (reduced size)
        let yPos = 0
        try {
            const headerImg = new Image()
            headerImg.crossOrigin = 'Anonymous'
            await new Promise((resolve, reject) => {
                headerImg.onload = () => {
                    doc.addImage(headerImg, 'JPEG', 0, 0, pageWidth, 30)
                    resolve(true)
                }
                headerImg.onerror = () => {
                    console.error('Failed to load header image')
                    resolve(false)
                }
                headerImg.src = '/header.png'
            })
            yPos = 32
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

        // ===== PATIENT INFO SECTION (4 columns, 4 rows) =====
        const col1X = 15        // Left column (OPDN, Date, Phone, Weight)
        const col2X = 85        // Second column (Patient Name, Father Name, Address) - moved to center
        const col3X = 140       // Third column (Age/DOB, Gender, Visit, Height)
        const col4X = 185       // Fourth column (Patient Image)
        
        doc.setFontSize(8)
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
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 255)
        doc.text(new Date(visit.date).toLocaleDateString('en-GB').toUpperCase(), col1X + 15, yPos)
        doc.setTextColor(0, 0, 0)

        doc.setFont('helvetica', 'bold')
        doc.text('Father Name:', col2X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(128, 0, 128)
        doc.text((visit.fatherHusbandGuardianName || visit.patient?.fatherHusbandGuardianName || 'N/A').toUpperCase(), col2X + 25, yPos)
        doc.setTextColor(0, 0, 0)

        doc.setFont('helvetica', 'bold')
        doc.text('Gender:', col3X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 140, 0)
        doc.text((visit.gender || visit.patient?.gender || 'N/A').toUpperCase(), col3X + 18, yPos)
        doc.setTextColor(0, 0, 0)

        yPos += 5

        // Row 3
        doc.setFont('helvetica', 'bold')
        doc.text('Phone:', col1X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 128, 0)
        doc.text((visit.phone || visit.patient?.phone || 'N/A').toUpperCase(), col1X + 15, yPos)
        doc.setTextColor(0, 0, 0)

        doc.setFont('helvetica', 'bold')
        doc.text('Address:', col2X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(128, 0, 128)
        const address = (visit.address || visit.patient?.address || 'N/A').toUpperCase()
        doc.text(address.substring(0, 40), col2X + 25, yPos)
        doc.setTextColor(0, 0, 0)

        doc.setFont('helvetica', 'bold')
        doc.text('Visit No.:', col3X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 255)
        doc.text(`${visit.visitNumber || '1'}`.toUpperCase(), col3X + 18, yPos)
        doc.setTextColor(0, 0, 0)

        yPos += 5

        // Row 4
        doc.setFont('helvetica', 'bold')
        doc.text('Weight:', col1X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(200, 0, 0)
        doc.text((visit.weight ? `${visit.weight} KG` : 'N/A').toUpperCase(), col1X + 15, yPos)
        doc.setTextColor(0, 0, 0)

        doc.setFont('helvetica', 'bold')
        doc.text('Height:', col3X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(200, 0, 0)
        doc.text((visit.height ? `${visit.height} CM` : 'N/A').toUpperCase(), col3X + 18, yPos)

        yPos += 5

        // Orange separator line with margins
        doc.setDrawColor(255, 140, 0)
        doc.setLineWidth(0.5)
        doc.line(10, yPos, pageWidth - 10, yPos)

        yPos += 4

        // ===== MEDICAL INFO SECTION =====
        // Column 1: 5 rows on the left (under first column of previous section)
        const medicalCol1X = col1X
        const medicalCol2X = col3X  // Right side (under third column of previous section)
        
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        
        // Column 1 - Row 1: Temperament
        doc.text('Temperament:', medicalCol1X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(128, 0, 128)
        doc.text((visit.temperament || 'N/A').toUpperCase(), medicalCol1X + 25, yPos)
        doc.setTextColor(0, 0, 0)
        
        yPos += 4

        // Column 1 - Row 2: Pulse Diagnosis
        doc.setFont('helvetica', 'bold')
        doc.text('Pulse Diagnosis:', medicalCol1X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 255)
        doc.text(([visit.pulseDiagnosis, visit.pulseDiagnosis2].filter(Boolean).join(', ') || 'N/A').toUpperCase(), medicalCol1X + 28, yPos)
        doc.setTextColor(0, 0, 0)

        yPos += 4

        // Column 1 - Row 3: History/Reports
        doc.setFont('helvetica', 'bold')
        doc.text('History/Reports:', medicalCol1X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(200, 0, 0)
        doc.text((visit.historyReports || 'N/A').toUpperCase(), medicalCol1X + 28, yPos)
        doc.setTextColor(0, 0, 0)

        yPos += 4

        // Column 1 - Row 4: Major Complaints
        doc.setFont('helvetica', 'bold')
        doc.text('Major Complaints:', medicalCol1X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 255)
        doc.text((visit.majorComplaints || 'N/A').toUpperCase(), medicalCol1X + 30, yPos)
        doc.setTextColor(0, 0, 0)

        yPos += 4

        // Column 1 - Row 5: Improvement
        doc.setFont('helvetica', 'bold')
        doc.text('Improvement:', medicalCol1X, yPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 128, 0)
        doc.text((visit.improvements || 'N/A').toUpperCase(), medicalCol1X + 25, yPos)
        doc.setTextColor(0, 0, 0)

        // Reset yPos for right column (2 rows aligned with last rows of left column)
        const rightColYPos = yPos - 8  // Start at row 4 position

        // Column 2 - Row 1: Investigation
        doc.setFont('helvetica', 'bold')
        doc.text('Investigation:', medicalCol2X, rightColYPos)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 140, 0)
        doc.text((visit.investigations || 'N/A').toUpperCase(), medicalCol2X + 25, rightColYPos)
        doc.setTextColor(0, 0, 0)

        // Column 2 - Row 2: Prov. Diagnosis
        doc.setFont('helvetica', 'bold')
        doc.text('Prov. Diagnosis:', medicalCol2X, rightColYPos + 4)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 255)
        doc.text((visit.provisionalDiagnosis || visit.diagnoses || 'N/A').toUpperCase(), medicalCol2X + 28, rightColYPos + 4)
        doc.setTextColor(0, 0, 0)

        yPos += 4

        // Orange separator line with margins
        doc.setDrawColor(255, 140, 0)
        doc.setLineWidth(0.5)
        doc.line(10, yPos, pageWidth - 10, yPos)

        yPos += 4

        // ===== DISC SECTION =====
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(200, 0, 0)
        doc.text('DISC:', col1X, yPos)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        const diagnosis = visit.provisionalDiagnosis?.toUpperCase() || visit.diagnoses?.toUpperCase() || 'N/A'
        doc.text(diagnosis, col1X + 15, yPos)
        doc.setTextColor(0, 0, 0)

        yPos += 5

        // Prepare table data with new column structure
        const tableData = prescriptions.map((pr: any, index: number) => {
            const product = products.find((p: any) => String(p.id) === String(pr.productId))
            const row = [
                String(index + 1),  // #
                product?.name?.toUpperCase() || pr.treatment?.treatmentPlan?.toUpperCase() || '',  // Medicine name
                '',  // comp1 - hardcoded blank
                '',  // comp2 - hardcoded blank
                '',  // comp3 - hardcoded blank
            ]
            
            // Only add comp4 and comp5 if they exist in any prescription
            const hasComp4 = prescriptions.some((p: any) => p.comp4)
            const hasComp5 = prescriptions.some((p: any) => p.comp5)
            
            if (hasComp4) row.push('')  // comp4 - hardcoded blank
            if (hasComp5) row.push('')  // comp5 - hardcoded blank
            
            row.push(
                (pr.timing || '').toUpperCase(),  // timing
                (pr.dosage || '').toUpperCase(),  // dose
                (pr.additions || '').toUpperCase(),  // additions
                (pr.procedure || '').toUpperCase(),  // procedure
                (pr.presentation || '').toUpperCase(),  // presentation
                (pr.droppersToday?.toString() || '').toUpperCase(),  // droppers today
                pr.quantity || ''  // quantity
            )
            
            return row
        })

        // Check if comp4 and comp5 columns are needed
        const hasComp4 = prescriptions.some((p: any) => p.comp4)
        const hasComp5 = prescriptions.some((p: any) => p.comp5)

        // Build header dynamically
        const tableHead = ['', '', '', '', '']  // #, Medicine, comp1, comp2, comp3
        if (hasComp4) tableHead.push('')
        if (hasComp5) tableHead.push('')
        tableHead.push('', '', '', '', '', '', '')  // timing, dose, additions, procedure, presentation, droppers, qty

        // Build column styles dynamically - more compact
        const columnStyles: any = {
            0: { cellWidth: 6, halign: 'center', textColor: [0, 0, 0] },   // #
            1: { cellWidth: 30, halign: 'left', textColor: [0, 0, 255], fontStyle: 'bold' },    // Medicine name (blue, bold)
            2: { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] },  // comp1 (green)
            3: { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] },  // comp2 (green)
            4: { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] },  // comp3 (green)
        }
        
        let colIndex = 5
        if (hasComp4) {
            columnStyles[colIndex] = { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] }  // comp4 (green)
            colIndex++
        }
        if (hasComp5) {
            columnStyles[colIndex] = { cellWidth: 10, halign: 'center', textColor: [0, 128, 0] }  // comp5 (green)
            colIndex++
        }
        
        columnStyles[colIndex] = { cellWidth: 13, halign: 'center', textColor: [200, 0, 0], fontStyle: 'bold' }  // timing (red, bold)
        columnStyles[colIndex + 1] = { cellWidth: 10, halign: 'center', textColor: [128, 0, 128] }  // dose (purple)
        columnStyles[colIndex + 2] = { cellWidth: 10, halign: 'center', textColor: [0, 0, 0] }  // additions (black)
        columnStyles[colIndex + 3] = { cellWidth: 10, halign: 'center', textColor: [0, 0, 0] }  // procedure (black)
        columnStyles[colIndex + 4] = { cellWidth: 12, halign: 'center', textColor: [0, 0, 0] }  // presentation (black)
        columnStyles[colIndex + 5] = { cellWidth: 10, halign: 'center', textColor: [255, 140, 0] }  // droppers today (orange)
        columnStyles[colIndex + 6] = { cellWidth: 8, halign: 'center', textColor: [0, 0, 0], fontStyle: 'bold' }  // quantity (black, bold)

        autoTable(doc, {
            startY: yPos,
            head: [tableHead],
            body: tableData,
            styles: {
                fontSize: 6,
                cellPadding: 0.5,
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
        
        afterTableY += 3
        
        // Add separator image - full width, no margins (reduced size)
        let afterSeparatorY = afterTableY
        try {
            const separatorImg = new Image()
            separatorImg.crossOrigin = 'Anonymous'
            await new Promise((resolve) => {
                separatorImg.onload = () => {
                    doc.addImage(separatorImg, 'JPEG', 0, afterTableY, pageWidth, 25)
                    afterSeparatorY = afterTableY + 25
                    resolve(true)
                }
                separatorImg.onerror = () => {
                    console.error('Failed to load separator image')
                    afterSeparatorY = afterTableY
                    resolve(false)
                }
                separatorImg.src = '/separator.png'
            })
        } catch (error) {
            console.error('Error adding separator:', error)
            afterSeparatorY = afterTableY
        }

        // ===== BLUE LINE SEPARATOR (FULL WIDTH) =====
        let currentY = afterSeparatorY + 3
        doc.setDrawColor(0, 0, 255) // Blue color
        doc.setLineWidth(0.5)
        doc.line(0, currentY, pageWidth, currentY)
        
        currentY += 5
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'bold')

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
        doc.text(`${(visit.patient?.firstName || '').toUpperCase()} ${(visit.patient?.lastName || '').toUpperCase()}`, row1Col2, currentY + 2)
        
        doc.setFontSize(6)
        doc.setTextColor(0, 0, 0)
        doc.text('Visit No.:', row1Col3, currentY - 2)
        doc.setFontSize(9)
        doc.setTextColor(0, 128, 0)
        doc.text(`${(visit.visitNumber || '').toString().toUpperCase()}`, row1Col3, currentY + 2)
        
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
        doc.text(`${(visit.patient?.fatherHusbandGuardianName || '').toUpperCase()}`, row1Col5, currentY + 2)
        
        doc.setFontSize(6)
        doc.setTextColor(0, 0, 0)
        doc.text('Address:', row1Col6, currentY - 2)
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 255)
        doc.text(`${(visit.patient?.address || visit.address || '').toUpperCase()}`, row1Col6, currentY + 2)

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
        doc.text(`${(visit.temperament || '').toUpperCase()}`, row2Col1, currentY + 2)
        
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
        doc.text(`${(visit.pulseDiagnosis || '').toUpperCase()}`, row2Col1, currentY + 2)
        
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
        doc.text(`${(visit.historyReports || '').toUpperCase()}`, row2Col3, currentY + 2)

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
        doc.text(`${(visit.majorComplaints || '').toUpperCase()}`, row2Col3, currentY + 2)

        currentY += 7

        // ===== ROW 5: 2 COLUMNS =====
        // improvements, provisional diagnosis
        doc.setFontSize(6)
        doc.setTextColor(0, 0, 0)
        doc.text('Improvements:', row2Col1, currentY - 2)
        doc.setFontSize(9)
        doc.setTextColor(0, 128, 0)
        doc.text(`${(visit.improvements || '').toUpperCase()}`, row2Col1, currentY + 2)
        
        doc.setFontSize(6)
        doc.setTextColor(0, 0, 0)
        doc.text('Prov. Diagnosis:', row2Col2 + 30, currentY - 2)
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 255)
        doc.text(`${(visit.provisionalDiagnosis || '').toUpperCase()}`, row2Col2 + 30, currentY + 2)
        doc.setTextColor(0, 0, 0)

        // Add patient image on the right side (parallel to all rows) - smaller size
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
        table2Headers.push('#', 'MEDICINE NAME', 'COMP1', 'COMP2', 'COMP3')
        if (hasComp4) table2Headers.push('COMP4')
        if (hasComp5) table2Headers.push('COMP5')
        table2Headers.push('TIMING', 'DOSE', 'ADDITIONS', 'PROCEDURE', 'PRESENTATION', 'DROPPERS TODAY', 'QUANTITY')

        const table2Body = prescriptions.map((prescription: any, index: number) => {
            const product = products.find((p: any) => p.id === prescription.productId)
            const units = (product?.units || 0) - (prescription.quantity || 0)
            const row = [
                units.toString(),
                (index + 1).toString(),
                (product?.name || '').toUpperCase(),
                (prescription.comp1 || '').toUpperCase(),
                (prescription.comp2 || '').toUpperCase(),
                (prescription.comp3 || '').toUpperCase()
            ]
            if (hasComp4) row.push((prescription.comp4 || '').toUpperCase())
            if (hasComp5) row.push((prescription.comp5 || '').toUpperCase())
            row.push(
                (prescription.timing || '').toUpperCase(),
                (prescription.dosage || '').toUpperCase(),
                (prescription.additions || '').toUpperCase(),
                (prescription.procedure || '').toUpperCase(),
                (prescription.presentation || '').toUpperCase(),
                (prescription.droppersToday?.toString() || '').toUpperCase(),
                prescription.quantity?.toString() || ''
            )
            return row
        })

        const table2ColumnStyles: any = {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 8, halign: 'center' },
            2: { cellWidth: 28 }
        }
        
        let table2ColIndex = 3
        for (let i = 0; i < 3; i++) {
            table2ColumnStyles[table2ColIndex++] = { cellWidth: 12 }
        }
        if (hasComp4) table2ColumnStyles[table2ColIndex++] = { cellWidth: 12 }
        if (hasComp5) table2ColumnStyles[table2ColIndex++] = { cellWidth: 12 }
        
        const remainingCols = 6
        for (let i = 0; i < remainingCols; i++) {
            table2ColumnStyles[table2ColIndex++] = { cellWidth: 12 }
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
            return sum + ((product?.units || 0) - (p.quantity || 0))
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

        // ===== FOOTER =====
        doc.setFontSize(6)
        doc.setTextColor(150, 150, 150)
        doc.text('Designed by DrugBase', pageWidth - 40, pageHeight - 10)

        // Add copy label watermark in corner
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        if (copyType === 'PATIENT') {
            doc.setTextColor(0, 128, 255) // Blue for patient copy
            doc.text('PATIENT COPY', pageWidth / 2, 10, { align: 'center' })
        } else {
            doc.setTextColor(255, 0, 0) // Red for office copy
            doc.text('OFFICE COPY', pageWidth / 2, 10, { align: 'center' })
        }
        doc.setTextColor(0, 0, 0) // Reset color
        }

        // Generate first page - PATIENT COPY
        await generatePage('PATIENT')
        
        // Add new page for OFFICE COPY
        doc.addPage()
        
        // Generate second page - OFFICE COPY
        await generatePage('OFFICE')

        // Save the PDF with patient name and OPD number
        const patientName = `${visit.patient?.firstName || ''} ${visit.patient?.lastName || ''}`.trim() || 'Patient'
        const opdNo = visit.opdNo || visit.id || 'Unknown'
        const fileName = `${patientName} ${opdNo}.pdf`
        doc.save(fileName)
        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Failed to generate PDF. Please try again.')
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const downloadPreviewAsPDF = async () => {
        if (!prescriptionRef.current || !visit) return
        
        setIsGeneratingPDF(true)
        
        try {
            // Capture the prescription container as canvas with high quality
            const canvas = await html2canvas(prescriptionRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: prescriptionRef.current.scrollWidth,
                windowHeight: prescriptionRef.current.scrollHeight
            })
            
            const imgData = canvas.toDataURL('image/png')
            
            // Create PDF with letter size
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            })
            
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            
            // Calculate dimensions to fit the page while maintaining aspect ratio
            const imgWidth = pageWidth
            const imgHeight = (canvas.height * pageWidth) / canvas.width
            
            // If image is taller than page, scale it down
            let finalWidth = imgWidth
            let finalHeight = imgHeight
            
            if (imgHeight > pageHeight) {
                finalHeight = pageHeight
                finalWidth = (canvas.width * pageHeight) / canvas.height
            }
            
            // Add image to PDF with no margins - fill the page
            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, finalHeight > pageHeight ? pageHeight : finalHeight)
            
            // Save with patient name and OPD number
            const patientName = `${visit.patient?.firstName || ''} ${visit.patient?.lastName || ''}`.trim() || 'Patient'
            const opdNo = visit.opdNo || visit.id || 'Unknown'
            const fileName = `${patientName} ${opdNo}.pdf`
            
            pdf.save(fileName)
        } catch (error) {
            console.error('Error generating PDF from preview:', error)
            alert('Failed to generate PDF. Please try again.')
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const handlePrintLetterhead = async () => {
        setShowPrintModal(false)
        if (!prescriptionRef.current) return
        
        try {
            // Add letterhead class to hide images
            prescriptionRef.current.classList.add('print-letterhead')
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Capture as canvas
            const canvas = await html2canvas(prescriptionRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: prescriptionRef.current.scrollWidth,
                height: prescriptionRef.current.scrollHeight
            })
            
            // Remove letterhead class
            prescriptionRef.current.classList.remove('print-letterhead')
            
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
        }
    }

    const handlePrintPlain = async () => {
        setShowPrintModal(false)
        if (!prescriptionRef.current) return
        
        try {
            // Capture as canvas
            const canvas = await html2canvas(prescriptionRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: prescriptionRef.current.scrollWidth,
                height: prescriptionRef.current.scrollHeight
            })
            
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
        }
    }

    if (!visit) return <div className="flex items-center justify-center h-64"><div className="text-muted">Loading...</div></div>

    return (
        <div className="bg-gray-50 min-h-screen py-6">
            <div className="max-w-7xl mx-auto px-4">
                {/* Info Bar - Simple, No Background with Dark Mode */}
                <div className="no-print flex justify-between items-center mb-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">OPD No:</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{visit?.opdNo || visit?.id || 'N/A'}</span>
                        </div>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient:</span>
                            <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                                {visit?.patient?.firstName || ''} {visit?.patient?.lastName || ''}
                            </span>
                        </div>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Date:</span>
                            <span className="text-base font-semibold text-gray-700 dark:text-gray-300">
                                {visit?.date ? new Date(visit.date).toLocaleDateString('en-GB') : 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => router.push('/visits')} 
                            className="px-3 py-1.5 bg-gray-600 dark:bg-gray-700 text-white text-sm rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-all shadow-sm"
                        >
                            ← Back
                        </button>
                        <button 
                            onClick={() => router.push(`/prescriptions?visitId=${visit.id}&edit=true`)} 
                            className="px-3 py-1.5 bg-orange-500 dark:bg-orange-600 text-white text-sm rounded-md hover:bg-orange-600 dark:hover:bg-orange-500 transition-all shadow-sm"
                        >
                            ✏️ Edit
                        </button>
                        <button 
                            onClick={downloadPreviewAsPDF} 
                            disabled={isGeneratingPDF}
                            className="px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white text-sm rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            {isGeneratingPDF ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <span>📄</span>
                                    <span>Download</span>
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => setShowPrintModal(true)} 
                            className="px-3 py-1.5 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-sm flex items-center gap-1.5"
                        >
                            <span>🖨️</span>
                            <span>Print</span>
                        </button>
                    </div>
                </div>

                {/* Print Options Modal */}
                {showPrintModal && (
                    <div 
                        className="no-print fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowPrintModal(false)}
                    >
                        <div 
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Print Options</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Choose how you want to print the prescription</p>
                            
                            <div className="space-y-3">
                                <button
                                    onClick={handlePrintLetterhead}
                                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">📄</span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">Letterhead Paper</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Without header, separator & watermark</div>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={handlePrintPlain}
                                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-gray-700 transition-all"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                                                <span className="text-2xl">�</span>
                                            </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">Plain Paper</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Complete with all images</div>
                                    </div>
                                </button>
                                </div>
                                
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Prescription Sheet */}
                    <div ref={prescriptionRef} className="prescription-container" style={{ background: 'white', color: 'black', padding: '0', position: 'relative' }}>
                {/* Watermark */}
                <div className="watermark-container" style={{ position: 'absolute', top: 'calc(50% - 30px)', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }}>
                    <img src="/watermark.png" alt="Watermark" style={{ width: '400px', height: '400px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                </div>

                {/* Header Image - Full width, no margin */}
                <div className="header-container" style={{ width: '100%', overflow: 'hidden', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                    <img src="/header.png" alt="Header" style={{ width: '100%', height: 'auto', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                </div>

                <div style={{ padding: '0 1.5rem', position: 'relative', zIndex: 1 }}>
                    {/* Patient Info Section - 4 columns, 4 rows with image positioned absolutely */}
                    <div style={{ marginBottom: '0.5rem', position: 'relative' }}>
                        {/* Patient Image - Positioned absolutely on the right */}
                        <div style={{ position: 'absolute', right: 0, top: 0, width: '80px', height: '100px', border: '1px solid #ddd', overflow: 'hidden' }}>
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

                        {/* Row 1: OPDN, Patient Name, Age/DOB */}
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem', paddingRight: '100px' }}>
                            <div style={{ whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 'bold', backgroundColor: '#90EE90', padding: '0.1rem 0.25rem', borderRadius: '4px' }}>OPDN: </span>
                                <span style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>{visit.opdNo || 'N/A'}</span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontWeight: 'bold' }}>Patient Name: </span>
                                <span style={{ fontWeight: 'bold', color: '#FF0000', textTransform: 'uppercase' }}>
                                    {visit.patient?.firstName || ''} {visit.patient?.lastName || ''}
                                </span>
                            </div>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Age/DOB: </span>
                                <span style={{ fontWeight: 'bold', color: '#008000', textTransform: 'uppercase' }}>{visit.age || visit.patient?.age || 'N/A'} YR</span>
                            </div>
                        </div>

                        {/* Row 2: Date, Father Name, Gender */}
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem', paddingRight: '100px' }}>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Date: </span>
                                <span style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>{new Date(visit.date).toLocaleDateString('en-GB')}</span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontWeight: 'bold' }}>Father Name: </span>
                                <span style={{ fontWeight: 'bold', color: '#800080', textTransform: 'uppercase' }}>
                                    {visit.fatherHusbandGuardianName || visit.patient?.fatherHusbandGuardianName || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Gender: </span>
                                <span style={{ fontWeight: 'bold', color: '#FF8C00', textTransform: 'uppercase' }}>{visit.gender || visit.patient?.gender || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Row 3: Phone, Address, Visit */}
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem', paddingRight: '100px' }}>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Phone: </span>
                                <span style={{ fontWeight: 'bold', color: '#008000', textTransform: 'uppercase' }}>{visit.phone || visit.patient?.phone || 'N/A'}</span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontWeight: 'bold' }}>Address: </span>
                                <span style={{ fontWeight: 'bold', color: '#800080', textTransform: 'uppercase' }}>
                                    {visit.address || visit.patient?.address || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Visit No.: </span>
                                <span style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>{visit.visitNumber || '1'}</span>
                            </div>
                        </div>

                        {/* Row 4: Weight, (empty), Height */}
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.75rem', paddingRight: '100px' }}>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Weight: </span>
                                <span style={{ fontWeight: 'bold', color: '#C80000', textTransform: 'uppercase' }}>{visit.weight ? `${visit.weight} KG` : 'N/A'}</span>
                            </div>
                            <div></div>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Height: </span>
                                <span style={{ fontWeight: 'bold', color: '#C80000', textTransform: 'uppercase' }}>{visit.height ? `${visit.height} CM` : 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Orange Separator */}
                    <div style={{ borderBottom: '2px solid #FF8C00', marginBottom: '1rem', marginLeft: '0.5rem', marginRight: '0.5rem' }}></div>

                    {/* Medical Info Section - 2 columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
                        {/* Left Column - 5 rows */}
                        <div>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>Temperament: </span>
                                <span style={{ fontWeight: 'bold', color: '#800080', textTransform: 'uppercase' }}>{visit.temperament || 'N/A'}</span>
                            </div>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>Pulse Diagnosis: </span>
                                <span style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>
                                    {[visit.pulseDiagnosis, visit.pulseDiagnosis2].filter(Boolean).join(', ') || 'N/A'}
                                </span>
                            </div>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>History/Reports: </span>
                                <span style={{ fontWeight: 'bold', color: '#C80000', textTransform: 'uppercase' }}>{visit.historyReports || 'N/A'}</span>
                            </div>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>Major Complaints: </span>
                                <span style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>{visit.majorComplaints || 'N/A'}</span>
                            </div>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>Improvement: </span>
                                <span style={{ fontWeight: 'bold', color: '#008000', textTransform: 'uppercase' }}>{visit.improvements || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Right Column - 2 rows */}
                        <div>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>Investigation: </span>
                                <span style={{ fontWeight: 'bold', color: '#FF8C00', textTransform: 'uppercase' }}>{visit.investigations || 'N/A'}</span>
                            </div>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>Prov. Diagnosis: </span>
                                <span style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>{visit.provisionalDiagnosis || visit.diagnoses || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Orange Separator */}
                    <div style={{ borderBottom: '2px solid #FF8C00', marginBottom: '1rem', marginLeft: '0.5rem', marginRight: '0.5rem' }}></div>

                    {/* DISC Section */}
                    <div style={{ marginBottom: '1rem', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#C80000' }}>DISC: </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#C80000', textTransform: 'uppercase' }}>
                            {visit.provisionalDiagnosis || visit.diagnoses || 'N/A'}
                        </span>
                    </div>

                    {/* Prescription Table */}
                    <div className="mb-3">
                        {(() => {
                            const hasComp4 = visit.prescriptions?.some((p: any) => p.comp4) || false
                            const hasComp5 = visit.prescriptions?.some((p: any) => p.comp5) || false
                            
                            return (
                                <table className="w-full" style={{ fontSize: '0.7rem', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {!visit.prescriptions || visit.prescriptions.length === 0 ? (
                                            <tr>
                                                <td colSpan={13} style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>No medications prescribed</td>
                                            </tr>
                                        ) : (
                                            visit.prescriptions.map((p: any, index: number) => {
                                                const product = products.find((prod) => prod.id === p.productId)
                                                const medicineName = (product?.name || p.product?.name || p.treatment?.treatmentPlan || '').toUpperCase()
                                                
                                                return (
                                                    <tr key={p.id}>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '3%', fontWeight: 'bold' }}>{index + 1}</td>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'left', color: '#0000FF', width: '15%', fontWeight: 'bold' }}>{medicineName}</td>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '6%', color: '#008000', fontWeight: 'bold' }}></td>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '6%', color: '#008000', fontWeight: 'bold' }}></td>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '6%', color: '#008000', fontWeight: 'bold' }}></td>
                                                        {hasComp4 && <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '6%', color: '#008000', fontWeight: 'bold' }}></td>}
                                                        {hasComp5 && <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '6%', color: '#008000', fontWeight: 'bold' }}></td>}
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', color: '#C80000', textTransform: 'uppercase', width: '8%', fontWeight: 'bold' }}>{p.timing || ''}</td>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '6%', color: '#800080', fontWeight: 'bold', textTransform: 'uppercase' }}>{p.dosage || ''}</td>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '6%', fontWeight: 'bold', textTransform: 'uppercase' }}>{p.additions || ''}</td>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '6%', fontWeight: 'bold', textTransform: 'uppercase' }}>{p.procedure || ''}</td>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '8%', fontWeight: 'bold', textTransform: 'uppercase' }}>{p.presentation || ''}</td>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '6%', color: '#FF8C00', fontWeight: 'bold' }}>{(p.droppersToday?.toString() || '').toUpperCase()}</td>
                                                        <td style={{ padding: '0.15rem 0.25rem', textAlign: 'center', width: '5%', fontWeight: 'bold' }}>{p.quantity || ''}</td>
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
                    
                    {/* Separator Image */}
                    <div className="separator-container" style={{ width: 'calc(100% + 3rem)', marginLeft: '-1.5rem', marginRight: '-1.5rem', overflow: 'hidden', marginBottom: '1rem' }}>
                        <img src="/separator.png" alt="Separator" style={{ width: '100%', height: 'auto', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </div>

                    {/* Blue Separator Line - Full Width */}
                    <div style={{ borderBottom: '2px solid #0000FF', marginBottom: '1rem', marginLeft: '-1.5rem', marginRight: '-1.5rem' }}></div>

                    {/* Section with rows and patient image */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                            {/* Row 1: 6 columns - opdn, patient name, visit no, phone, father's name, location */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000', backgroundColor: '#90EE90', display: 'inline-block', padding: '0.1rem 0.25rem', borderRadius: '4px' }}>OPDN:</div>
                                    <div style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>{visit.patient?.opdNo || visit.opdNo || ''}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Patient Name:</div>
                                    <div style={{ fontWeight: 'bold', color: '#FF0000', textTransform: 'uppercase' }}>{visit.patient?.firstName || ''} {visit.patient?.lastName || ''}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Visit No.:</div>
                                    <div style={{ fontWeight: 'bold', color: '#008000', textTransform: 'uppercase' }}>{visit.visitNumber || ''}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Phone:</div>
                                    <div style={{ fontWeight: 'bold', color: '#800080', textTransform: 'uppercase' }}>{visit.patient?.phone || visit.phone || ''}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Father:</div>
                                    <div style={{ fontWeight: 'bold', color: '#FF8C00', textTransform: 'uppercase' }}>{visit.patient?.fatherHusbandGuardianName || ''}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Address:</div>
                                    <div style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>{visit.patient?.address || visit.address || ''}</div>
                                </div>
                            </div>

                            {/* Row 2: 3 columns - temperament, age/dob, disc */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Temperament:</div>
                                    <div style={{ fontWeight: 'bold', color: '#800080', textTransform: 'uppercase' }}>{visit.temperament || ''}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>DOB:</div>
                                    <div style={{ fontWeight: 'bold', color: '#008000', textTransform: 'uppercase' }}>{visit.patient?.dob || visit.dob ? new Date(visit.patient?.dob || visit.dob).toLocaleDateString() : ''}</div>
                                </div>
                                <div></div>
                            </div>

                            {/* Row 3: 3 columns - pulse diagnosis, date, history/report */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Pulse:</div>
                                    <div style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>{visit.pulseDiagnosis || ''}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Date:</div>
                                    <div style={{ fontWeight: 'bold', color: '#C80000', textTransform: 'uppercase' }}>{new Date(visit.date).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>History:</div>
                                    <div style={{ fontWeight: 'bold', color: '#008000', textTransform: 'uppercase' }}>{visit.historyReports || ''}</div>
                                </div>
                            </div>

                            {/* Row 4: 3 columns - gender, next visit, major complaints */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Gender:</div>
                                    <div style={{ fontWeight: 'bold', color: '#FF8C00', textTransform: 'uppercase' }}>{visit.patient?.gender || visit.gender || ''}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Next Visit:</div>
                                    <div style={{ fontWeight: 'bold', color: '#C80000', textTransform: 'uppercase' }}>{visit.nextVisit ? new Date(visit.nextVisit).toLocaleDateString() : ''}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Complaints:</div>
                                    <div style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>{visit.majorComplaints || ''}</div>
                                </div>
                            </div>

                            {/* Row 5: 2 columns - improvements, provisional diagnosis */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Improvements:</div>
                                    <div style={{ fontWeight: 'bold', color: '#008000', textTransform: 'uppercase' }}>{visit.improvements || ''}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#000' }}>Prov. Diagnosis:</div>
                                    <div style={{ fontWeight: 'bold', color: '#0000FF', textTransform: 'uppercase' }}>{visit.provisionalDiagnosis || ''}</div>
                                </div>
                            </div>
                        </div>

                        {/* Patient Image - Right Side */}
                        <div style={{ width: '80px', height: '100px', border: '1px solid #ddd', overflow: 'hidden', flexShrink: 0 }}>
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

                    {/* Orange Separator with margins */}
                    <div style={{ borderBottom: '2px solid #FFA500', marginBottom: '1rem', marginLeft: '0.5rem', marginRight: '0.5rem' }}></div>

                    {/* Second Medicine Table with UNITS column */}
                    <div style={{ marginBottom: '1rem' }}>
                        {(() => {
                            const hasComp4 = visit.prescriptions?.some((p: any) => p.comp4)
                            const hasComp5 = visit.prescriptions?.some((p: any) => p.comp5)
                            
                            return (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' }}>
                                    <tbody>
                                        {visit.prescriptions?.map((prescription: any, index: number) => {
                                            const product = products.find((p: any) => p.id === prescription.productId)
                                            const units = (product?.units || 0) - (prescription.quantity || 0)
                                            return (
                                                <tr key={index}>
                                                    <td style={{ padding: '0.25rem', textAlign: 'center', width: '50px', fontWeight: 'bold' }}>{units}</td>
                                                    <td style={{ padding: '0.25rem', textAlign: 'center', width: '30px', fontWeight: 'bold' }}>{index + 1}</td>
                                                    <td style={{ padding: '0.25rem', width: '120px', color: '#0000FF', fontWeight: 'bold' }}>{product?.name?.toUpperCase() || ''}</td>
                                                    <td style={{ padding: '0.25rem', width: '60px', color: '#008000', fontWeight: 'bold', textTransform: 'uppercase' }}>{prescription.comp1 || ''}</td>
                                                    <td style={{ padding: '0.25rem', width: '60px', color: '#008000', fontWeight: 'bold', textTransform: 'uppercase' }}>{prescription.comp2 || ''}</td>
                                                    <td style={{ padding: '0.25rem', width: '60px', color: '#008000', fontWeight: 'bold', textTransform: 'uppercase' }}>{prescription.comp3 || ''}</td>
                                                    {hasComp4 && <td style={{ padding: '0.25rem', width: '60px', color: '#008000', fontWeight: 'bold', textTransform: 'uppercase' }}>{prescription.comp4 || ''}</td>}
                                                    {hasComp5 && <td style={{ padding: '0.25rem', width: '60px', color: '#008000', fontWeight: 'bold', textTransform: 'uppercase' }}>{prescription.comp5 || ''}</td>}
                                                    <td style={{ padding: '0.25rem', width: '60px', color: '#C80000', textTransform: 'uppercase', fontWeight: 'bold' }}>{prescription.timing || ''}</td>
                                                    <td style={{ padding: '0.25rem', width: '60px', color: '#800080', fontWeight: 'bold', textTransform: 'uppercase' }}>{prescription.dosage || ''}</td>
                                                    <td style={{ padding: '0.25rem', width: '60px', fontWeight: 'bold', textTransform: 'uppercase' }}>{prescription.additions || ''}</td>
                                                    <td style={{ padding: '0.25rem', width: '60px', fontWeight: 'bold', textTransform: 'uppercase' }}>{prescription.procedure || ''}</td>
                                                    <td style={{ padding: '0.25rem', width: '60px', fontWeight: 'bold', textTransform: 'uppercase' }}>{prescription.presentation || ''}</td>
                                                    <td style={{ padding: '0.25rem', width: '60px', color: '#FF8C00', fontWeight: 'bold' }}>{(prescription.droppersToday?.toString() || '').toUpperCase()}</td>
                                                    <td style={{ padding: '0.25rem', width: '60px', fontWeight: 'bold' }}>{prescription.quantity || ''}</td>
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
                            const totalUnits = visit.prescriptions?.reduce((sum: number, p: any) => {
                                const product = products.find((prod: any) => prod.id === p.productId)
                                return sum + ((product?.units || 0) - (p.quantity || 0))
                            }, 0) || 0
                            const totalMedicines = visit.prescriptions?.length || 0
                            const daysDiff = visit.nextVisit && visit.date 
                                ? Math.ceil((new Date(visit.nextVisit).getTime() - new Date(visit.date).getTime()) / (1000 * 60 * 60 * 24))
                                : 0
                            const finalAmount = (visit.amount || 0) - (visit.discount || 0)
                            
                            return (
                                <>
                                    <div style={{ width: '50px', textAlign: 'center' }}>{totalUnits}</div>
                                    <div style={{ width: '30px', textAlign: 'center' }}>{totalMedicines}</div>
                                    <div style={{ width: '120px', paddingLeft: '0.5rem' }}>{daysDiff} DAYS</div>
                                    <div style={{ flex: 1 }}></div>
                                    <div style={{ width: '60px', textAlign: 'right' }}>₹{finalAmount.toFixed(2)}</div>
                                </>
                            )
                        })()}
                    </div>

                    {/* Additional Notes at Bottom */}
                    {(visit.specialNote || visit.procedureAdopted || visit.discussion) && (
                        <div className="mt-3 pt-2 border-t border-gray-300">
                            <div className="text-xs space-y-1">
                                {visit.specialNote && (
                                    <div><span className="font-bold">Note:</span> {visit.specialNote}</div>
                                )}
                                {visit.procedureAdopted && (
                                    <div><span className="font-bold">Procedure:</span> {visit.procedureAdopted}</div>
                                )}
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {/* Print and Animation Styles */}
            <style jsx global>{`
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
                /* Screen view - exact letter width, show page boundary */
                .prescription-container {
                    width: 8.5in;
                    min-height: 11in;
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
            `}</style>
        </div>
    )
}
