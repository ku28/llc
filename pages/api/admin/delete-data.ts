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

    if (req.method === 'DELETE') {
        try {
            const { tables } = req.body

            if (!tables || !Array.isArray(tables) || tables.length === 0) {
                return res.status(400).json({ error: 'Tables array is required' })
            }

            const deletedCounts: Record<string, number> = {}

            // Delete data in correct order to respect foreign key constraints
            for (const table of tables) {
                let count = 0
                
                switch (table) {
                    case 'tasks':
                        const tasksResult = await prisma.task.deleteMany({})
                        count = tasksResult.count
                        break
                    case 'payments':
                        const paymentsResult = await prisma.payment.deleteMany({})
                        count = paymentsResult.count
                        break
                    case 'customerInvoices':
                        // Delete items first
                        await prisma.customerInvoiceItem.deleteMany({})
                        const invoicesResult = await prisma.customerInvoice.deleteMany({})
                        count = invoicesResult.count
                        break
                    case 'prescriptions':
                        const prescriptionsResult = await prisma.prescription.deleteMany({})
                        count = prescriptionsResult.count
                        break
                    case 'visits':
                        const visitsResult = await prisma.visit.deleteMany({})
                        count = visitsResult.count
                        break
                    case 'treatments':
                        // Delete treatment products first
                        await prisma.treatmentProduct.deleteMany({})
                        const treatmentsResult = await prisma.treatment.deleteMany({})
                        count = treatmentsResult.count
                        break
                    case 'demandForecasts':
                        const forecastsResult = await prisma.demandForecast.deleteMany({})
                        count = forecastsResult.count
                        break
                    case 'stockTransactions':
                        const transactionsResult = await prisma.stockTransaction.deleteMany({})
                        count = transactionsResult.count
                        break
                    case 'purchaseOrders':
                        // Delete items first
                        await prisma.purchaseOrderItem.deleteMany({})
                        const poResult = await prisma.purchaseOrder.deleteMany({})
                        count = poResult.count
                        break
                    case 'productOrders':
                        const productOrdersResult = await prisma.productOrder.deleteMany({})
                        count = productOrdersResult.count
                        break
                    case 'sales':
                        const salesResult = await prisma.sale.deleteMany({})
                        count = salesResult.count
                        break
                    case 'purchases':
                        const purchasesResult = await prisma.purchase.deleteMany({})
                        count = purchasesResult.count
                        break
                    case 'productBatches':
                        const batchesResult = await prisma.productBatch.deleteMany({})
                        count = batchesResult.count
                        break
                    case 'products':
                        const productsResult = await prisma.product.deleteMany({})
                        count = productsResult.count
                        break
                    case 'categories':
                        const categoriesResult = await prisma.category.deleteMany({})
                        count = categoriesResult.count
                        break
                    case 'suppliers':
                        const suppliersResult = await prisma.supplier.deleteMany({})
                        count = suppliersResult.count
                        break
                    case 'tokens':
                        const tokensResult = await prisma.token.deleteMany({})
                        count = tokensResult.count
                        break
                    case 'appointments':
                        const appointmentsResult = await prisma.appointment.deleteMany({})
                        count = appointmentsResult.count
                        break
                    case 'appointmentRequests':
                        const requestsResult = await prisma.appointmentRequest.deleteMany({})
                        count = requestsResult.count
                        break
                    case 'invoices':
                        const invoicesOldResult = await prisma.invoice.deleteMany({})
                        count = invoicesOldResult.count
                        break
                    case 'patients':
                        const patientsResult = await prisma.patient.deleteMany({})
                        count = patientsResult.count
                        break
                    default:
                        console.warn(`Unknown table: ${table}`)
                        continue
                }
                
                deletedCounts[table] = count
            }

            return res.status(200).json({ 
                message: `Successfully deleted data from ${tables.length} table(s)`,
                deletedCounts 
            })
        } catch (error) {
            console.error('Error deleting data:', error)
            return res.status(500).json({ error: 'Failed to delete data' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
