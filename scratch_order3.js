const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const orders = await prisma.order.findMany({
        where: { orderNumber: { not: { startsWith: 'LX-' } } },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true, createdAt: true },
        take: 20
    });
    console.log("Top 20 orders by orderNumber:", orders);
}
main().catch(console.error).finally(() => prisma.$disconnect());
