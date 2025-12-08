import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { requireStaffOrAbove } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireStaffOrAbove(req, res)
    if (!user) return

    if (req.method === 'GET') {
        try {
            const { partyId, partyType } = req.query

            if (!partyId || !partyType) {
                return res.status(400).json({ error: 'Party ID and type required' })
            }

            let ledgerEntries: any[] = []
            let partyInfo: any = {}
            let openingBalance = 0
            let closingBalance = 0

            if (partyType === 'customer') {
                // Get customer invoices
                const invoices = await prisma.customerInvoice.findMany({
                    where: { patientId: Number(partyId) },
                    orderBy: { invoiceDate: 'asc' },
                    include: { payments: true }
                })

                const patient = await prisma.patient.findUnique({
                    where: { id: Number(partyId) }
                })

                partyInfo = {
                    name: patient ? `${patient.firstName} ${patient.lastName || ''}` : 'Unknown',
                    phone: patient?.phone,
                    email: patient?.email
                }

                invoices.forEach((inv: any) => {
                    // Invoice entry (Debit)
                    ledgerEntries.push({
                        date: inv.invoiceDate,
                        type: 'Invoice',
                        reference: inv.invoiceNumber,
                        debit: inv.totalAmount,
                        credit: 0,
                        balance: 0,
                        description: `Invoice ${inv.invoiceNumber}`
                    })

                    // Payment entries (Credit)
                    inv.payments.forEach((payment: any) => {
                        ledgerEntries.push({
                            date: payment.paymentDate,
                            type: 'Payment',
                            reference: payment.paymentNumber,
                            debit: 0,
                            credit: payment.amount,
                            balance: 0,
                            description: `Payment via ${payment.paymentMethod}`
                        })
                    })
                })
            } else if (partyType === 'supplier') {
                // Get purchase orders
                const purchaseOrders = await prisma.purchaseOrder.findMany({
                    where: { supplierId: Number(partyId) },
                    orderBy: { orderDate: 'asc' }
                })

                const supplier = await prisma.supplier.findUnique({
                    where: { id: Number(partyId) }
                })

                partyInfo = {
                    name: supplier?.name || 'Unknown',
                    phone: supplier?.phone,
                    email: supplier?.email
                }

                openingBalance = supplier?.outstandingBalance || 0

                purchaseOrders.forEach((po: any) => {
                    // Purchase order entry (Credit)
                    ledgerEntries.push({
                        date: po.orderDate,
                        type: 'Purchase',
                        reference: po.poNumber,
                        debit: 0,
                        credit: po.totalAmount,
                        balance: 0,
                        description: `Purchase Order ${po.poNumber}`
                    })

                    // Payment entry (Debit)
                    if (po.paidAmount > 0) {
                        ledgerEntries.push({
                            date: po.orderDate,
                            type: 'Payment',
                            reference: po.poNumber,
                            debit: po.paidAmount,
                            credit: 0,
                            balance: 0,
                            description: `Payment for ${po.poNumber}`
                        })
                    }
                })
            }

            // Calculate running balance
            let runningBalance = openingBalance
            ledgerEntries = ledgerEntries.map(entry => {
                runningBalance += entry.debit - entry.credit
                return { ...entry, balance: runningBalance }
            })

            closingBalance = runningBalance

            return res.status(200).json({
                partyInfo,
                openingBalance,
                closingBalance,
                entries: ledgerEntries,
                summary: {
                    totalDebit: ledgerEntries.reduce((sum, e) => sum + e.debit, 0),
                    totalCredit: ledgerEntries.reduce((sum, e) => sum + e.credit, 0)
                }
            })
        } catch (error) {
            console.error('Error fetching party ledger:', error)
            return res.status(500).json({ error: 'Failed to fetch party ledger' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
