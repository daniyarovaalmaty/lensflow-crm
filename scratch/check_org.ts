import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const org = await prisma.organization.findFirst({
        where: { name: { contains: 'Оптика Народная' } },
        include: { branches: true }
    });
    console.log(JSON.stringify(org, null, 2));

    const allOrgs = await prisma.organization.findMany({
        where: { name: { contains: 'Народная' } }
    });
    console.log(allOrgs.map(o => ({ id: o.id, name: o.name, type: o.type, parentId: o.parentId })));

    const count = await prisma.order.count();
    console.log('Total orders in DB:', count);
}

main().finally(() => prisma.$disconnect());
