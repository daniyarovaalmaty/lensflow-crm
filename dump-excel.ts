import * as xlsx from 'xlsx';
async function main() {
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
    let targetCol = -1;
    for (let i = 1; i < 50; i++) {
        for (let c of cols) {
            if (rawStock[i] && rawStock[i][c] && rawStock[i][c].toString().trim() === 'iSert 151') {
                targetCol = c;
                break;
            }
        }
        if (targetCol !== -1) break;
    }

    console.log(`Target column for iSert 151 is ${targetCol}`);
    if (targetCol === -1) return;

    for (let i = 140; i <= 165; i++) {
        const row = rawStock[i];
        if (!row) continue;
        console.log(`Row ${i}: Col ${targetCol}=${row[targetCol]}, Col ${targetCol+1}=${row[targetCol+1]}, Col ${targetCol+5}=${row[targetCol+5]}`);
    }
}
main();
