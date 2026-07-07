import * as xlsx from 'xlsx';
import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const catalogFile = "/Users/daniyarovaruslanovna/Downloads/Матведомость на 20112025.xlsx";
    const wb = xlsx.readFile(catalogFile, { raw: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const dbProducts = await prisma.opticProduct.findMany({
        where: { organizationId: orgId }
    });

    let mismatchCount = 0;

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[0]) continue;

        const name = row[0].toString().trim();
        const priceStr = row[2]; // учетная цена

        let price = 0;
        if (priceStr && typeof priceStr === 'number') {
            price = priceStr;
        } else if (priceStr && typeof priceStr === 'string') {
            const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) price = num;
        }
        if (price === 1330) price = 0; // The user's instruction

        const dbProd = dbProducts.find(p => p.name.trim() === name);
        if (dbProd) {
            if (dbProd.purchasePrice !== price) {
                console.log(`Mismatch for "${name}": Excel says ${price}, DB says ${dbProd.purchasePrice}`);
                mismatchCount++;
            }
        }
    }

    console.log(`Total mismatches: ${mismatchCount}`);
}
main();
