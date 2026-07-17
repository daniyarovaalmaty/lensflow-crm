
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
    const orgs = await prisma.organization.findMany({ take: 1 });
    const org = orgs[0];
    const products = await prisma.opticProduct.findMany({ where: { organizationId: org.id }, take: 1 });
    const product = products[0];
    const doc = await prisma.stockDocument.create({
        data: {
            documentNumber: 'draft-test-1234',
            organizationId: org.id,
            type: 'receipt',
            status: 'draft',
            totalAmount: 100,
            items: [{ productId: product.id, qty: 1, price: 100, batchBarcode: 'test1234' }]
        }
    });
    console.log('Created draft', doc.id);
    try {
        const result = await prisma.$transaction(async (tx) => {
            await tx.stockDocument.update({
                where: { id: doc.id },
                data: { status: 'confirmed', confirmedAt: new Date() }
            });
            for (const item of doc.items) {
                const p = await tx.opticProduct.findUnique({ where: { id: item.productId } });
                await tx.opticProduct.update({
                    where: { id: p.id },
                    data: { currentStock: p.currentStock + item.qty, purchasePrice: item.price }
                });
                const existingBatch = await tx.stockItem.findUnique({
                    where: { organizationId_serialNumber: { organizationId: org.id, serialNumber: item.batchBarcode } }
                });
                if (existingBatch) {
                    await tx.stockItem.update({
                        where: { id: existingBatch.id },
                        data: { quantity: existingBatch.quantity + item.qty }
                    });
                } else {
                    await tx.stockItem.create({
                        data: {
                            productId: p.id,
                            organizationId: org.id,
                            serialNumber: item.batchBarcode,
                            quantity: item.qty,
                            purchasePrice: item.price,
                            receiptDocId: doc.id
                        }
                    });
                }
                await tx.stockMovement.create({
                    data: {
                        organizationId: org.id,
                        productId: p.id,
                        type: 'receipt',
                        quantity: item.qty,
                        serialNumbers: [item.batchBarcode],
                        documentNumber: doc.documentNumber,
                        documentId: doc.id
                    }
                });
            }
            return true;
        });
        console.log('Transaction success:', result);
    } catch(e) {
        console.error('Transaction failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}
test();

