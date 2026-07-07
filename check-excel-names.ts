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
    const modelsFound = new Set<string>();

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

            const factStr = row[c+5]; // Note: for main tables it is c+5
            let qty = 0;
            if (factStr) {
                qty = parseInt(factStr.toString().trim(), 10);
                if (isNaN(qty)) qty = 0;
            }

            if (qty > 0) {
                modelsFound.add(model);
            }
        }
    }
    
    // Now let's check for these models if they match MULTIPLE products in DB!
    const dbProducts = await prisma.opticProduct.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, retailPrice: true }
    });

    for (const m of Array.from(modelsFound)) {
        if (m.includes('VOLK')) continue; // already fixed
        if (m.includes('VISC') || m.includes('Cell')) continue; // already fixed

        let matches = dbProducts.filter(p => p.name.toUpperCase().includes(m.toUpperCase()));
        if (matches.length > 1) {
            console.log(`Model '${m}' matched ${matches.length} DB products:`);
            for (const match of matches) {
                console.log(`  - [${match.retailPrice}₸] ${match.name}`);
            }
        }
    }
}
main();
