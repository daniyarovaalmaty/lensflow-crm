const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: { url: process.env.DATABASE_URL }
    }
});

async function main() {
    const doctors = await prisma.user.findMany({ where: { role: 'doctor' } });
    console.log(doctors.map(d => d.fullName));
}

main().catch(console.error).finally(() => prisma.$disconnect());
