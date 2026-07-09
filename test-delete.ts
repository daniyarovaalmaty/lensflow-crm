import prisma from './src/lib/db/prisma';

async function test() {
    try {
        const p = await prisma.opticProduct.findFirst({ where: { name: '10' } });
        if (!p) {
            console.log('Product 10 not found');
            return;
        }
        console.log('Trying to delete product:', p.id);
        
        await prisma.stockMovement.deleteMany({ where: { productId: p.id } });
        await prisma.stockItem.deleteMany({ where: { productId: p.id } });
        await prisma.saleItem.deleteMany({ where: { productId: p.id } });
        
        await prisma.opticProduct.delete({ where: { id: p.id } });
        console.log('SUCCESS');
    } catch (e: any) {
        console.error('ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
test();
