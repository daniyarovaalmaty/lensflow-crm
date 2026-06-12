import prisma from './src/lib/db/prisma';

async function main() {
    await prisma.order.delete({
        where: { id: 'cmqapughq000304l7yixbadvf' }
    });
    console.log("Deleted AC56");
}

main().catch(console.error).finally(() => prisma.$disconnect());
