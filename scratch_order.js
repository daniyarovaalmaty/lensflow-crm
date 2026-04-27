require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const lastOrder = await prisma.order.findFirst({
        where: { orderNumber: { not: { startsWith: 'LX-' } } },
        orderBy: { createdAt: 'desc' },
        select: { orderNumber: true, createdAt: true },
    });
    console.log("Last Order desc createdAt:", lastOrder);

    if (lastOrder && lastOrder.orderNumber) {
        const match = lastOrder.orderNumber.match(/^([A-Z]{2})(\d{2})$/);
        console.log("Match:", match);
    }
    
    // Check if there are other orders
    const all = await prisma.order.findMany({
        where: { orderNumber: { not: { startsWith: 'LX-' } } },
        select: { orderNumber: true, createdAt: true },
        orderBy: { orderNumber: 'desc' },
        take: 5
    });
    console.log("Top orders by orderNumber:", all);
}

main().catch(console.error).finally(() => prisma.$disconnect());
