import * as xlsx from 'xlsx';
import prisma from './src/lib/db/prisma';

async function main() {
    console.log("Starting FINAL import...");
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
    const wbStock = xlsx.readFile(warehouseFile, { raw: false });
    const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });

    let modelCols = new Set<number>();
    for (let i = 0; i < rawStock.length; i++) {
        const row = rawStock[i];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
            const v = row[c]?.toString().trim();
            if (v === 'Модель' || v === 'NAME PRODUCT') {
                modelCols.add(c);
            }
        }
    }
    const cols = Array.from(modelCols).sort((a,b)=>a-b);
    
    let currentModels: Record<number, string> = {};
    const expectedModelQty: Record<string, { model: string, dioptry: string, qty: number }[]> = {};

    for (let i = 1; i < rawStock.length; i++) {
        const row = rawStock[i];
        if (!row) continue;

        for (let c of cols) {
            const val = row[c];
            if (val && typeof val === 'string' && val.trim() !== '') {
                const v = val.trim();
                if (v !== 'NAME PRODUCT' && !v.startsWith('Всего') && v !== 'Итого' && v !== 'Модель') {
                    if (v === 'dioptry' || v === 'Факт' || v === 'Расход' || v === 'Приход' || v === 'На Диске' || v === 'ЧЕК' || v === 'Чек!') continue;
                    if (!isNaN(parseInt(v, 10)) && parseInt(v, 10).toString() === v) continue;
                    currentModels[c] = v;
                }
            }

            const model = currentModels[c];
            if (!model) continue;

            const dioptryStr = row[c+1];
            if (!dioptryStr || dioptryStr.toString().trim() === '' || dioptryStr.toString().trim() === 'dioptry') continue;

            const factStr = row[c+5];
            let qty = 0;
            if (factStr) {
                qty = parseInt(factStr.toString().trim(), 10);
                if (isNaN(qty)) qty = 0;
            }

            if (qty > 0) {
                if (!expectedModelQty[model]) expectedModelQty[model] = [];
                expectedModelQty[model].push({ model, dioptry: dioptryStr.toString().trim(), qty });
            }
        }
    }

    const dbProducts = await prisma.opticProduct.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, purchasePrice: true }
    });

    function findDbProduct(excelName: string) {
        let exact = dbProducts.find(p => p.name.trim() === excelName.trim());
        if (exact) return exact;
        
        let c = excelName.trim().replace(/C/g, 'С').replace(/c/g, 'с'); 
        let exactCyr = dbProducts.find(p => p.name.trim() === c);
        if (exactCyr) return exactCyr;

        let n = excelName.trim();
        
        // Match T2, T3, T4, T5, T6
        if (n === 'Nanex NY1-SP') return dbProducts.find(p => p.name.includes('NY1-SP'));
        if (n === 'Vivinex XY1-SP') return dbProducts.find(p => p.name.includes('XY1-SP') && !p.name.includes('TORIC'));
        if (n === 'Vivinex XC1-SP') return dbProducts.find(p => p.name.includes('XC1-SP'));
        if (n.match(/^T[2-6]$/)) {
            return dbProducts.find(p => p.name.includes(`XY1A${n}-SP`));
        }
        
        if (n.includes('AJL VIsc 2%')) return dbProducts.find(p => p.name.includes('VISC 2%'));
        if (n.includes('AJL Visc 3%')) return dbProducts.find(p => p.name.includes('VISC 3%'));
        if (n.includes('AJL Cell 2%')) return dbProducts.find(p => p.name.includes('CELL 2%'));
        if (n.includes('V28LC')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('V78C-GN')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('V90C-SR')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('V90C')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('V78C')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VG3')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('V3MIRANF+')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('G-6MIRROR NF')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VIRID')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VDGTLWF-BK')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VDGTLWF-GD')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VDGTLWF-RD')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        if (n.includes('VSQUAD160')) return dbProducts.find(p => p.name.includes('VOLK MEDICAL'));
        
        let allVolk = dbProducts.filter(p => p.name.includes('VOLK MEDICAL'));
        for (let p of allVolk) {
            if (p.name.toUpperCase().includes(n.toUpperCase())) return p;
        }
        
        if (n === 'VDGTLHM') return dbProducts.find(p => p.name === 'VDGTLHM-BK');

        let includesMatch = dbProducts.find(p => p.name.toUpperCase().includes(n.toUpperCase()));
        if (includesMatch) return includesMatch;

        return null;
    }

    console.log("Deleting existing stock items...");
    await prisma.stockItem.deleteMany({ where: { organizationId: orgId } });
    console.log("Updating product currentStock to 0...");
    await prisma.opticProduct.updateMany({ where: { organizationId: orgId }, data: { currentStock: 0 } });

    console.log("Preparing new stock items...");
    const itemsToInsert = [];
    const productStockUpdates: Record<string, number> = {};

    let missing = [];
    for (const [m, items] of Object.entries(expectedModelQty)) {
        const dbProduct = findDbProduct(m);
        if (!dbProduct) {
            missing.push(m);
            continue;
        }

        for (const item of items) {
            for (let i = 0; i < item.qty; i++) {
                itemsToInsert.push({
                    productId: dbProduct.id,
                    organizationId: orgId,
                    status: 'AVAILABLE',
                    barcode: `AUTO-${dbProduct.id.slice(-6)}-${Math.random().toString(36).substring(2,8).toUpperCase()}`,
                    purchasePrice: dbProduct.purchasePrice,
                    notes: `dioptry: ${item.dioptry}`,
                });
            }
            productStockUpdates[dbProduct.id] = (productStockUpdates[dbProduct.id] || 0) + item.qty;
        }
    }
    
    console.log(`Could not find these ${missing.length} models from excel in DB:`, missing);

    console.log(`Inserting ${itemsToInsert.length} stock items in batches...`);
    
    const batchSize = 1000;
    for (let i = 0; i < itemsToInsert.length; i += batchSize) {
        const batch = itemsToInsert.slice(i, i + batchSize);
        await prisma.stockItem.createMany({ data: batch });
    }

    console.log("Updating product currentStock values...");
    for (const [productId, qty] of Object.entries(productStockUpdates)) {
        await prisma.opticProduct.update({
            where: { id: productId },
            data: { currentStock: qty }
        });
    }

    console.log("FINAL IMPORT COMPLETE!");
}
main();
