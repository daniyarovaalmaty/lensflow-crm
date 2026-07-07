import * as xlsx from 'xlsx';
const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
const wbStock = xlsx.readFile(warehouseFile, { raw: false });
const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });

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
const cols = Array.from(modelCols).sort((a,b)=>a-b);
console.log("Model columns:", cols);

let currentModels: Record<number, string> = {};
const modelsByCol: Record<number, Set<string>> = {};
cols.forEach(c => modelsByCol[c] = new Set());

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
                if (v === 'dioptry' || v === 'Факт' || v === 'Расход' || v === 'Приход' || v === 'На Диске' || v === 'ЧЕК') continue;
                // Ignore numbers
                if (!isNaN(parseInt(v, 10)) && parseInt(v, 10).toString() === v) continue;
                
                currentModels[c] = v;
                modelsByCol[c].add(v);
            }
        }
    }
}

for (const c of cols) {
    console.log(`Column ${c} models:`, Array.from(modelsByCol[c]));
}
