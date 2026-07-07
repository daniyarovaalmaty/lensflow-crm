import prisma from './src/lib/db/prisma';
import * as xlsx from 'xlsx';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    // === 1. VERIFY PRICES ===
    console.log("=== VERIFYING PRICES ===");
    const catalogFile = "/Users/daniyarovaruslanovna/Downloads/матведомость на 19062026.xlsx";
    const wbCat = xlsx.readFile(catalogFile, { raw: false });
    const rawCat: any[][] = xlsx.utils.sheet_to_json(wbCat.Sheets[wbCat.SheetNames[0]], { header: 1 });
    
    let priceMismatches = 0;
    for (let i = 0; i < rawCat.length; i++) {
        const row = rawCat[i];
        if (!row || row.length === 0) continue;
        const name = row[1];
        if (typeof name !== 'string' || name === 'Номенклатура' || name.trim() === '') continue;
        
        let expectedPrice = 0;
        const priceStr = row[5]; // Учетная цена
        if (priceStr !== undefined && priceStr !== null) {
            expectedPrice = parseInt(priceStr.toString().replace(/\s/g, ''), 10);
            if (isNaN(expectedPrice)) expectedPrice = 0;
        }

        const product = await prisma.opticProduct.findFirst({
            where: { organizationId: orgId, name: name.trim() }
        });

        if (product) {
            if (product.purchasePrice !== expectedPrice) {
                console.log(`❌ Price mismatch for '${name}': Expected ${expectedPrice}, got ${product.purchasePrice}`);
                priceMismatches++;
            }
        }
    }
    
    // Also check the 6 missing products I added manually
    const missingModels = [
        'AJL Silicone Oil  S5000',
        'AJL Silicone Oil S1000',
        'Glautex TDA',
        'Ribocross Te 10% dextran',
        'V40LC',
        'VDGTLHM-BK'
    ];
    for (const m of missingModels) {
        const product = await prisma.opticProduct.findFirst({
            where: { organizationId: orgId, name: m }
        });
        if (product && product.purchasePrice !== 0) {
            console.log(`❌ Price mismatch for manual product '${m}': Expected 0, got ${product.purchasePrice}`);
            priceMismatches++;
        }
    }

    if (priceMismatches === 0) {
        console.log("✅ All prices match the catalog exactly! (And missing ones are 0)");
    } else {
        console.log(`Found ${priceMismatches} price mismatches.`);
    }

    // === 2. VERIFY QUANTITIES ===
    console.log("\n=== VERIFYING QUANTITIES ===");
    const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
    const wbStock = xlsx.readFile(warehouseFile, { raw: false });
    const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });
    
    let expectedTotalQty = 0;
    let currentModel = "";
    
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
        }
    }

    const dbStockCount = await prisma.stockItem.count({
        where: { organizationId: orgId }
    });

    console.log(`Total expected quantity from file: ${expectedTotalQty}`);
    console.log(`Total actual quantity in database: ${dbStockCount}`);
    
    if (expectedTotalQty === dbStockCount) {
        console.log("✅ Quantities match perfectly!");
    } else {
        console.log("❌ Quantities DO NOT match!");
    }
}
main();
