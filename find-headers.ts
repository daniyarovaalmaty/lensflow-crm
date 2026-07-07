import * as xlsx from 'xlsx';
async function main() {
    const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
    const wbStock = xlsx.readFile(warehouseFile, { raw: false });
    const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });

    for (let i = 160; i < 200; i++) {
        const row = rawStock[i];
        if (!row) continue;
        const vals = row.map((v, c) => v ? `[${c}] ${v}` : '').filter(v => v !== '').join(' | ');
        if (vals !== '') console.log(`Row ${i}: ${vals}`);
    }
}
main();
