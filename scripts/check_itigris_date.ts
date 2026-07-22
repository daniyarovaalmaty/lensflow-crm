import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const orders = await prisma.order.findMany({
        where: { source: 'itigris' },
        take: 5,
        select: { externalId: true, itigrisRaw: true }
    });

    for (const o of orders) {
        const raw = o.itigrisRaw as any;
        console.log(`ID: ${o.externalId}, Raw CreatedAt: ${raw?.createdAt}`);
    }
}

main().finally(() => prisma.$disconnect());
