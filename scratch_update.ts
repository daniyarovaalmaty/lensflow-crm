import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.organization.update({
    where: { id: 'org-demo-neweye' },
    data: { logo: 'https://mmundus.com/media/lensflow/7687dab9ad3f430ab5d29b409746da29.png' },
    select: { id: true, name: true, logo: true }
  })
  console.log('Updated:', result)
}

main().catch(console.error).finally(() => prisma.$disconnect())
