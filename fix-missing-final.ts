import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const targetQuantities = [
        { search: 'РИБОФАСТ', qty: 54 },
        { search: 'FERRARA RING СТЕРИЛЬНЫЙ', qty: 83 } // 43 AFR + 40 AFR6
    ];

    const allProducts = await prisma.opticProduct.findMany({ where: { organizationId: orgId } });

    for (let target of targetQuantities) {
        let p = allProducts.find(x => x.name.toUpperCase().includes(target.search.toUpperCase()));

        if (p) {
            await prisma.stockItem.deleteMany({ where: { productId: p.id, organizationId: orgId } });
            
            const items = [];
            for(let i=0; i<target.qty; i++) {
                items.push({
                    productId: p.id,
                    organizationId: orgId,
                    status: 'AVAILABLE',
                    barcode: `AUTO-${p.id.slice(-6)}-${Math.random().toString(36).substring(2,8).toUpperCase()}`,
                    purchasePrice: p.purchasePrice,
                    notes: 'Manual correct qty'
                });
            }
            if (items.length > 0) {
                await prisma.stockItem.createMany({ data: items });
            }
            await prisma.opticProduct.update({
                where: { id: p.id },
                data: { currentStock: target.qty }
            });
            console.log(`Updated ${p.name} to ${target.qty}`);
        } else {
            console.log(`COULD NOT FIND ${target.search}`);
        }
    }
}
main();
