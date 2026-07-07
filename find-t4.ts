import * as xlsx from 'xlsx';
const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
const wbStock = xlsx.readFile(warehouseFile, { raw: false });
const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });

for (let r = 0; r < rawStock.length; r++) {
    const row = rawStock[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
        if (row[c] === 'T4' || row[c] === 'T5' || row[c] === 'T6' || row[c] === 'T7' || row[c] === 'T8' || row[c] === 'T9') {
            console.log(`Found ${row[c]} at row ${r}, column ${c}`);
        }
    }
}
