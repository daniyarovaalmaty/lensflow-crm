import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const orders = await prisma.order.findMany({
        where: { source: 'itigris' },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: { externalId: true, createdAt: true }
    });

    console.log("Oldest imported orders:");
    for (const o of orders) {
        console.log(`ID: ${o.externalId}, CreatedAt: ${o.createdAt.toISOString()}`);
    }

    const newOrders = await prisma.order.findMany({
        where: { source: 'itigris' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { externalId: true, createdAt: true }
    });

    console.log("\nNewest imported orders:");
    for (const o of newOrders) {
        console.log(`ID: ${o.externalId}, CreatedAt: ${o.createdAt.toISOString()}`);
    }
}

main().finally(() => prisma.$disconnect());
