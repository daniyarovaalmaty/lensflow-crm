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
    
    // Fetch ALL products into memory for O(1) lookup
    const allProducts = await prisma.opticProduct.findMany({
        where: { organizationId: orgId },
        select: { name: true, purchasePrice: true }
    });
    const productMap = new Map(allProducts.map(p => [p.name, p.purchasePrice]));

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
        const priceStr = row[6]; // Учетная цена is at index 6!
        if (priceStr !== undefined && priceStr !== null) {
            expectedPrice = parseInt(priceStr.toString().replace(/\s/g, ''), 10);
            if (isNaN(expectedPrice)) expectedPrice = 0;
        }

        const dbPrice = productMap.get(name.trim());
        if (dbPrice !== undefined) {
            if (dbPrice !== expectedPrice) {
                console.log(`❌ Price mismatch for '${name}': Expected ${expectedPrice}, got ${dbPrice}`);
                priceMismatches++;
            }
        } else {
            console.log(`⚠️ Product not found in DB: ${name}`);
        }
    }
    
    if (priceMismatches === 0) {
        console.log("✅ All prices match the catalog exactly!");
    } else {
        console.log(`Found ${priceMismatches} price mismatches.`);
    }

}
main();
