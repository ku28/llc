import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getDoctorFilter } from '../../../lib/doctorUtils'
import { requireStaffOrAbove } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireStaffOrAbove(req, res)
    if (!user) return

    if (req.method === 'GET') {
        try {
            const { doctorId, startDate, endDate } = req.query
            const selectedDoctorId = doctorId ? Number(doctorId) : null
            const doctorFilter = getDoctorFilter(user, selectedDoctorId)

            const dateFilter: any = {}
            if (startDate && endDate) {
                dateFilter.invoiceDate = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                }
            }

            // Get all invoices for the period
            const invoices = await prisma.customerInvoice.findMany({
                where: {
                    ...doctorFilter,
                    ...dateFilter
                },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            })

            // Calculate totals
            const totalSales = invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0)
            const totalTax = invoices.reduce((sum: number, inv: any) => sum + inv.taxAmount, 0)
            const totalDiscount = invoices.reduce((sum: number, inv: any) => sum + inv.discount, 0)

            // Group by tax rate
            const taxBreakdown: any = {}
            invoices.forEach((inv: any) => {
                inv.items.forEach((item: any) => {
                    const rate = item.taxRate || 0
                    if (!taxBreakdown[rate]) {
                        taxBreakdown[rate] = {
                            taxRate: rate,
                            taxableAmount: 0,
                            cgst: 0,
                            sgst: 0,
                            igst: 0,
                            totalTax: 0
                        }
                    }
                    
                    const itemSubtotal = item.quantity * item.unitPrice - item.discount
                    const itemTax = itemSubtotal * rate / 100
                    
                    taxBreakdown[rate].taxableAmount += itemSubtotal
                    taxBreakdown[rate].cgst += itemTax / 2
                    taxBreakdown[rate].sgst += itemTax / 2
                    taxBreakdown[rate].totalTax += itemTax
                })
            })

            // HSN Summary
            const hsnSummary: any = {}
            invoices.forEach((inv: any) => {
                inv.items.forEach((item: any) => {
                    const hsn = item.product?.hsnCode || 'N/A'
                    if (!hsnSummary[hsn]) {
                        hsnSummary[hsn] = {
                            hsnCode: hsn,
                            description: item.description,
                            quantity: 0,
                            value: 0,
                            taxAmount: 0
                        }
                    }
                    
                    hsnSummary[hsn].quantity += item.quantity
                    hsnSummary[hsn].value += item.quantity * item.unitPrice - item.discount
                    hsnSummary[hsn].taxAmount += (item.quantity * item.unitPrice - item.discount) * (item.taxRate || 0) / 100
                })
            })

            return res.status(200).json({
                summary: {
                    totalInvoices: invoices.length,
                    totalSales,
                    totalTax,
                    totalDiscount,
                    netSales: totalSales - totalDiscount
                },
                taxBreakdown: Object.values(taxBreakdown),
                hsnSummary: Object.values(hsnSummary),
                invoices
            })
        } catch (error) {
            console.error('Error fetching GST report:', error)
            return res.status(500).json({ error: 'Failed to fetch GST report' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
