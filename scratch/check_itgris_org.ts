import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const orders = await prisma.order.groupBy({
        by: ['organizationId'],
        _count: { id: true },
        where: { orderNumber: { startsWith: 'ITG-' } }
    });
    console.log("ITGris orders by org:", orders);

    const nonItg = await prisma.order.groupBy({
        by: ['organizationId'],
        _count: { id: true },
        where: { orderNumber: { not: { startsWith: 'ITG-' } } }
    });
    console.log("Normal orders by org:", nonItg);

    // Also check how many orders are visible to zakazy.optika.narodnaya@gmail.com
    const zakazyBranches = ["cmqg98g0e000004latyjvmq2k", "cmqg98pmr000104lalkyyd36j", "cmqg98tea000204lahncl83dy"];
    // Wait, the branches array in user contains { id, branchId, ... }
}
main().finally(() => prisma.$disconnect());
