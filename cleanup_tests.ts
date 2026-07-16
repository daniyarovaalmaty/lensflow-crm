import { config } from 'dotenv'
config({ path: '.env.local' })

import prisma from './src/lib/db/prisma'

async function main() {
  // Find a test product to determine the organizationId
  const testProduct = await prisma.opticProduct.findFirst({
    where: { name: { startsWith: 'test' } }
  })
  
  if (!testProduct) {
    console.log('No test products found.')
    return
  }

  const organizationId = testProduct.organizationId
  console.log(`Found test products in organization: ${organizationId}`)

  const products = await prisma.opticProduct.findMany({
    where: {
      name: { startsWith: 'test' },
      organizationId: organizationId
    }
  })
  
  console.log('Test products to delete:', products.map(p => p.name))
  
  const docs = await prisma.stockDocument.findMany({
    where: {
      OR: [
        { documentNumber: { startsWith: 'test' } },
        { documentNumber: '12' },
        { documentNumber: '1' }
      ],
      organizationId: organizationId
    }
  })
  
  console.log('Test docs to delete:', docs.map(d => d.documentNumber))
  
  const productIds = products.map(p => p.id)
  const docIds = docs.map(d => d.id)

  if (productIds.length > 0) {
    const pm = await prisma.stockMovement.deleteMany({
      where: { productId: { in: productIds }, organizationId: organizationId }
    })
    console.log('Deleted product movements:', pm.count)

    const pd = await prisma.opticProduct.deleteMany({
      where: { id: { in: productIds }, organizationId: organizationId }
    })
    console.log('Deleted products:', pd.count)
  }

  if (docIds.length > 0) {
    const dm = await prisma.stockMovement.deleteMany({
      where: { documentId: { in: docIds }, organizationId: organizationId }
    })
    console.log('Deleted doc movements:', dm.count)

    const dd = await prisma.stockDocument.deleteMany({
      where: { id: { in: docIds }, organizationId: organizationId }
    })
    console.log('Deleted docs:', dd.count)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
