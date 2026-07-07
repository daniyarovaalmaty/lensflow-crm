import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const prods = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'V78' } }
    });

    console.log("V78 DB Products:");
    for (const p of prods) {
        console.log(`- ID: ${p.id}, Name: ${p.name}, Stock: ${p.currentStock}`);
        // Let's print the character codes to see if it's Cyrillic C
        for (let i = 0; i < 7; i++) {
            console.log(`  char ${i}: ${p.name[i]} (${p.name.charCodeAt(i)})`);
        }
    }
}
main();
