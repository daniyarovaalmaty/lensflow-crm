import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const org = await prisma.organization.findFirst({
        where: { name: { contains: 'ЦКК' } },
        include: { orders: { select: { source: true }, take: 10 } }
    });
    console.log("Org:", org?.name, "Orders sources:", org?.orders);
}

main().catch(console.error).finally(() => prisma.$disconnect());
