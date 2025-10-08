const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // create or update users
  const bcrypt = require('bcryptjs')
  const adminHash = await bcrypt.hash('adminpass', 10)
  const recHash = await bcrypt.hash('receptionpass', 10)

  await prisma.user.upsert({
    where: { email: 'admin@lastleafcare.com' },
    update: { passwordHash: adminHash },
    create: { email: 'admin@lastleafcare.com', name: 'Admin', role: 'admin', passwordHash: adminHash }
  })

  await prisma.user.upsert({
    where: { email: 'reception@lastleafcare.com' },
    update: { passwordHash: recHash },
    create: { email: 'reception@lastleafcare.com', name: 'Reception', role: 'staff', passwordHash: recHash }
  })
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
