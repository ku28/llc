import { useEffect, useState } from 'react'

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
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">Patients<br/><div className="text-2xl font-bold">{counts.patients ?? '—'}</div></div>
        <div className="bg-white p-4 rounded shadow">Treatments<br/><div className="text-2xl font-bold">{counts.treatments ?? '—'}</div></div>
        <div className="bg-white p-4 rounded shadow">Products<br/><div className="text-2xl font-bold">{counts.products ?? '—'}</div></div>
        <div className="bg-white p-4 rounded shadow">Visits<br/><div className="text-2xl font-bold">{counts.visits ?? '—'}</div></div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-2">Recent visits</h2>
        <ul>
          {recentVisits.map(v=> (
            <li key={v.id} className="p-2 border-b">OPD {v.opdNo} — {v.patient?.firstName} {v.patient?.lastName} · {v.diagnoses}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
