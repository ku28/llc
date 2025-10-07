const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // create or update users
  const bcrypt = require('bcryptjs')
  const adminHash = await bcrypt.hash('adminpass', 10)
  const recHash = await bcrypt.hash('receptionpass', 10)

  await prisma.user.upsert({
    where: { email: 'admin@lastleafcare.in' },
    update: { passwordHash: adminHash },
    create: { email: 'admin@lastleafcare.in', name: 'Admin', role: 'admin', passwordHash: adminHash }
  })

  await prisma.user.upsert({
    where: { email: 'reception@lastleafcare.in' },
    update: { passwordHash: recHash },
    create: { email: 'reception@lastleafcare.in', name: 'Reception', role: 'staff', passwordHash: recHash }
  })

  const p = await prisma.patient.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: { firstName: 'John', lastName: 'Doe', phone: '+1234567890', email: 'john@example.com' }
  })

  await prisma.appointment.create({ data: {
    patientId: p.id, scheduled: new Date(), notes: 'Initial checkup'
  }})

  // sample treatment
  await prisma.treatment.upsert({
    where: { code: 'TRT-001' },
    update: {},
    create: { name: 'Herbal Toner', code: 'TRT-001', dosage: '2 drops', administration: 'oral', procedure: 'oral intake', dilutors: '2 drops in water', notes: 'Good for digestion' }
  })

  // sample product and batch
  const prod = await prisma.product.upsert({
    where: { sku: 'HO-001' },
    update: {},
    create: { name: 'Herbal Oil', sku: 'HO-001', priceCents: 1500, quantity: 100, reorderLevel: 10 }
  })

  await prisma.productBatch.create({ data: {
    productId: prod.id, sku: 'HO-001-B1', quantity: 50, purchasePriceCents: 1000, salePriceCents: 1500, expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
  }})
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
