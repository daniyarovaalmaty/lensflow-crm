import prisma from './src/lib/db/prisma';
import * as xlsx from 'xlsx';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
    const wb = xlsx.readFile(warehouseFile, { raw: false });
    const sheet = wb.Sheets["Отчеты"];
    if (!sheet) return;

    const rawData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let currentModel = "";
    
    let expectedQuantities = new Map<string, number>();
    
    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 2) continue;

        if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
            currentModel = row[0].trim();
        }
        if (currentModel.startsWith('Всего')) continue;

        const dioptryStr = row[1];
        if (!dioptryStr || dioptryStr.toString().trim() === '') continue;

        const factStr = row[5];
        let qty = 0;
        if (factStr) {
            qty = parseInt(factStr.toString().trim(), 10);
            if (isNaN(qty)) qty = 0;
        }

        if (qty > 0 && currentModel) {
            const currentTotal = expectedQuantities.get(currentModel) || 0;
            expectedQuantities.set(currentModel, currentTotal + qty);
        }
    }

    console.log(`Found ${expectedQuantities.size} distinct models in the Excel file.`);

    // Check matching in DB
    let totalMissing = 0;
    for (const [model, expectedQty] of expectedQuantities.entries()) {
        const products = await prisma.opticProduct.findMany({
            where: {
                organizationId: orgId,
                name: { contains: model, mode: 'insensitive' }
            }
        });

        if (products.length === 0) {
            console.log(`❌ NO MATCH: '${model}' (Expected Qty: ${expectedQty})`);
            totalMissing += expectedQty;
        } else if (products.length > 1) {
            console.log(`⚠️ MULTIPLE MATCHES (${products.length}) for '${model}'. We used: '${products[0].name}'`);
        } else {
            // Check actual DB quantity vs expected
            const dbQty = products[0].currentStock;
            if (dbQty !== expectedQty) {
                console.log(`⚠️ MISMATCH for '${model}': Excel has ${expectedQty}, DB has ${dbQty}. Matched Product: '${products[0].name}'`);
            }
        }
    }
    
    console.log(`Total missing items due to no-match: ${totalMissing}`);
}
main();
