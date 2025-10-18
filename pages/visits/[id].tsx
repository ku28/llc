import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function VisitDetail() {
    const router = useRouter()
    const { id } = router.query
    const [visit, setVisit] = useState<any>(null)

    useEffect(() => {
        if (!id) return
        fetch('/api/visits').then(r => r.json()).then(list => {
            const found = list.find((v: any) => String(v.id) === String(id))
            setVisit(found)
        })
    }, [id])

    const generatePDF = async () => {
        if (!visit) return

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        })

        // Function to add patient image if available
        const addPatientImage = async () => {
            if (visit.patient?.imageUrl) {
                try {
                    // Convert image URL to base64 and add to PDF
                    const img = new Image()
                    img.crossOrigin = 'Anonymous'
                    
                    return new Promise((resolve) => {
                        img.onload = () => {
                            // Add image in top right corner (30x30mm box)
                            doc.addImage(img, 'JPEG', 175, 10, 25, 25, undefined, 'FAST')
                            resolve(true)
                        }
                        img.onerror = () => {
                            console.error('Failed to load patient image')
                            resolve(false)
                        }
                        img.src = visit.patient.imageUrl
                    })
                } catch (error) {
                    console.error('Error adding image to PDF:', error)
                    return false
                }
            }
            return false
        }

        // Add patient image
        await addPatientImage()

        // Function to render prescription header
        const renderHeader = () => {
            let yPos = 15
            doc.setFontSize(9)

            const leftCol = 15
            const midCol = 85
            const rightCol = 145

            // Left Column
            doc.setFont('helvetica', 'bold')
            doc.text('OPD№', leftCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(0, 128, 0)
            doc.text(visit.opdNo || '250988 03 04', leftCol + 20, yPos)
            doc.setTextColor(0, 0, 0)
            
            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Date', leftCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(new Date(visit.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'), leftCol + 20, yPos)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Mob/Ph', leftCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(0, 0, 255)
            doc.text(visit.phone || visit.patient?.phone || 'N/A', leftCol + 20, yPos)
            doc.setTextColor(0, 0, 0)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Wt', leftCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(visit.weight ? String(visit.weight) : '-', leftCol + 20, yPos)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Temp', leftCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(visit.temperament || '-', leftCol + 20, yPos)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Pulse Diag', leftCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(visit.pulseDiagnosis || visit.pulseDiagnosis2 || '-', leftCol + 20, yPos)

            // Middle Column
            yPos = 15
            doc.setFont('helvetica', 'bold')
            doc.text('Patient Name', midCol, yPos)
            doc.setFont('helvetica', 'bold')
            doc.text(`${visit.patient?.firstName || ''} ${visit.patient?.lastName || ''}`, midCol + 30, yPos)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('F/H/G Name', midCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(visit.fatherHusbandGuardianName || '-', midCol + 30, yPos)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Address', midCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(visit.address || visit.patient?.address || '-', midCol + 30, yPos)

            // Right Column
            yPos = 15
            doc.setFont('helvetica', 'bold')
            doc.text('Age/DOB', rightCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(visit.age ? String(visit.age) : '-', rightCol + 20, yPos)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Sex', rightCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(visit.gender || '-', rightCol + 20, yPos)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Visit', rightCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(visit.visitNumber ? String(visit.visitNumber) : '1', rightCol + 20, yPos)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Ht', rightCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(visit.height ? String(visit.height) : '-', rightCol + 20, yPos)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Invest', rightCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.text(visit.investigations || '-', rightCol + 20, yPos)

            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('Prov. Diagnosis', rightCol, yPos)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(0, 0, 255)
            doc.text(visit.provisionalDiagnosis || visit.diagnoses || '-', rightCol + 30, yPos, { maxWidth: 40 })
            doc.setTextColor(0, 0, 0)

            // Line separator
            yPos = 45
            doc.line(15, yPos, 195, yPos)

            // DISC Section
            yPos += 5
            doc.setFont('helvetica', 'bold')
            doc.text('DISC', 15, yPos)
            doc.setTextColor(255, 0, 0)
            doc.text(visit.diagnoses || 'IMPROVED MUSCLE TONE/LIMBS CARRYING BODY WT', 30, yPos, { maxWidth: 165 })
            doc.setTextColor(0, 0, 0)

            return yPos + 8
        }

        // ========== PAGE 1: PATIENT COPY (WITHOUT COMPOSITION) ==========
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 255)
        doc.text('PATIENT COPY', 15, 8)
        doc.setTextColor(0, 0, 0)

        let yPos = renderHeader()

        // Patient Copy Table - WITHOUT composition
        const patientTableData = (visit.prescriptions || []).map((p: any, index: number) => {
            const medicineName = p.product?.name || p.treatment?.treatmentPlan || 'Medicine'
            const method = p.administration || 'IM'
            const timing = p.timing || p.dosage || 'ID/OPP/TDS/JLN WTR'
            const methodTiming = `${method}\n${timing}`
            
            return [
                (index + 1).toString(),
                medicineName, // NO composition
                p.droppersToday || 'I',
                methodTiming,
                p.droppersToday || 'I',
                p.medicineQuantity || p.quantity || '30',
                p.medicineQuantity && p.droppersToday ? Math.ceil(Number(p.medicineQuantity) / Number(p.droppersToday)).toString() : '30'
            ]
        })

        autoTable(doc, {
            startY: yPos,
            head: [['#', 'Medicine/Treatment', 'Comp', 'Method/Timing', 'I', 'Qty', 'Days']],
            body: patientTableData,
            theme: 'plain',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                lineColor: [0, 0, 0],
                lineWidth: 0.1
            },
            headStyles: {
                fontStyle: 'bold',
                halign: 'center',
                lineWidth: 0.5,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'left', fontStyle: 'bold' },
                1: { cellWidth: 70, halign: 'left' },
                2: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                3: { cellWidth: 40, halign: 'center' },
                4: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                5: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                6: { cellWidth: 15, halign: 'center' }
            },
            margin: { left: 15, right: 15 }
        })

        yPos = (doc as any).lastAutoTable.finalY + 10

        // Bottom section with payment
        if (visit.amount) {
            doc.setFillColor(255, 255, 200)
            doc.rect(170, yPos - 5, 25, 8, 'F')
            doc.setFont('helvetica', 'bold')
            doc.text(`₹ ${Number(visit.amount).toFixed(2)}`, 172, yPos, { align: 'left' })
        }

        // ========== PAGE 2: OFFICE COPY (WITH COMPOSITION) ==========
        doc.addPage()
        
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(204, 153, 0) // Yellow/Gold color
        doc.text('OFFICE COPY (WITH COMPOSITION)', 15, 8)
        doc.setTextColor(0, 0, 0)

        yPos = renderHeader()

        // Office Copy Table - WITH composition
        const officeTableData = (visit.prescriptions || []).map((p: any, index: number) => {
            const medicineName = p.product?.name || p.treatment?.treatmentPlan || 'Medicine'
            const compositions = [p.comp1, p.comp2, p.comp3].filter(Boolean).join(' / ')
            const method = p.administration || 'IM'
            const timing = p.timing || p.dosage || 'ID/OPP/TDS/JLN WTR'
            const medicineCol = compositions ? `${medicineName}\n${compositions}` : medicineName // WITH composition
            const methodTiming = `${method}\n${timing}`
            
            return [
                (index + 1).toString(),
                medicineCol,
                p.droppersToday || 'I',
                methodTiming,
                p.droppersToday || 'I',
                p.medicineQuantity || p.quantity || '30',
                p.medicineQuantity && p.droppersToday ? Math.ceil(Number(p.medicineQuantity) / Number(p.droppersToday)).toString() : '30'
            ]
        })

        autoTable(doc, {
            startY: yPos,
            head: [['#', 'Medicine/Treatment', 'Comp', 'Method/Timing', 'I', 'Qty', 'Days']],
            body: officeTableData,
            theme: 'plain',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                lineColor: [0, 0, 0],
                lineWidth: 0.1
            },
            headStyles: {
                fontStyle: 'bold',
                halign: 'center',
                lineWidth: 0.5,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'left', fontStyle: 'bold' },
                1: { cellWidth: 70, halign: 'left' },
                2: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                3: { cellWidth: 40, halign: 'center' },
                4: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                5: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                6: { cellWidth: 15, halign: 'center' }
            },
            margin: { left: 15, right: 15 }
        })

        yPos = (doc as any).lastAutoTable.finalY + 10

        // Bottom section with payment
        if (visit.amount) {
            doc.setFillColor(255, 255, 200)
            doc.rect(170, yPos - 5, 25, 8, 'F')
            doc.setFont('helvetica', 'bold')
            doc.text(`₹ ${Number(visit.amount).toFixed(2)}`, 172, yPos, { align: 'left' })
        }

        // Save PDF with both pages
        const fileName = `Prescription_${visit.opdNo || visit.id}_${new Date().toISOString().split('T')[0]}.pdf`
        doc.save(fileName)
    }

    if (!visit) return <div className="flex items-center justify-center h-64"><div className="text-muted">Loading...</div></div>

    return (
        <div className="bg-gray-50 min-h-screen py-6">
            {/* Action Buttons - Hidden in Print */}
            <div className="no-print max-w-7xl mx-auto px-4 mb-6">
                <div className="bg-white rounded-lg shadow-md p-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Prescription Details</h2>
                        <p className="text-sm text-gray-500 mt-1">OPD № {visit.opdNo || visit.id} | {new Date(visit.date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.push('/visits')} 
                            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-sm"
                        >
                            <span>←</span>
                            <span>Back to Visits</span>
                        </button>
                        <button 
                            onClick={generatePDF} 
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <span>�</span>
                            <span>Download PDF</span>
                        </button>
                        <button 
                            onClick={() => window.print()} 
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <span>🖨️</span>
                            <span>Print</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Patient Copy Label - Hidden in Print */}
            <div className="no-print" style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', marginBottom: '0.75rem' }}>
                <div style={{ background: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                    PATIENT COPY
                </div>
            </div>

            {/* Patient Copy - Prescription Sheet WITHOUT Composition */}
            <div className="prescription-container prescription-patient-copy" style={{ background: 'white', color: 'black', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: '210mm', margin: '0 auto 2rem', borderRadius: '0.5rem' }}>
                {/* Patient Image - Top Right */}
                {visit.patient?.imageUrl && (
                    <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', width: '25mm', height: '25mm', border: '2px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
                        <img 
                            src={visit.patient.imageUrl} 
                            alt="Patient" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                )}
                {/* Top Header Section */}
                <div style={{ borderBottom: '2px solid black', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '1rem', fontSize: '0.75rem' }}>
                        {/* Left Column */}
                        <div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>OPD№</span>
                                <span className="text-green-600 font-bold">{visit.opdNo || '250988 03 04'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>Date</span>
                                <span>{new Date(visit.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>Mob/Ph</span>
                                <span className="text-blue-600 underline">{visit.phone || visit.patient?.phone || 'TEL 9456706202'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>Wt</span>
                                <span>{visit.weight ? `${visit.weight}` : '12KG'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>Temp</span>
                                <span>{visit.temperament || '6+ -II'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>Pulse Diag</span>
                                <span>{visit.pulseDiagnosis || visit.pulseDiagnosis2 || '1/2/3...8M'}</span>
                            </div>
                        </div>

                        {/* Middle Column */}
                        <div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>Patient Name</span>
                                <span className="font-bold">{visit.patient?.firstName || ''} {visit.patient?.lastName || 'EKAM BAJWA 04'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>F/H/G Name</span>
                                <span>{visit.fatherHusbandGuardianName || 'MANRAJ S'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>Address</span>
                                <span>{visit.address || visit.patient?.address || 'CHANDIGARH'}</span>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Age/DOB</span>
                                <span>{visit.age || '6 YR'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Sex</span>
                                <span>{visit.gender || 'M'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Visit</span>
                                <span>{visit.visitNumber || '4'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Ht</span>
                                <span>{visit.height || ''}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Invest</span>
                                <span>{visit.investigations || ''}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Prov. Diagnosis</span>
                                <span className="text-blue-600 font-bold">{visit.provisionalDiagnosis || visit.diagnoses || 'WEST SYNDROME'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Info Lines */}
                    <div className="mt-2 text-xs">
                        {visit.historyReports && (
                            <div className="mb-0.5">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>Hist/Reports</span>
                                <span>{visit.historyReports}</span>
                            </div>
                        )}
                        {visit.majorComplaints && (
                            <div className="mb-0.5">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>Ch Comp</span>
                                <span>{visit.majorComplaints}</span>
                            </div>
                        )}
                        {visit.improvements && (
                            <div className="mb-0.5">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>Imp</span>
                                <span>{visit.improvements}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* DISC Section */}
                <div className="mb-2">
                    <span className="font-bold text-xs">DISC</span>
                    <span className="ml-2 text-red-600 font-bold text-xs uppercase">{visit.diagnoses || 'IMPROVED MUSCLE TONE/LIMBS CARRYING BODY WT'}</span>
                </div>

                {/* Prescription Table */}
                <div className="mb-3">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left py-1 font-bold" style={{ width: '5%' }}></th>
                                <th className="text-left py-1 font-bold" style={{ width: '45%' }}>Medicine/Treatment</th>
                                <th className="text-center py-1 font-bold" style={{ width: '8%' }}>Comp</th>
                                <th className="text-center py-1 font-bold" style={{ width: '20%' }}>Method/Timing</th>
                                <th className="text-center py-1 font-bold" style={{ width: '8%' }}>I</th>
                                <th className="text-center py-1 font-bold" style={{ width: '8%' }}>Qty</th>
                                <th className="text-center py-1 font-bold" style={{ width: '6%' }}>Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!visit.prescriptions || visit.prescriptions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-gray-500">No medications prescribed</td>
                                </tr>
                            ) : (
                                visit.prescriptions.map((p: any, index: number) => {
                                    const medicineName = p.product?.name || p.treatment?.treatmentPlan || p.treatment?.provDiagnosis || 'Medicine'
                                    const compositions = [p.comp1, p.comp2, p.comp3].filter(Boolean).join(' / ')
                                    const method = p.administration || 'IM'
                                    const timing = p.timing || p.dosage || 'ID/OPP/TDS/JLN WTR'
                                    const additions = p.additions || p.procedure || ''
                                    
                                    return (
                                        <tr key={p.id} className="border-b border-gray-300">
                                            <td className="py-1 font-bold">{index + 1}</td>
                                            <td className="py-1">
                                                <div className="font-bold">{medicineName}</div>
                                                {/* NO composition shown in patient copy */}
                                                {additions && <div className="text-[10px] text-gray-600">{additions}</div>}
                                            </td>
                                            <td className="py-1 text-center font-bold">{p.droppersToday || 'I'}</td>
                                            <td className="py-1 text-center">
                                                <div className="font-bold">{method}</div>
                                                <div className="text-[10px]">{timing}</div>
                                            </td>
                                            <td className="py-1 text-center font-bold">{p.droppersToday || 'I'}</td>
                                            <td className="py-1 text-center font-bold">{p.medicineQuantity || p.quantity || '30'}</td>
                                            <td className="py-1 text-center">{p.medicineQuantity && p.droppersToday ? Math.ceil(Number(p.medicineQuantity) / Number(p.droppersToday)) : '30'}</td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Bottom Section */}
                <div className="border-t border-gray-300 pt-2 mt-4">
                    <div className="flex justify-between text-xs">
                        {/* Left Side - Dates and Totals */}
                        <div>
                            {visit.nextVisit && (
                                <div className="mb-1">
                                    <span className="font-bold">Next Visit: </span>
                                    <span>{new Date(visit.nextVisit).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                </div>
                            )}
                            <div className="mt-2 bg-yellow-100 inline-block px-2 py-1">
                                <div className="flex gap-4">
                                    <div><span className="font-bold">ZTDS</span> <span>10</span></div>
                                    <div><span className="font-bold">ZD</span> <span>20</span></div>
                                    <div><span className="font-bold">DAYS</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Payment Info */}
                        <div className="text-right">
                            {visit.amount && (
                                <div className="mb-1 bg-yellow-100 inline-block px-4 py-0.5">
                                    <span className="font-bold">₹ {Number(visit.amount).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>
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

            {/* Office Copy Label - Hidden in Print */}
            <div className="no-print" style={{ maxWidth: '80rem', margin: '2rem auto 0.75rem', padding: '0 1rem' }}>
                <div style={{ background: '#ca8a04', color: 'white', padding: '0.5rem 1rem', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                    OFFICE COPY (WITH COMPOSITION)
                </div>
            </div>

            {/* Office Copy - Prescription Sheet WITH Composition */}
            <div className="prescription-container prescription-office-copy" style={{ background: 'white', color: 'black', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: '210mm', margin: '0 auto', borderRadius: '0.5rem' }}>
                {/* Top Header Section */}
                <div style={{ borderBottom: '2px solid black', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '1rem', fontSize: '0.75rem' }}>
                        {/* Left Column */}
                        <div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>OPD№</span>
                                <span className="text-green-600 font-bold">{visit.opdNo || '250988 03 04'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>Date</span>
                                <span>{new Date(visit.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>Mob/Ph</span>
                                <span className="text-blue-600 underline">{visit.phone || visit.patient?.phone || 'TEL 9456706202'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>Wt</span>
                                <span>{visit.weight ? `${visit.weight}` : '12KG'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>Temp</span>
                                <span>{visit.temperament || '6+ -II'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '60px' }}>Pulse Diag</span>
                                <span>{visit.pulseDiagnosis || visit.pulseDiagnosis2 || '1/2/3...8M'}</span>
                            </div>
                        </div>

                        {/* Middle Column */}
                        <div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>Patient Name</span>
                                <span className="font-bold">{visit.patient?.firstName || ''} {visit.patient?.lastName || 'EKAM BAJWA 04'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>F/H/G Name</span>
                                <span>{visit.fatherHusbandGuardianName || 'MANRAJ S'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>Address</span>
                                <span>{visit.address || visit.patient?.address || 'CHANDIGARH'}</span>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Age/DOB</span>
                                <span>{visit.age || '6 YR'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Sex</span>
                                <span>{visit.gender || 'M'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Visit</span>
                                <span>{visit.visitNumber || '4'}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Ht</span>
                                <span>{visit.height || ''}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Invest</span>
                                <span>{visit.investigations || ''}</span>
                            </div>
                            <div className="mb-1">
                                <span className="font-bold inline-block" style={{ minWidth: '70px' }}>Prov. Diagnosis</span>
                                <span className="text-blue-600 font-bold">{visit.provisionalDiagnosis || visit.diagnoses || 'WEST SYNDROME'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Info Lines */}
                    <div className="mt-2 text-xs">
                        {visit.historyReports && (
                            <div className="mb-0.5">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>Hist/Reports</span>
                                <span>{visit.historyReports}</span>
                            </div>
                        )}
                        {visit.majorComplaints && (
                            <div className="mb-0.5">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>Ch Comp</span>
                                <span>{visit.majorComplaints}</span>
                            </div>
                        )}
                        {visit.improvements && (
                            <div className="mb-0.5">
                                <span className="font-bold inline-block" style={{ minWidth: '90px' }}>Imp</span>
                                <span>{visit.improvements}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* DISC Section */}
                <div className="mb-2">
                    <span className="font-bold text-xs">DISC</span>
                    <span className="ml-2 text-red-600 font-bold text-xs uppercase">{visit.diagnoses || 'IMPROVED MUSCLE TONE/LIMBS CARRYING BODY WT'}</span>
                </div>

                {/* Prescription Table WITH Composition */}
                <div className="mb-3">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left py-1 font-bold" style={{ width: '5%' }}></th>
                                <th className="text-left py-1 font-bold" style={{ width: '45%' }}>Medicine/Treatment</th>
                                <th className="text-center py-1 font-bold" style={{ width: '8%' }}>Comp</th>
                                <th className="text-center py-1 font-bold" style={{ width: '20%' }}>Method/Timing</th>
                                <th className="text-center py-1 font-bold" style={{ width: '8%' }}>I</th>
                                <th className="text-center py-1 font-bold" style={{ width: '8%' }}>Qty</th>
                                <th className="text-center py-1 font-bold" style={{ width: '6%' }}>Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!visit.prescriptions || visit.prescriptions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-gray-500">No medications prescribed</td>
                                </tr>
                            ) : (
                                visit.prescriptions.map((p: any, index: number) => {
                                    const medicineName = p.product?.name || p.treatment?.treatmentPlan || p.treatment?.provDiagnosis || 'Medicine'
                                    const compositions = [p.comp1, p.comp2, p.comp3].filter(Boolean).join(' / ')
                                    const method = p.administration || 'IM'
                                    const timing = p.timing || p.dosage || 'ID/OPP/TDS/JLN WTR'
                                    const additions = p.additions || p.procedure || ''
                                    
                                    return (
                                        <tr key={p.id} className="border-b border-gray-300">
                                            <td className="py-1 font-bold">{index + 1}</td>
                                            <td className="py-1">
                                                <div className="font-bold">{medicineName}</div>
                                                {/* SHOW composition in office copy */}
                                                {compositions && <div className="text-[10px] text-blue-600 font-semibold">{compositions}</div>}
                                                {additions && <div className="text-[10px] text-gray-600">{additions}</div>}
                                            </td>
                                            <td className="py-1 text-center font-bold">{p.droppersToday || 'I'}</td>
                                            <td className="py-1 text-center">
                                                <div className="font-bold">{method}</div>
                                                <div className="text-[10px]">{timing}</div>
                                            </td>
                                            <td className="py-1 text-center font-bold">{p.droppersToday || 'I'}</td>
                                            <td className="py-1 text-center font-bold">{p.medicineQuantity || p.quantity || '30'}</td>
                                            <td className="py-1 text-center">{p.medicineQuantity && p.droppersToday ? Math.ceil(Number(p.medicineQuantity) / Number(p.droppersToday)) : '30'}</td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Bottom Section */}
                <div className="border-t border-gray-300 pt-2 mt-4">
                    <div className="flex justify-between text-xs">
                        {/* Left Side - Dates and Totals */}
                        <div>
                            {visit.nextVisit && (
                                <div className="mb-1">
                                    <span className="font-bold">Next Visit: </span>
                                    <span>{new Date(visit.nextVisit).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                </div>
                            )}
                            <div className="mt-2 bg-yellow-100 inline-block px-2 py-1">
                                <div className="flex gap-4">
                                    <div><span className="font-bold">ZTDS</span> <span>10</span></div>
                                    <div><span className="font-bold">ZD</span> <span>20</span></div>
                                    <div><span className="font-bold">DAYS</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Payment Info */}
                        <div className="text-right">
                            {visit.amount && (
                                <div className="mb-1 bg-yellow-100 inline-block px-4 py-0.5">
                                    <span className="font-bold">₹ {Number(visit.amount).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>
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

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    /* Hide everything except prescriptions */
                    body * {
                        visibility: hidden;
                    }
                    .prescription-container,
                    .prescription-container * {
                        visibility: visible;
                    }
                    
                    /* Show both patient and office copy */
                    .prescription-patient-copy {
                        position: relative;
                        page-break-after: always;
                        width: 100%;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                    }
                    
                    .prescription-office-copy {
                        position: relative;
                        width: 100%;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                    }
                    
                    .no-print {
                        display: none !important;
                        visibility: hidden !important;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: white !important;
                        color: black !important;
                    }
                    /* Override any dark mode styles */
                    * {
                        background: white !important;
                        color: black !important;
                        border-color: black !important;
                    }
                    .text-blue-600 {
                        color: #2563eb !important;
                    }
                    .text-green-600 {
                        color: #16a34a !important;
                    }
                    .text-red-600 {
                        color: #dc2626 !important;
                    }
                    .bg-yellow-100 {
                        background: #fef3c7 !important;
                    }
                    @page {
                        size: A4;
                        margin: 0;
                    }
                }
                .prescription-container {
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    border-radius: 8px;
                    background: white !important;
                    color: black !important;
                }
            `}</style>
        </div>
    )
}
