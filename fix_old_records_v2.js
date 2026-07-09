const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Connecting to database...");

    const nullCreatedAppointments = await prisma.appointment.count({
        where: { createdById: null }
    });

    console.log(`Found ${nullCreatedAppointments} appointments with no createdById.`);

    // Find the most frequent creator (cashier/admin) to assign to these old records
    const creators = await prisma.appointment.groupBy({
        by: ['createdById'],
        _count: { createdById: true },
        where: { createdById: { not: null } },
        orderBy: { _count: { createdById: 'desc' } }
    });

    const topCreatorId = creators.length > 0 ? creators[0].createdById : null;
    console.log(`Top creator ID: ${topCreatorId}`);
    
    let updatedCount = 0;
    if (topCreatorId) {
        const result = await prisma.appointment.updateMany({
            where: { createdById: null },
            data: { createdById: topCreatorId }
        });
        updatedCount = result.count;
        console.log(`Updated ${updatedCount} appointments.`);
    }

    // Also fix leads with appointmentAt but no assigneeId
    let updatedLeadsCount = 0;
    if (topCreatorId) {
        const result = await prisma.lead.updateMany({
            where: { appointmentAt: { not: null }, assigneeId: null },
            data: { assigneeId: topCreatorId }
        });
        updatedLeadsCount = result.count;
        console.log(`Updated ${updatedLeadsCount} leads.`);
    }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
