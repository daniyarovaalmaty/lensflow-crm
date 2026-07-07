import * as xlsx from 'xlsx';
const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
const wbStock = xlsx.readFile(warehouseFile, { raw: false });
const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });

let currentModels: Record<number, string> = {};
const expectedModelQty: Record<string, number> = {};

for (let i = 1; i < rawStock.length; i++) {
    const row = rawStock[i];
    if (!row) continue;

    for (let c = 0; c < row.length; c++) {
        // Look for model names
        const val = row[c];
        if (typeof val === 'string' && val.trim() !== '') {
            const v = val.trim();
            // It could be a model name if it's in a column that could be the start of a table.
            // Usually table starts have "dioptry" in c+1 in the header, but model name might be on the next row.
            // Let's just say if it's not a known header keyword, and it's not a number, it might be a model.
            // But we know 'dioptry' is always at c+1 for valid data rows.
            
            if (v !== 'NAME PRODUCT' && !v.startsWith('Всего') && v !== 'Итого' && v !== 'Модель' && v !== 'dioptry' && v !== 'Приход' && v !== 'Расход' && v !== 'Факт' && v !== 'На Диске' && v !== 'На диске' && v !== 'Чек!' && v !== 'ЧЕК' && v !== '46023' && v !== 'Всего по диоптриям') {
                // To be safe, a model name usually appears in column C where C+1 is 'dioptry' in the header, or C+5 is 'Факт' in the header.
                // Let's just assume any string that is not a known header could be a model name, IF it's followed by valid dioptry data later.
                // Actually, let's just update currentModels[c] = v.
                
                // wait, sometimes there are strings like '25/150' in the dioptry column. We shouldn't treat dioptry column as model column!
                // The model column is always C such that C is 0, 8, 17, 25, 36, 45...
                // But let's identify model columns dynamically: they are columns where row 4 has "Модель" or "NAME PRODUCT".
            }
        }
    }
}

// Better approach: Find all model columns from row 4 or row 6 (or wherever the headers are).
// Actually, let's scan ALL rows for 'Модель' or 'NAME PRODUCT'.
let modelCols = new Set<number>();
for (let i = 0; i < 20; i++) {
    const row = rawStock[i];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
        const v = row[c]?.toString().trim();
        if (v === 'Модель' || v === 'NAME PRODUCT') {
            modelCols.add(c);
        }
    }
}
console.log("Found model columns at indices:", Array.from(modelCols));

for (let i = 1; i < rawStock.length; i++) {
    const row = rawStock[i];
    if (!row) continue;

    for (let c of Array.from(modelCols)) {
        const val = row[c];
        if (val && typeof val === 'string' && val.trim() !== '') {
            const v = val.trim();
            if (v !== 'NAME PRODUCT' && !v.startsWith('Всего') && v !== 'Итого' && v !== 'Модель') {
                currentModels[c] = v;
            }
        }

        const model = currentModels[c];
        if (!model) continue;

        const dioptryStr = row[c+1];
        if (!dioptryStr || dioptryStr.toString().trim() === '' || dioptryStr === 'dioptry') continue;

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
