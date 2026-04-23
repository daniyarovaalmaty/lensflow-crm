const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const p = await prisma.opticProduct.findFirst({
        where: { type: 'service' }
    });
    console.log("Before:", p.isPublic);
    
    // Simulate updating
    const updated = await prisma.opticProduct.update({
        where: { id: p.id },
        data: { isPublic: true }
    });
    console.log("After:", updated.isPublic);
}
main().catch(console.error).finally(() => prisma.$disconnect());
