import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Verify authentication
    const authUser = await getSessionUser(req)

    if (!authUser) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    // Check if user is admin
    if (authUser.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' })
    }

    if (req.method === 'GET') {
        try {
            const counts: Record<string, number> = {}

            // Get counts for each table
            counts.tasks = await prisma.task.count()
            counts.payments = await prisma.payment.count()
            counts.customerInvoices = await prisma.customerInvoice.count()
            counts.prescriptions = await prisma.prescription.count()
            counts.visits = await prisma.visit.count()
            counts.treatments = await prisma.treatment.count()
            counts.demandForecasts = await prisma.demandForecast.count()
            counts.stockTransactions = await prisma.stockTransaction.count()
            counts.purchaseOrders = await prisma.purchaseOrder.count()
            counts.productOrders = await prisma.productOrder.count()
            counts.sales = await prisma.sale.count()
            counts.purchases = await prisma.purchase.count()
            counts.productBatches = await prisma.productBatch.count()
            counts.products = await prisma.product.count()
            counts.categories = await prisma.category.count()
            counts.suppliers = await prisma.supplier.count()
            counts.tokens = await prisma.token.count()
            counts.appointments = await prisma.appointment.count()
            counts.appointmentRequests = await prisma.appointmentRequest.count()
            counts.invoices = await prisma.invoice.count()
            counts.patients = await prisma.patient.count()

            return res.status(200).json({ counts })
        } catch (error) {
            console.error('Error fetching data counts:', error)
            return res.status(500).json({ error: 'Failed to fetch data counts' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
