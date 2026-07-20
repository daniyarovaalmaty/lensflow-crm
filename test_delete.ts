import prisma from './src/lib/db/prisma';

async function main() {
    const orgId = 'cmr4nrk53000004ie2202u79h';
    const productId = 'cmroxu3gj000604jp31yd3svg'; // AJL Ferrara Ring AFR6

    try {
        console.log("Deleting orphaned stock items...");
        const delRes = await prisma.stockItem.deleteMany({
            where: { productId, organizationId: orgId }
        });
        console.log("Deleted stock items:", delRes.count);

        console.log("Deleting optic product...");
        await prisma.opticProduct.delete({
            where: { id: productId }
        });
        console.log("Deleted optic product successfully");
    } catch (error) {
        console.error("Error during delete:", error);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
