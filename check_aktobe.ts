import prisma from './src/lib/db/prisma';

async function main() {
    const orgs = await prisma.organization.findMany({
        where: { name: { contains: 'Актобе' } },
        include: { _count: { select: { orders: true, users: true } } }
    });
    console.log(orgs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
