import prisma from './src/lib/db/prisma';
import * as xlsx from 'xlsx';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    console.log("=== 1. COUNTERPARTIES (Покупатели) ===");
    const clientsFile = "/Users/daniyarovaruslanovna/Downloads/Покупатели.xlsx";
    const wbClients = xlsx.readFile(clientsFile, { raw: false });
    const sheetClients = wbClients.Sheets[wbClients.SheetNames[0]];
    const rawClients: any[][] = xlsx.utils.sheet_to_json(sheetClients, { header: 1 });
    
    let excelClients = new Set<string>();
    for (let i = 0; i < rawClients.length; i++) {
        const row = rawClients[i];
        if (!row || row.length < 2) continue;
        const name = row[1];
        if (typeof name === 'string' && name.trim() !== '' && name !== 'Покупатель') {
            excelClients.add(name.trim());
        }
    }

    const dbClients = await prisma.organization.findMany({
        where: { defaultLabId: orgId, type: 'standalone' },
        select: { name: true }
    });
    const dbClientNames = new Set(dbClients.map(c => c.name));

    let missingClients = [];
    for (const c of excelClients) {
        if (!dbClientNames.has(c)) {
            missingClients.push(c);
        }
    }
    
    let extraClients = [];
    for (const c of dbClientNames) {
        if (!excelClients.has(c)) {
            extraClients.push(c);
        }
    }

    console.log(`Excel has ${excelClients.size} unique clients. DB has ${dbClientNames.size} clients.`);
    console.log(`Missing in DB: ${missingClients.length > 0 ? missingClients.join(', ') : 'None'}`);
    console.log(`Extra in DB (possible duplicates/mismatch): ${extraClients.length > 0 ? extraClients.join(', ') : 'None'}`);
    
    // Check for duplicates in DB
    const dbClientList = dbClients.map(c => c.name);
    const duplicates = dbClientList.filter((item, index) => dbClientList.indexOf(item) !== index);
    console.log(`Duplicates in DB: ${duplicates.length > 0 ? duplicates.join(', ') : 'None'}`);


    console.log("\n=== 2. CATALOG (Матведомость) ===");
    const catalogFile = "/Users/daniyarovaruslanovna/Downloads/матведомость на 19062026.xlsx";
    const wbCat = xlsx.readFile(catalogFile, { raw: false });
    const sheetCat = wbCat.Sheets[wbCat.SheetNames[0]];
    const rawCat: any[][] = xlsx.utils.sheet_to_json(sheetCat, { header: 1 });

    let excelProducts = new Set<string>();
    for (let i = 0; i < rawCat.length; i++) {
        const row = rawCat[i];
        if (!row || row.length === 0) continue;
        const name = row[1];
        if (typeof name === 'string' && name !== 'Номенклатура') {
            excelProducts.add(name.trim());
        }
    }

    const dbProducts = await prisma.opticProduct.findMany({
        where: { organizationId: orgId },
        select: { name: true, category: true, purchasePrice: true }
    });
    const dbProductNames = new Set(dbProducts.map(p => p.name));

    let extraProducts = []; // products in DB but NOT in catalog (e.g. ones I added from stock)
    for (const p of dbProductNames) {
        if (!excelProducts.has(p)) {
            extraProducts.push(p);
        }
    }

    let missingProducts = [];
    for (const p of excelProducts) {
        if (!dbProductNames.has(p)) {
            missingProducts.push(p);
        }
    }

    console.log(`Excel catalog has ${excelProducts.size} products. DB has ${dbProductNames.size} products.`);
    console.log(`Missing from DB (were in catalog but not imported): ${missingProducts.length}`);
    if (missingProducts.length > 0) console.log(missingProducts);
    console.log(`Extra in DB (not in catalog, probably added from stock report): ${extraProducts.length}`);
    if (extraProducts.length > 0) console.log(extraProducts);


    console.log("\n=== 3. CATEGORIES ===");
    const categoryCounts: Record<string, number> = {};
    for (const p of dbProducts) {
        categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    }
    for (const [cat, count] of Object.entries(categoryCounts)) {
        console.log(`Category '${cat}': ${count} products`);
    }

}
main();
