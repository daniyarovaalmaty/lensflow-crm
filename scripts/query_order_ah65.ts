import 'dotenv/config'
import { prisma } from '../src/lib/db/prisma'

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      orderNumber: { contains: '65' },
      organization: {
        name: { contains: 'Лазерный' }
      }
    },
    include: {
      patient: true,
      organization: true
    },
    take: 10
  })
  console.log(JSON.stringify(orders, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
