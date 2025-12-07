import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireAuth } from '../../lib/auth'
import { getDoctorFilter } from '../../lib/doctorUtils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res)
    if (!user) return
    
    try {
      // Get selectedDoctorId from query (for admin switching doctors)
      const selectedDoctorId = req.query.doctorId ? Number(req.query.doctorId) : null
      
      const patients = await prisma.patient.findMany({ 
        where: getDoctorFilter(user, selectedDoctorId),
        orderBy: { createdAt: 'desc' }, 
        include: { 
          visits: { orderBy: { date: 'desc' }, take: 1 },
          doctor: { select: { id: true, name: true, email: true } }
        } 
      })
      return res.status(200).json(patients)
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
      return res.status(500).json({ error: String(err?.message || err) })
    }
  }

  if (req.method === 'POST') {
    const user = await requireAuth(req, res)
    if(!user) return
    
    const { firstName, lastName, phone, email, dob, date, age, address, gender, nextVisit, imageUrl, fatherHusbandGuardianName, weight, height, doctorId: providedDoctorId } = req.body
    
    // Determine doctorId: doctor role uses their own ID, admin/receptionist can specify, others null
    let doctorId = null
    if (user.role === 'doctor') {
      doctorId = user.id
    } else if ((user.role === 'admin' || user.role === 'receptionist') && providedDoctorId) {
      doctorId = providedDoctorId
    }
    
    try {
      const patient = await prisma.patient.create({ 
        data: { 
          firstName, 
          lastName, 
          phone, 
          email, 
          dob: dob ? new Date(dob) : null, 
          date: date ? new Date(date) : undefined, 
          age: age ? Number(age) : undefined, 
          address, 
          gender, 
          nextVisit: nextVisit ? new Date(nextVisit) : undefined, 
          imageUrl,
          fatherHusbandGuardianName,
          weight: weight ? Number(weight) : undefined,
          height: height ? Number(height) : undefined,
          doctorId
        } 
      })
      return res.status(201).json(patient)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  if (req.method === 'PUT') {
    const user = await requireAuth(req, res)
    if(!user) return
    
    const { id, firstName, lastName, phone, email, dob, date, age, address, gender, nextVisit, imageUrl, fatherHusbandGuardianName, weight, height, doctorId: providedDoctorId } = req.body
    
    // Determine doctorId for update
    let doctorId = undefined
    if (user.role === 'doctor') {
      doctorId = user.id
    } else if ((user.role === 'admin' || user.role === 'receptionist') && providedDoctorId !== undefined) {
      doctorId = providedDoctorId
    }
    
    try {
      const updateData: any = { 
        firstName, 
        lastName, 
        phone, 
        email, 
        dob: dob ? new Date(dob) : null, 
        date: date ? new Date(date) : undefined, 
        age: age ? Number(age) : undefined, 
        address, 
        gender, 
        nextVisit: nextVisit ? new Date(nextVisit) : undefined, 
        imageUrl,
        fatherHusbandGuardianName,
        weight: weight ? Number(weight) : undefined,
        height: height ? Number(height) : undefined
      }
      
      if (doctorId !== undefined) {
        updateData.doctorId = doctorId
      }
      
      const p = await prisma.patient.update({ 
        where: { id: Number(id) }, 
        data: updateData
      })
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
