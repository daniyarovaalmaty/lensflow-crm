import * as xlsx from 'xlsx';
const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
const wbStock = xlsx.readFile(warehouseFile, { raw: false });
const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });

for (let r = 0; r < 5; r++) {
    const row = rawStock[r];
    if (!row) continue;
    let out = [];
    for (let c = 0; c < row.length; c++) {
        if (row[c] !== undefined && row[c] !== '') {
            out.push(`[${c}]=${row[c]}`);
        }
    }
    console.log(`Row ${r}:`, out.join(', '));
}
