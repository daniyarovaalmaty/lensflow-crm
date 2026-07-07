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
    
    let expectedTotalQty = 0;
    
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
            expectedTotalQty += qty;
            expectedModelQty[currentModel] = (expectedModelQty[currentModel] || 0) + qty;
        }
    }
    
    const dbTotal = await prisma.stockItem.count({ where: { organizationId: orgId }});
    console.log(`Expected Total: ${expectedTotalQty}, DB Total: ${dbTotal}, Difference: ${expectedTotalQty - dbTotal}`);

    // Since the total DB count is 4027, the sum of p.currentStock should also be 4027.
    const dbProducts = await prisma.opticProduct.findMany({
        where: { organizationId: orgId },
        select: { name: true, currentStock: true }
    });
    let dbStockSum = 0;
    for (const p of dbProducts) dbStockSum += p.currentStock;
    console.log(`Sum of currentStock in DB: ${dbStockSum}`);

}
main();
