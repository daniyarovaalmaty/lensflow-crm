
import prisma from './src/lib/db/prisma';

async function main() {
    const orders = await prisma.order.findMany({
        where: {
            patient: {
                name: {
                    contains: 'Рожнов',
                    mode: 'insensitive'
                }
            }
        },
        select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            status: true,
            isUrgent: true,
            lensConfig: true
        },
        orderBy: { createdAt: 'desc' }
    });
    console.log(JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
