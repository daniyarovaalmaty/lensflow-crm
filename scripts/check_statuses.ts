import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const orders = await prisma.order.groupBy({
        by: ['status'],
        where: { source: 'itigris' },
        _count: { id: true }
    });
    console.log("Itigris orders by status:");
    console.log(orders);
}
main().catch(console.error).finally(() => prisma.$disconnect());
