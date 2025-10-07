;(async()=>{
  const base='http://localhost:3000'
  console.log('signup...')
  let r = await fetch(base+'/api/auth/signup', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ email: 'tester2@example.com', name: 'Tester2', password: 'testpass' }) })
  console.log('signup status', r.status)
  const cookies = r.headers.get('set-cookie')
  console.log('got cookie?', !!cookies)

  console.log('create patient...')
  r = await fetch(base+'/api/patients', { method: 'POST', headers: {'content-type':'application/json','cookie': cookies}, body: JSON.stringify({ firstName: 'Alice', lastName: 'Smith', phone: '123', email: 'alice2@example.com' }) })
  console.log('patient status', r.status)
  console.log(await r.text())

  console.log('create visit...')
  r = await fetch(base+'/api/visits', { method: 'POST', headers: {'content-type':'application/json','cookie': cookies}, body: JSON.stringify({ patientId: 1, opdNo: 'OPD-123', diagnoses: 'test diag' }) })
  console.log('visit status', r.status)
  console.log(await r.text())
})().catch(e=>{ console.error(e); process.exit(1) })
