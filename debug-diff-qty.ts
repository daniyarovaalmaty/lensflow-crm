import prisma from './src/lib/db/prisma';
import * as xlsx from 'xlsx';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
    const wbStock = xlsx.readFile(warehouseFile, { raw: false });
    const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });
    
    let currentModel = "";
    const expectedModelQty: Record<string, number> = {};

    for (let i = 1; i < rawStock.length; i++) {
        const row = rawStock[i];
        if (!row || row.length < 2) continue;

        if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
            currentModel = row[0].trim();
        }
        if (currentModel.startsWith('Всего') || currentModel === 'NAME PRODUCT' || currentModel === 'Итого') continue;

        const dioptryStr = row[1];
        if (!dioptryStr || dioptryStr.toString().trim() === '' || dioptryStr === 'dioptry') continue;

        const factStr = row[5];
        let qty = 0;
        if (factStr) {
            qty = parseInt(factStr.toString().trim(), 10);
            if (isNaN(qty)) qty = 0;
        }

        if (qty > 0 && currentModel) {
            expectedModelQty[currentModel] = (expectedModelQty[currentModel] || 0) + qty;
        }
    }

    const dbProducts = await prisma.opticProduct.findMany({
        where: { organizationId: orgId },
        select: { name: true, currentStock: true }
    });
    
    // Some products in db might have slightly different names due to smart mapping. 
    // We should map Excel names to DB names.
    function findDbProduct(excelName: string) {
        let exact = dbProducts.find(p => p.name.trim() === excelName.trim());
        if (exact) return exact;
        
        let c = excelName.trim().replace(/C/g, 'С').replace(/c/g, 'с'); 
        let exactCyr = dbProducts.find(p => p.name.trim() === c);
        if (exactCyr) return exactCyr;

        if (excelName === 'VDGTLHM') {
            return dbProducts.find(p => p.name === 'VDGTLHM-BK');
        }

        return null; // Should not happen, we already created all missing
    }

    let diffCount = 0;
    for (const [excelName, expectedQty] of Object.entries(expectedModelQty)) {
        const dbProduct = findDbProduct(excelName);
        if (!dbProduct) {
            console.log(`Model not found in DB at all: ${excelName}`);
            continue;
        }
        
        if (dbProduct.currentStock !== expectedQty) {
            console.log(`DIFF for ${excelName}: Excel expects ${expectedQty}, DB has ${dbProduct.currentStock}. Difference: ${expectedQty - dbProduct.currentStock}`);
            diffCount++;
        }
    }
    
    if (diffCount === 0) {
        console.log("No differences found!");
    }
}
main();
