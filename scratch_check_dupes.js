const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.order.findMany({
        where: { patientName: { contains: 'Жумахан Ерсултан' } },
        include: { clinic: true, doctor: true }
    });
    console.log("Found orders:");
    orders.forEach(o => {
        console.log(`- ID: ${o.id}, CustomId: ${o.customId}, Created: ${o.createdAt}, Patient: ${o.patientName}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
