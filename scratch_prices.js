const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
            orderNumber: true,
            totalPrice: true,
            discountPercent: true,
            isUrgent: true,
            priceOd: true,
            priceOs: true,
            products: true,
            lensConfig: true
        }
    });
    console.log(JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
