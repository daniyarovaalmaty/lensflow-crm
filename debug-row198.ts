import * as xlsx from 'xlsx';
const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
const wbStock = xlsx.readFile(warehouseFile, { raw: false });
const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });
for (let i = 195; i <= 205; i++) {
    console.log(`Row ${i}:`, rawStock[i]);
}
