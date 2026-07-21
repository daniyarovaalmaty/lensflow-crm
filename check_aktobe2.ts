import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organization.findMany({
        where: { name: { contains: 'Народная' } },
        include: { _count: { select: { orders: true, users: true } }, users: true }
    });
    console.dir(orgs, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
