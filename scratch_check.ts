import prisma from './src/lib/db/prisma';

async function main() {
    const orders = await prisma.order.findMany({
        where: { patient: { name: { contains: 'Жумахан Ерсултан' } } },
        include: { organization: true, createdBy: true, patient: true }
    });
    console.log("Found orders:");
    orders.forEach(o => {
        console.log(`- ID: ${o.id}, CustomId: ${o.orderNumber}, Created: ${o.createdAt}, Patient: ${o.patient?.name}, Source: ${o.source}, CreatedBy: ${o.createdBy?.fullName} (${o.createdBy?.email})`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
