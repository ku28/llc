import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🗑️  Starting database reset (preserving users and landing pages)...')

    try {
        // Delete ERP data in correct order (respecting foreign keys)
        console.log('Deleting prescriptions...')
        await prisma.prescription.deleteMany({})
        
        console.log('Deleting treatment products...')
        await prisma.treatmentProduct.deleteMany({})
        
        console.log('Deleting treatments...')
        await prisma.treatment.deleteMany({})
        
        console.log('Deleting customer invoice items...')
        await prisma.customerInvoiceItem.deleteMany({})
        
        console.log('Deleting customer invoices...')
        await prisma.customerInvoice.deleteMany({})
        
        console.log('Deleting visits...')
        await prisma.visit.deleteMany({})
        
        console.log('Deleting tokens...')
        await prisma.token.deleteMany({})
        
        console.log('Deleting patients...')
        await prisma.patient.deleteMany({})
        
        console.log('Deleting purchase order items...')
        await prisma.purchaseOrderItem.deleteMany({})
        
        console.log('Deleting purchase orders...')
        await prisma.purchaseOrder.deleteMany({})
        
        console.log('Deleting stock transactions...')
        await prisma.stockTransaction.deleteMany({})
        
        console.log('Deleting products...')
        await prisma.product.deleteMany({})
        
        console.log('Deleting categories...')
        await prisma.category.deleteMany({})
        
        console.log('Deleting suppliers...')
        await prisma.supplier.deleteMany({})

        console.log('✅ Database reset complete!')
        console.log('✅ Users and landing pages preserved')
        
    } catch (error) {
        console.error('❌ Error resetting database:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
