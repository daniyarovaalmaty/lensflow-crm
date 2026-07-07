import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    // We know from Excel that:
    // V78C-SR should have 1
    // V40LC should have 1
    // VDGTLHM-BK should have 1

    const prods = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'VOLK' } }
    });

    const v78csr = prods.find(p => p.name.includes('V78С-SR')); // Cyrillic C
    const v40lc = prods.find(p => p.name.replace(/С/g, 'C').replace(/с/g, 'c').includes('V40LC'));
    const vdgtlhmBk = prods.find(p => p.name.includes('VDGTLHM-BK'));

    const itemsToInsert = [];
    const stockUpdates: Record<string, number> = {};

    if (v78csr) {
        itemsToInsert.push({
            productId: v78csr.id,
            organizationId: orgId,
            status: 'AVAILABLE',
            barcode: `AUTO-${v78csr.id.slice(-6)}-${Math.random().toString(36).substring(2,8).toUpperCase()}`,
            purchasePrice: v78csr.retailPrice || 0,
            notes: `Auto-imported VOLK fix`
        });
        stockUpdates[v78csr.id] = 1;
    }

    if (v40lc) {
        itemsToInsert.push({
            productId: v40lc.id,
            organizationId: orgId,
            status: 'AVAILABLE',
            barcode: `AUTO-${v40lc.id.slice(-6)}-${Math.random().toString(36).substring(2,8).toUpperCase()}`,
            purchasePrice: v40lc.retailPrice || 0,
            notes: `Auto-imported VOLK fix`
        });
        stockUpdates[v40lc.id] = 1;
    }

    if (vdgtlhmBk) {
        itemsToInsert.push({
            productId: vdgtlhmBk.id,
            organizationId: orgId,
            status: 'AVAILABLE',
            barcode: `AUTO-${vdgtlhmBk.id.slice(-6)}-${Math.random().toString(36).substring(2,8).toUpperCase()}`,
            purchasePrice: vdgtlhmBk.retailPrice || 0,
            notes: `Auto-imported VOLK fix`
        });
        stockUpdates[vdgtlhmBk.id] = 1;
    }

    if (itemsToInsert.length > 0) {
        await prisma.stockItem.createMany({ data: itemsToInsert });
        for (const [id, qty] of Object.entries(stockUpdates)) {
            await prisma.opticProduct.update({
                where: { id },
                data: { currentStock: qty }
            });
        }
        console.log(`Inserted ${itemsToInsert.length} missing VOLK items!`);
    }
}
main();
