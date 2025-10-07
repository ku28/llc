import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method === 'GET'){
    try {
      const items = await prisma.sale.findMany({ orderBy: { date: 'desc' } })
      return res.status(200).json(items)
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.code === 'P2022') return res.status(200).json([])
      return res.status(500).json({ error: String(err?.message || err) })
    }
  }

  if(req.method === 'POST'){
    const { productBatchId, quantity, totalCents, customer } = req.body
    try {
      const s = await prisma.sale.create({ data: { productBatchId: Number(productBatchId), quantity: Number(quantity), totalCents: Number(totalCents), customer } })
      return res.status(201).json(s)
    } catch (err: any) {
      return res.status(500).json({ error: String(err?.message || err) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
