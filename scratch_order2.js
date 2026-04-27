const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const lastOrder = await prisma.order.findFirst({
        where: { orderNumber: { not: { startsWith: 'LX-' } } },
        orderBy: { orderNumber: 'desc' }, // Order by orderNumber!
        select: { orderNumber: true, createdAt: true },
    });
    console.log("Last Order desc orderNumber:", lastOrder);

    const lastOrderDate = await prisma.order.findFirst({
        where: { orderNumber: { not: { startsWith: 'LX-' } } },
        orderBy: { createdAt: 'desc' }, // Order by createdAt
        select: { orderNumber: true, createdAt: true },
    });
    console.log("Last Order desc createdAt:", lastOrderDate);

}
main().catch(console.error).finally(() => prisma.$disconnect());
