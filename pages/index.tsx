import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Dashboard(){
  const [counts, setCounts] = useState<any>({})
  const [recentVisits, setRecentVisits] = useState<any[]>([])

  useEffect(()=>{
    Promise.all([
      fetch('/api/patients').then(r=>r.json()),
      fetch('/api/treatments').then(r=>r.json()),
      fetch('/api/products').then(r=>r.json()),
      fetch('/api/visits').then(r=>r.json())
    ]).then(([patients, treatments, products, visits])=>{
      setCounts({ patients: patients.length, treatments: treatments.length, products: products.length, visits: visits.length })
      setRecentVisits(visits.slice(0,5))
    })
  }, [])

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Dashboard</h1>
        <div className="text-sm text-muted">Welcome to LLC ERP</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-label">Total Patients</div>
          <div className="stat-value">{counts.patients ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Treatments</div>
          <div className="stat-value">{counts.treatments ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Products</div>
          <div className="stat-value">{counts.products ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Visits</div>
          <div className="stat-value">{counts.visits ?? '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Visits</h2>
          <Link href="/visits" className="text-sm text-brand hover:underline font-medium">View all →</Link>
        </div>
        {recentVisits.length === 0 ? (
          <div className="text-center py-8 text-muted">No visits recorded yet</div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentVisits.map(v=> (
              <li key={v.id} className="list-item flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">
                    {v.patient?.firstName} {v.patient?.lastName}
                    <span className="ml-2 badge">OPD {v.opdNo}</span>
                  </div>
                  <div className="text-sm text-muted mt-1">{v.diagnoses || 'No diagnosis'}</div>
                </div>
                <div className="text-sm text-muted">{new Date(v.date).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
