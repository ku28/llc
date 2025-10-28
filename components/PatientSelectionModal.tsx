import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import CustomSelect from './CustomSelect'

interface PatientSelectionModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function PatientSelectionModal({ isOpen, onClose }: PatientSelectionModalProps) {
    const router = useRouter()
    const [patients, setPatients] = useState<any[]>([])
    const [selectedPatientId, setSelectedPatientId] = useState('')
    const [visitCount, setVisitCount] = useState<number>(0)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            // Fetch patients
            fetch('/api/patients')
                .then(r => r.json())
                .then(data => setPatients(Array.isArray(data) ? data : []))
                .catch(console.error)
        }
    }, [isOpen])

    useEffect(() => {
        if (selectedPatientId) {
            // Fetch visit count for selected patient
            setLoading(true)
            fetch(`/api/visits?patientId=${selectedPatientId}`)
                .then(r => r.json())
                .then(data => {
                    const visits = Array.isArray(data) ? data : []
                    setVisitCount(visits.length)
                    setLoading(false)
                })
                .catch(err => {
                    console.error(err)
                    setLoading(false)
                })
        } else {
            setVisitCount(0)
        }
    }, [selectedPatientId])

    const handleCreateVisit = () => {
        if (!selectedPatientId) return
        router.push(`/prescriptions?patientId=${selectedPatientId}&visitNumber=${visitCount + 1}`)
        onClose()
    }

    const handleComparePrevious = () => {
        if (!selectedPatientId) return
        router.push(`/visits/compare?patientId=${selectedPatientId}`)
        onClose()
    }

    if (!isOpen) return null

    const selectedPatient = patients.find(p => String(p.id) === String(selectedPatientId))

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Create Visit & Prescription
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {/* Patient Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Select Patient <span className="text-red-600">*</span>
                        </label>
                        <CustomSelect
                            value={selectedPatientId}
                            onChange={(value) => setSelectedPatientId(value)}
                            options={[
                                { value: '', label: '-- Select patient --' },
                                ...patients.map(p => ({
                                    value: String(p.id),
                                    label: `${p.firstName} ${p.lastName}${p.opdNo ? ' · OPD: ' + p.opdNo : ''}`
                                }))
                            ]}
                            placeholder="-- Select patient --"
                        />
                    </div>

                    {/* Visit Information */}
                    {selectedPatientId && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-2">
                                {selectedPatient?.imageUrl && (
                                    <img
                                        src={selectedPatient.imageUrl}
                                        alt="Patient"
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                )}
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {selectedPatient?.firstName} {selectedPatient?.lastName}
                                    </p>
                                    {selectedPatient?.opdNo && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            OPD: {selectedPatient.opdNo}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Previous Visits: <strong>{visitCount}</strong>
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Next Visit Number: <strong>{visitCount + 1}</strong>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleCreateVisit}
                            disabled={!selectedPatientId}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create Visit/Prescription
                        </button>
                    </div>

                    {visitCount > 0 && selectedPatientId && (
                        <button
                            onClick={handleComparePrevious}
                            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                            Compare Previous Visits
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
