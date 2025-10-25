import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      let contact = await prisma.contactInfo.findFirst();

      // Auto-initialize with default contact info if empty
      if (!contact) {
        contact = await prisma.contactInfo.create({
          data: {
            address: "123 Medical Center Drive\nSuite 100\nCity, State 12345",
            phone: "+1 (555) 123-4567",
            email: "info@lastleafcare.com",
            hours: "Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed"
          }
        });
      }

      return res.status(200).json(contact);
    } catch (error) {
      console.error('Error fetching contact info:', error);
      return res.status(500).json({ error: 'Failed to fetch contact info' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { address, phone, email, hours } = req.body;

      // Delete existing contact info
      await prisma.contactInfo.deleteMany();

      // Create new contact info
      const contact = await prisma.contactInfo.create({
        data: {
          address,
          phone,
          email,
          hours
        }
      });

      return res.status(200).json(contact);
    } catch (error) {
      console.error('Error updating contact info:', error);
      return res.status(500).json({ error: 'Failed to update contact info' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
