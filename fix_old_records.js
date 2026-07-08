const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function main() {
    // Find appointments that HAVE a createdById
    const recent = await prisma.appointment.findMany({
        where: { createdById: { not: null } },
        include: { createdBy: true },
        take: 10,
        orderBy: { createdAt: 'desc' }
    });
    
    console.log("Recent creators:");
    recent.forEach(r => {
        console.log(`Appt ${r.id} created by ${r.createdBy?.fullName || r.createdById} at ${r.createdAt}`);
    });

    const counts = await prisma.appointment.groupBy({
        by: ['createdById'],
        _count: { createdById: true },
        where: { createdById: { not: null } }
    });

    console.log("Counts of creators:", counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
