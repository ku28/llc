import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireAuth } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const patients = await prisma.patient.findMany({ orderBy: { createdAt: 'desc' }, include: { visits: { orderBy: { date: 'desc' }, take: 1 } } })
      return res.status(200).json(patients)
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
      return res.status(500).json({ error: String(err?.message || err) })
    }
  }

  if (req.method === 'POST') {
    const user = await requireAuth(req, res)
    if(!user) return
    const { firstName, lastName, phone, email, dob, opdNo, date, age, address, gender, nextVisit, occupation, pendingPaymentCents, height, weight, imageUrl } = req.body
    try {
      const patient = await prisma.patient.create({ data: { firstName, lastName, phone, email, dob: dob ? new Date(dob) : null, opdNo, date: date ? new Date(date) : undefined, age: age ? Number(age) : undefined, address, gender, nextVisit: nextVisit ? new Date(nextVisit) : undefined, occupation, pendingPaymentCents: pendingPaymentCents ? Number(pendingPaymentCents) : undefined, height: height ? Number(height) : undefined, weight: weight ? Number(weight) : undefined, imageUrl } })
      return res.status(201).json(patient)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  if (req.method === 'PUT') {
    const user = await requireAuth(req, res)
    if(!user) return
    const { id, firstName, lastName, phone, email, dob, opdNo, date, age, address, gender, nextVisit, occupation, pendingPaymentCents, height, weight, imageUrl } = req.body
    try {
      const p = await prisma.patient.update({ where: { id: Number(id) }, data: { firstName, lastName, phone, email, dob: dob ? new Date(dob) : null, opdNo, date: date ? new Date(date) : undefined, age: age ? Number(age) : undefined, address, gender, nextVisit: nextVisit ? new Date(nextVisit) : undefined, occupation, pendingPaymentCents: pendingPaymentCents ? Number(pendingPaymentCents) : undefined, height: height ? Number(height) : undefined, weight: weight ? Number(weight) : undefined, imageUrl } })
      return res.status(200).json(p)
    } catch (err: any) { return res.status(500).json({ error: String(err?.message || err) }) }
  }

  if (req.method === 'DELETE') {
    const user = await requireAuth(req, res)
    if(!user) return
    const { id } = req.body
    const idNum = Number(id)
    if (!id || !Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: 'Invalid or missing id for delete' })
    }
    try {
      // Delete dependent records in correct order to satisfy FK constraints.
      // Prescriptions reference visits, so remove them first. Then delete visits,
      // appointments and invoices for this patient, finally delete the patient.
      await prisma.$transaction([
        prisma.prescription.deleteMany({ where: { visit: { patientId: idNum } } }),
        prisma.visit.deleteMany({ where: { patientId: idNum } }),
        prisma.appointment.deleteMany({ where: { patientId: idNum } }),
        prisma.invoice.deleteMany({ where: { patientId: idNum } }),
        prisma.patient.delete({ where: { id: idNum } }),
      ])

      return res.status(200).json({ ok: true })
    } catch (err: any) {
      // Return the Prisma error message to the client to aid debugging
      return res.status(500).json({ error: String(err?.message || err) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
