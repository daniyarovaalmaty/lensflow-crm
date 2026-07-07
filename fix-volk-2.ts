import * as xlsx from 'xlsx';
import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
    const wbStock = xlsx.readFile(warehouseFile, { raw: false });
    const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });

    const volkDbProducts = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'VOLK' } }
    });

    let deletedCount = 0;
    for (const vp of volkDbProducts) {
        const res = await prisma.stockItem.deleteMany({
            where: { productId: vp.id, organizationId: orgId }
        });
        deletedCount += res.count;
        await prisma.opticProduct.update({
            where: { id: vp.id, organizationId: orgId },
            data: { currentStock: 0 }
        });
    }

    let inVolk = false;
    let modelCol = -1;
    let factCol = -1;
    const expectedQty: Record<string, number> = {};

    for (let i = 0; i < rawStock.length; i++) {
        const row = rawStock[i];
        if (!row) continue;
        
        if (row[0] === 'VOLK' || row[1] === 'VOLK' || row[0]?.toString().includes('VOLK')) {
            inVolk = true;
            continue;
        }

        if (inVolk) {
            if (row.includes('Модель') && row.includes('Факт')) {
                modelCol = row.indexOf('Модель');
                factCol = row.indexOf('Факт');
                continue;
            }

            if (modelCol !== -1 && factCol !== -1) {
                const model = row[modelCol]?.toString().trim();
                if (model === 'Итого') break;
                if (!model) continue;

                const factStr = row[factCol];
                if (factStr !== undefined && factStr !== null && factStr !== '') {
                    const qty = parseInt(factStr.toString(), 10);
                    if (!isNaN(qty) && qty > 0) {
                        expectedQty[model] = qty;
                    }
                }
            }
        }
    }

    const itemsToInsert = [];
    const productStockUpdates: Record<string, number> = {};

    for (const [m, qty] of Object.entries(expectedQty)) {
        // EXACT match checking
        let exact = volkDbProducts.find(p => p.name.includes(`${m} `) || p.name.includes(` ${m} `) || p.name.includes(` ${m}`));
        
        // Handle special cases
        if (!exact) exact = volkDbProducts.find(p => p.name.includes(m));
        
        if (m === 'VDGTLHM') exact = volkDbProducts.find(p => p.name.includes('VDGTLHM-BK'));
        if (m === 'VDGTLWF') exact = volkDbProducts.find(p => p.name.includes('VDGTLWF-BK'));

        if (!exact) continue;

        for (let i = 0; i < qty; i++) {
            itemsToInsert.push({
                productId: exact.id,
                organizationId: orgId,
                status: 'AVAILABLE',
                barcode: `AUTO-${exact.id.slice(-6)}-${Math.random().toString(36).substring(2,8).toUpperCase()}`,
                purchasePrice: exact.retailPrice || 0,
                notes: `Auto-imported VOLK`
            });
        }
        productStockUpdates[exact.id] = (productStockUpdates[exact.id] || 0) + qty;
    }

    await prisma.stockItem.createMany({ data: itemsToInsert });

    for (const [productId, qty] of Object.entries(productStockUpdates)) {
        await prisma.opticProduct.update({
            where: { id: productId },
            data: { currentStock: qty }
        });
    }

    console.log("VOLK FIX 2 COMPLETE!");
}
main();
