const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const syncs = await prisma.itigrisSync.findMany({ orderBy: { createdAt: 'desc' }, take: 2 });
    console.log(JSON.stringify(syncs, null, 2));
}
main().finally(() => prisma.$disconnect());
