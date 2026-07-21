import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'ozat', mode: 'insensitive' } },
        { fullName: { contains: 'ozat', mode: 'insensitive' } }
      ]
    },
    include: {
      organization: true,
      branches: {
        include: {
          branch: true
        }
      }
    }
  })

  console.log("Found Users:", JSON.stringify(users, null, 2))

  const orgs = await prisma.organization.findMany({
    where: {
      name: { contains: 'ozat', mode: 'insensitive' }
    },
    include: {
      users: true
    }
  })

  console.log("Found Orgs:", JSON.stringify(orgs, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
