import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function VisitDetail(){
  const router = useRouter()
  const { id } = router.query
  const [visit, setVisit] = useState<any>(null)
  const [treatments, setTreatments] = useState<any[]>([])
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ treatmentId: '', dosage: '', quantity: 1 })

  useEffect(()=>{
    if(!id) return
    // fetch visit list and treatments
    fetch('/api/visits').then(r=>r.json()).then(list=>{
      const found = list.find((v:any)=>String(v.id)===String(id))
      setVisit(found)
    })
    fetch('/api/treatments').then(r=>r.json()).then(setTreatments)
  }, [id])

  async function addPrescription(e:any){
    e.preventDefault()
    await fetch('/api/prescriptions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ visitId: id, treatmentId: form.treatmentId, dosage: form.dosage, quantity: Number(form.quantity) }) })
    // reload visit
    const list = await (await fetch('/api/visits')).json()
    setVisit(list.find((v:any)=>String(v.id)===String(id)))
    setFormVisible(false)
  }

  if(!visit) return <div>Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Prescription — OPD {visit.opdNo} · {visit.patient?.firstName} {visit.patient?.lastName}</h2>
        <div className="flex items-center gap-2">
          <button onClick={()=>window.print()} className="px-3 py-1 bg-gray-800 text-white rounded">Print / Save PDF</button>
          <button onClick={()=>setFormVisible(v=>!v)} className="px-3 py-1 bg-blue-600 text-white rounded">{formVisible ? 'Close' : 'Add / Edit'}</button>
        </div>
      </div>

      {/* Prescription formatted view */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="mb-4">
          <div className="text-sm text-gray-600">Visit Date: {new Date(visit.date).toLocaleString()}</div>
          <h3 className="text-lg font-semibold mt-2">Patient: {visit.patient?.firstName} {visit.patient?.lastName}</h3>
          <div className="text-sm">Age: {visit.age ?? '-'} · Gender: {visit.gender ?? '-'} · Phone: {visit.phone ?? '-'}</div>
          <div className="mt-2">OPD: {visit.opdNo}</div>
        </div>

        <div className="mt-4">
          <h4 className="font-semibold">Diagnosis / Notes</h4>
          <div className="text-sm text-gray-700">{visit.diagnoses || visit.specialNote || '-'}</div>
        </div>

        <div className="mt-6">
          <h4 className="font-semibold mb-2">Medications</h4>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-sm text-gray-600 border-b"><th className="py-1">Medicine</th><th className="py-1">Dosage</th><th className="py-1">Administration</th><th className="py-1">Qty</th><th className="py-1">Dispensed</th></tr>
            </thead>
            <tbody>
              {visit.prescriptions?.map((p:any)=> (
                <tr key={p.id} className="align-top border-b">
                  <td className="py-2">{p.treatment?.name} {p.treatment?.code ? `(${p.treatment.code})` : ''}{p.product ? ` — ${p.product.name}` : ''}</td>
                  <td className="py-2">{p.dosage || '-'}</td>
                  <td className="py-2">{p.administration || '-'}</td>
                  <td className="py-2">{p.quantity}</td>
                  <td className="py-2">{p.dispensed ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-sm text-gray-600">Signature: ____________________________</div>
      </div>

      {/* Add prescription form toggled */}
      {formVisible && (
        <form onSubmit={addPrescription} className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Add Prescription</h3>
          <select required value={form.treatmentId} onChange={e=>setForm({...form, treatmentId: e.target.value})} className="p-2 border rounded w-full mb-2">
            <option value="">Select treatment</option>
            {treatments.map(t=> <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
          </select>
          <input placeholder="Dosage" value={form.dosage} onChange={e=>setForm({...form, dosage: e.target.value})} className="p-2 border rounded w-full mb-2" />
          <input type="number" placeholder="Quantity" value={form.quantity} onChange={e=>setForm({...form, quantity: Number(e.target.value)})} className="p-2 border rounded w-full mb-2" />
          <div className="text-right"><button className="bg-blue-600 text-white px-4 py-2 rounded">Add</button></div>
        </form>
      )}
    </div>
  )
}
