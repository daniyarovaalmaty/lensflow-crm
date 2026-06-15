const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const order = await prisma.order.findFirst({ where: { orderNumber: "AC62" } });
    if (order) {
        console.log("Found AC62:", JSON.stringify(order.lensConfig, null, 2));
    } else {
        const order2 = await prisma.order.findFirst({ orderBy: { createdAt: 'desc' } });
        console.log("Last order:", order2 ? order2.orderNumber : "None", JSON.stringify(order2?.lensConfig, null, 2));
    }
}
main().finally(() => prisma.$disconnect());
