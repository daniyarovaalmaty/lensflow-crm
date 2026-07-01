import prisma from '../src/lib/db/prisma';

async function main() {
    console.log("Fixing stock...");

    // 1. Delete orphaned movements for S-0010
    const deleted = await prisma.stockMovement.deleteMany({
        where: { documentNumber: 'S-0010' }
    });
    console.log(`Deleted ${deleted.count} orphaned movements for S-0010.`);

    // 2. Recalculate stock for all products in New Eye
    const org = await prisma.organization.findFirst({
        where: { name: { contains: 'New Eye', mode: 'insensitive' } }
    });

    if (!org) {
        throw new Error("New Eye organization not found");
    }

    const products = await prisma.opticProduct.findMany({
        where: { organizationId: org.id },
        select: { id: true, name: true, currentStock: true }
    });

    console.log(`Recalculating stock for ${products.length} products...`);

    let updatedCount = 0;

    for (const product of products) {
        // Aggregate all movements for this product
        const movements = await prisma.stockMovement.findMany({
            where: { productId: product.id }
        });

        // The true stock is the sum of all movements
        // Receipts (+), Sales (-), Returns (+/-), Write-offs (-)
        let trueStock = 0;
        for (const mov of movements) {
            trueStock += mov.quantity; // quantity should already be positive/negative based on type
        }

        if (trueStock !== product.currentStock) {
            console.log(`[${product.name}] Expected: ${trueStock}, Actual: ${product.currentStock}. Correcting...`);
            await prisma.opticProduct.update({
                where: { id: product.id },
                data: { currentStock: trueStock }
            });
            updatedCount++;
        }
    }

    console.log(`Successfully recalculated and corrected ${updatedCount} products.`);
}

main()
    .catch(e => {
        console.error("Failed", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
