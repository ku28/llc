import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { requireStaffOrAbove } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Suppliers restricted to staff and above
    const user = await requireStaffOrAbove(req, res)
    if (!user) return
    
    if (req.method === 'GET') {
        try {
            const suppliers = await prisma.supplier.findMany({
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: { purchaseOrders: true }
                    }
                }
            })
            return res.status(200).json(suppliers)
        } catch (error) {
            console.error('Error fetching suppliers:', error)
            return res.status(500).json({ error: 'Failed to fetch suppliers' })
        }
    }

    if (req.method === 'POST') {
        try {
            const {
                name,
                contactPerson,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                gstin,
                paymentTerms,
                creditLimit,
                notes
            } = req.body

            const supplier = await prisma.supplier.create({
                data: {
                    name,
                    contactPerson,
                    email,
                    phone,
                    address,
                    city,
                    state,
                    pincode,
                    gstin,
                    paymentTerms: paymentTerms || 'Net 30',
                    creditLimit: creditLimit ? Number(creditLimit) : 0,
                    notes
                }
            })

            return res.status(201).json(supplier)
        } catch (error) {
            console.error('Error creating supplier:', error)
            return res.status(500).json({ error: 'Failed to create supplier' })
        }
    }

    if (req.method === 'PUT') {
        try {
            const { id, ...data } = req.body

            const supplier = await prisma.supplier.update({
                where: { id: Number(id) },
                data: {
                    ...data,
                    creditLimit: data.creditLimit ? Number(data.creditLimit) : undefined,
                    outstandingBalance: data.outstandingBalance ? Number(data.outstandingBalance) : undefined
                }
            })

            return res.status(200).json(supplier)
        } catch (error) {
            console.error('Error updating supplier:', error)
            return res.status(500).json({ error: 'Failed to update supplier' })
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query

            await prisma.supplier.delete({
                where: { id: Number(id) }
            })

            return res.status(200).json({ message: 'Supplier deleted successfully' })
        } catch (error) {
            console.error('Error deleting supplier:', error)
            return res.status(500).json({ error: 'Failed to delete supplier' })
        }
    }

    return res.status(405).json({ error: 'Method not allowed' })
}
