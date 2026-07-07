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
    console.log("ALL Model columns:", cols);

    let currentModels: Record<number, string> = {};
    const expectedModelQty: Record<string, number> = {};

    for (let i = 1; i < rawStock.length; i++) {
        const row = rawStock[i];
        if (!row) continue;

        for (let c of cols) {
            const val = row[c];
            if (val && typeof val === 'string' && val.trim() !== '') {
                const v = val.trim();
                // Valid model name
                if (v !== 'NAME PRODUCT' && !v.startsWith('Всего') && v !== 'Итого' && v !== 'Модель') {
                    // Ignore obvious garbage
                    if (v === 'dioptry' || v === 'Факт' || v === 'Расход' || v === 'Приход' || v === 'На Диске' || v === 'ЧЕК' || v === 'Чек!') continue;
                    // Ignore numbers
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
                expectedModelQty[model] = (expectedModelQty[model] || 0) + qty;
            }
        }
    }

    let total = 0;
    for (const [m, q] of Object.entries(expectedModelQty)) {
        console.log(`Model: ${m}, Qty: ${q}`);
        total += q;
    }
    console.log(`GRAND TOTAL: ${total}`);
}
main();
