import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const targetQuantities = [
        { search: 'Ribofast', qty: 54 },
        { search: 'OCULFIT 14', qty: 9 },
        { search: 'OCULFIT 16', qty: 4 },
        { search: 'OCULFIT 19', qty: 2 },
        { search: 'OCULFIT 21', qty: 9 },
        { search: 'OCULFIT 22', qty: 3 },
        { search: 'OCULFIT 23', qty: 5 },
        { search: 'LLASHP60', exact: true, qty: 42 },
        { search: 'AFR', exact: true, qty: 43 },
        { search: 'AFR6', exact: true, qty: 40 },
        { search: 'CW', exact: true, qty: 4 },
        { search: 'CCW', exact: true, qty: 1 },
        { search: 'CW6', exact: true, qty: 1 },
        { search: 'CCW6', exact: true, qty: 4 },
        { search: 'VS 302', qty: 10 }
    ];

    const allProducts = await prisma.opticProduct.findMany({ where: { organizationId: orgId } });

    for (let target of targetQuantities) {
        let p;
        if (target.exact) {
            p = allProducts.find(x => {
                const words = x.name.split(/[\s,]+/);
                return words.includes(target.search);
            });
            if (!p && target.search === 'LLASHP60') {
                p = allProducts.find(x => x.name.includes('LLASHP60') && !x.name.includes('PL'));
            }
        } else {
            p = allProducts.find(x => x.name.toUpperCase().includes(target.search.toUpperCase()));
        }

        if (p) {
            // Delete existing
            await prisma.stockItem.deleteMany({ where: { productId: p.id, organizationId: orgId } });
            
            // Create new
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
