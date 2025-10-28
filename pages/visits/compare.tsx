import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { requireDoctorOrAdmin } from '../../lib/withAuth'

function CompareVisitsPage() {
    const router = useRouter()
    const { patientId } = router.query
    const [visits, setVisits] = useState<any[]>([])
    const [selectedVisits, setSelectedVisits] = useState<any[]>([])
    const [compareCount, setCompareCount] = useState(2)
    const [loading, setLoading] = useState(true)
    const [patient, setPatient] = useState<any>(null)

    useEffect(() => {
        if (patientId) {
            // Fetch patient info and visits
            Promise.all([
                fetch(`/api/patients?id=${patientId}`).then(r => r.json()),
                fetch(`/api/visits?patientId=${patientId}`).then(r => r.json())
            ]).then(([patientData, visitsData]) => {
                setPatient(patientData)
                const visitsList = Array.isArray(visitsData) ? visitsData : []
                // Sort by date descending (most recent first)
                const sortedVisits = visitsList.sort((a: any, b: any) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                setVisits(sortedVisits)
                // Select the last N visits
                setSelectedVisits(sortedVisits.slice(0, Math.min(compareCount, sortedVisits.length)))
                setLoading(false)
            }).catch(err => {
                console.error(err)
                setLoading(false)
            })
        }
    }, [patientId])

    useEffect(() => {
        // Update selected visits when compare count changes
        setSelectedVisits(visits.slice(0, Math.min(compareCount, visits.length)))
    }, [compareCount, visits])

    const handleUseVisitData = (visit: any) => {
        // Navigate to prescriptions page with visit data pre-filled
        router.push({
            pathname: '/prescriptions',
            query: {
                patientId: patientId,
                copyFromVisitId: visit.id,
                visitNumber: visits.length + 1
            }
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted">Loading visits...</p>
                </div>
            </div>
        )
    }

    if (!patient || visits.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-lg text-muted mb-4">No visits found for this patient</p>
                    <button onClick={() => router.back()} className="btn btn-secondary">
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="mb-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Compare Previous Visits
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Patient: <strong>{patient.firstName} {patient.lastName}</strong>
                            {patient.opdNo && <span className="ml-2">· OPD: {patient.opdNo}</span>}
                        </p>
                    </div>

                    {/* Compare Count Selector */}
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Compare:
                        </label>
                        <select
                            value={compareCount}
                            onChange={(e) => setCompareCount(parseInt(e.target.value))}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            {[2, 3, 4].map(n => (
                                <option key={n} value={n} disabled={n > visits.length}>
                                    {n} Visits {n > visits.length ? '(not enough visits)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Comparison Grid */}
            <div className={`grid gap-4 ${
                compareCount === 2 ? 'grid-cols-2' :
                compareCount === 3 ? 'grid-cols-3' :
                'grid-cols-4'
            }`}>
                {selectedVisits.map((visit, index) => (
                    <div key={visit.id} className="relative">
                        {/* Divider (except for last item) */}
                        {index < selectedVisits.length - 1 && (
                            <div className="absolute right-0 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-700 z-10"></div>
                        )}

                        {/* Visit Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full overflow-y-auto max-h-[calc(100vh-200px)]">
                            {/* Visit Header */}
                            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Visit #{visit.visitNumber || index + 1}
                                    </h3>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(visit.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleUseVisitData(visit)}
                                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Use This Data
                                </button>
                            </div>

                            {/* Visit Details */}
                            <div className="space-y-4 text-sm">
                                {visit.diagnoses && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Diagnoses</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{visit.diagnoses}</p>
                                    </div>
                                )}

                                {visit.temperament && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Temperament</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{visit.temperament}</p>
                                    </div>
                                )}

                                {visit.pulseDiagnosis && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Pulse Diagnosis</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{visit.pulseDiagnosis}</p>
                                    </div>
                                )}

                                {visit.majorComplaints && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Major Complaints</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{visit.majorComplaints}</p>
                                    </div>
                                )}

                                {visit.provisionalDiagnosis && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Provisional Diagnosis</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{visit.provisionalDiagnosis}</p>
                                    </div>
                                )}

                                {/* Prescriptions */}
                                {visit.prescriptions && visit.prescriptions.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Prescriptions ({visit.prescriptions.length})</h4>
                                        <div className="space-y-2">
                                            {visit.prescriptions.map((prescription: any) => (
                                                <div key={prescription.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {prescription.product?.name || 'Unknown Medicine'}
                                                    </p>
                                                    {prescription.dosage && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Dosage: {prescription.dosage}
                                                        </p>
                                                    )}
                                                    {prescription.timing && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Timing: {prescription.timing}
                                                        </p>
                                                    )}
                                                    {prescription.quantity && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Quantity: {prescription.quantity}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {visit.specialNote && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Special Note</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{visit.specialNote}</p>
                                    </div>
                                )}

                                {visit.improvements && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Improvements</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{visit.improvements}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default requireDoctorOrAdmin(CompareVisitsPage)
