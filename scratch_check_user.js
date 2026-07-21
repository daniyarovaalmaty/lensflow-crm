process.env.DATABASE_URL = "postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'ozat', mode: 'insensitive' } },
        { fullName: { contains: 'ozat', mode: 'insensitive' } },
        { email: { contains: 'ozata', mode: 'insensitive' } }
      ]
    },
    include: {
      organization: true
    }
  })

  console.log("Users:", JSON.stringify(users, null, 2))

  const orgs = await prisma.organization.findMany({
    where: {
      name: { contains: 'ozat', mode: 'insensitive' }
    }
  })
  console.log("Orgs:", JSON.stringify(orgs, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
