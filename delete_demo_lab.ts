import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const labs = await prisma.organization.findMany({
    where: { name: { contains: 'Демо Лаборатория' } }
  })
  
  if (labs.length === 0) {
    console.log('No demo labs found')
    return
  }

  for (const lab of labs) {
    console.log('Found lab:', lab.id, lab.name)
    try {
        await prisma.organization.delete({
            where: { id: lab.id }
        })
        console.log('Deleted successfully.')
    } catch (e) {
        console.log('Could not delete, setting status to blocked')
        await prisma.organization.update({
            where: { id: lab.id },
            data: { status: 'blocked' }
        })
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
