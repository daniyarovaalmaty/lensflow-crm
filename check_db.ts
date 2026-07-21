import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organization.findMany({
        select: {
            name: true,
            _count: { select: { users: true } }
        },
        take: 10
    });
    console.log(orgs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
