import prisma from './src/lib/db/prisma';

async function main() {
    const recentOrders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            organization: true,
            patient: true
        }
    });

    console.log("--- RECENT ORDERS ---");
    for (let o of recentOrders) {
        console.log(`Order ID: ${o.id}`);
        console.log(`Created At: ${o.createdAt}`);
        console.log(`Organization: ${o.organization?.name}`);
        console.log(`Patient: ${o.patient?.name}`);
        console.log(`Status: ${o.status}`);
        console.log("-----------------------");
    }
}
main();
