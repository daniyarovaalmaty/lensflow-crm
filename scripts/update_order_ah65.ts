import 'dotenv/config'
import { prisma } from '../src/lib/db/prisma'

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      orderNumber: { contains: '65' },
      organization: {
        name: { contains: 'Лазерный' }
      }
    }
  })
  
  const order = orders.find(o => o.orderNumber.includes('65'))
  if (!order) {
    console.log('Order not found')
    return
  }
  
  console.log('Found order:', order.orderNumber)
  const config: any = order.lensConfig
  
  if (config?.eyes?.os?.tor === -1.6) {
    config.eyes.os.tor = 1.6
    await prisma.order.update({
      where: { id: order.id },
      data: { lensConfig: config }
    })
    console.log('Updated order lensConfig.eyes.os.tor from -1.6 to 1.6')
  } else {
    console.log('OS Toric value is not -1.6. Current config:', JSON.stringify(config, null, 2))
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
