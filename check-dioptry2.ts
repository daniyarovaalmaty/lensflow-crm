import * as xlsx from 'xlsx';
const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
const wbStock = xlsx.readFile(warehouseFile, { raw: false });
const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });
for (let i = 1; i < rawStock.length; i++) {
    const row = rawStock[i];
    if (row[0]?.toString().trim() === 'dioptry' || row[1]?.toString().trim() === 'dioptry') {
        console.log(`Row ${i}: col0=${row[0]}, col1=${row[1]}, qty=${row[5]}`);
    }
}
