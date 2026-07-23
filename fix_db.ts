import prisma from './src/lib/db/prisma';

async function main() {
    const docs = await prisma.stockDocument.findMany({
        where: { documentNumber: 'склад1' },
        orderBy: { createdAt: 'desc' }
    });
    console.log("Documents:");
    console.log(JSON.stringify(docs, null, 2));

    const barcodes = docs.flatMap(d => (d.items as any[]).map(i => i.batchBarcode));
    const items = await prisma.stockItem.findMany({
        where: { serialNumber: { in: barcodes } }
    });
    console.log("\nBatches:");
    console.log(JSON.stringify(items, null, 2));

    const productIds = docs.flatMap(d => (d.items as any[]).map(i => i.productId));
    const products = await prisma.opticProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, currentStock: true }
    });
    console.log("\nProducts:");
    console.log(JSON.stringify(products, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
