const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});

async function main() {
    const users = await prisma.user.findMany({
        where: {
            subRole: { in: ['optic_doctor', 'sales_manager', 'optic_manager'] }
        },
        select: {
            fullName: true,
            email: true,
            subRole: true
        }
    });
    console.log(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
