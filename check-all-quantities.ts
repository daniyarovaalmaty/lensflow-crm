import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;
    
    const products = await prisma.opticProduct.findMany({
        where: { organizationId: orgId },
        select: { name: true, currentStock: true }
    });
    
    // Print non-zero products first, sorted by name
    const nonZero = products.filter(p => p.currentStock > 0).sort((a, b) => a.name.localeCompare(b.name));
    console.log("--- NON-ZERO STOCK IN DB ---");
    for (let p of nonZero) {
        console.log(`${p.currentStock.toString().padStart(4, ' ')} | ${p.name}`);
    }
}
main();
