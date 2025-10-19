import { useState, useEffect } from 'react'
import Link from 'next/link'
import CustomSelect from '../components/CustomSelect'

export default function VisitsPage() {
    const [visits, setVisits] = useState<any[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [form, setForm] = useState({ patientId: '', opdNo: '', diagnoses: '' })
    const [searchQuery, setSearchQuery] = useState('')
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const isPatient = user?.role?.toLowerCase() === 'user'
    
    useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)) }, [])

    useEffect(() => { 
        setLoading(true)
        Promise.all([
            fetch('/api/visits').then(r => r.json()),
            fetch('/api/patients').then(r => r.json())
        ]).then(([visitsData, patientsData]) => {
            // Filter visits for user role - show only their own visits
            let filteredVisits = visitsData
            if (user?.role?.toLowerCase() === 'user') {
                filteredVisits = visitsData.filter((v: any) => 
                    v.patient?.email === user.email || v.patient?.phone === user.phone
                )
            }
            setVisits(filteredVisits)
            setPatients(patientsData)
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [user])

    async function create(e: any) {
        e.preventDefault()
        await fetch('/api/visits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        setVisits(await (await fetch('/api/visits')).json())
        setForm({ patientId: '', opdNo: '', diagnoses: '' })
    }

    return (
        <div>
            <div className="section-header">
                <h2 className="section-title">{isPatient ? 'My Appointments' : 'Patient Visits'}</h2>
                <div className="flex items-center gap-3">
                    <span className="badge">
                        {visits.filter(v => {
                            if (!searchQuery) return true
                            const patientName = (v.patient ? `${v.patient.firstName || ''} ${v.patient.lastName || ''}` : '').toLowerCase()
                            const opdNo = (v.opdNo || '').toLowerCase()
                            const search = searchQuery.toLowerCase()
                            return patientName.includes(search) || opdNo.includes(search)
                        }).length} total {isPatient ? 'appointments' : 'visits'}
                    </span>
                    {!isPatient && (
                        <Link href="/prescriptions" className="btn btn-primary text-sm">Create Visit with Prescriptions</Link>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="card mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="🔍 Search visits by patient name or OPD number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                        <svg className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="card">
                <h3 className="text-lg font-semibold mb-4">{isPatient ? 'My Appointment History' : 'Visit History'}</h3>
                {(() => {
                    const filteredVisits = visits.filter(v => {
                        if (!searchQuery) return true
                        const patientName = (v.patient ? `${v.patient.firstName || ''} ${v.patient.lastName || ''}` : '').toLowerCase()
                        const opdNo = (v.opdNo || '').toLowerCase()
                        const search = searchQuery.toLowerCase()
                        return patientName.includes(search) || opdNo.includes(search)
                    })
                    
                    if (loading) {
                        return (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                <p className="text-muted">Loading visits...</p>
                            </div>
                        )
                    }
                    
                    if (filteredVisits.length === 0 && searchQuery) {
                        return (
                            <div className="text-center py-8 text-muted">
                                <p className="text-lg mb-2">No visits found</p>
                                <p className="text-sm">Try adjusting your search query</p>
                            </div>
                        )
                    }
                    
                    if (filteredVisits.length === 0) {
                        return (
                            <div className="text-center py-8 text-muted">
                                {isPatient ? 'You have no appointments yet' : 'No visits recorded yet'}
                            </div>
                        )
                    }
                    
                    return (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredVisits.map(v => (
                            <li key={v.id} className="list-item">
                                <div className="flex items-start gap-4">
                                    {/* Patient Image Circle */}
                                    <div className="flex-shrink-0">
                                        <img 
                                            src={v.patient?.imageUrl || process.env.NEXT_PUBLIC_DEFAULT_PATIENT_IMAGE || ''} 
                                            alt="Patient" 
                                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                                        />
                                    </div>
                                    
                                    {/* Visit Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-semibold text-base">
                                                {v.patient?.firstName} {v.patient?.lastName}
                                            </h4>
                                            <span className="badge">OPD: {v.opdNo}</span>
                                        </div>
                                        <div className="text-sm text-muted space-y-1">
                                            <div><span className="font-medium">Date:</span> {new Date(v.date).toLocaleString()}</div>
                                            {v.diagnoses && <div><span className="font-medium">Diagnosis:</span> {v.diagnoses}</div>}
                                            {v.prescriptions && v.prescriptions.length > 0 && (
                                                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                                    <span className="font-medium">Prescriptions:</span> {v.prescriptions.length} item(s)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-2 self-start flex-shrink-0">
                                        <Link href={`/visits/${v.id}`} className="btn btn-primary text-sm">
                                            View Details
                                        </Link>
                                        {!isPatient && (
                                            <Link href={`/prescriptions?visitId=${v.id}&edit=true`} className="btn btn-secondary text-sm">
                                                Edit
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    )
                })()}
            </div>
        </div>
    )
}
