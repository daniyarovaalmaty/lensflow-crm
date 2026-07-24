import 'dotenv/config';

import prisma from '../src/lib/db/prisma';

async function main() {
    try {
        const count = await prisma.order.count();
        console.log(`Total orders in LensFlow DB: ${count}`);

        const deliveredCount = await prisma.order.count({
            where: { status: 'delivered' }
        });
        console.log(`Delivered orders: ${deliveredCount}`);

        const activeCount = await prisma.order.count({
            where: { status: { not: 'delivered' } }
        });
        console.log(`Active (non-delivered) orders: ${activeCount}`);
        
        // Show some recent orders to see where they are from
        const recent = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, orderNumber: true, status: true, source: true, createdAt: true }
        });
        console.log('Recent orders:', recent);
    } catch (e) {
        console.error(e);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
