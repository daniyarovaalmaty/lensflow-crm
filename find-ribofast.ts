import * as xlsx from 'xlsx';
async function main() {
    const warehouseFile = "/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026 (1).xlsx";
    const wbStock = xlsx.readFile(warehouseFile, { raw: false });
    const rawStock: any[][] = xlsx.utils.sheet_to_json(wbStock.Sheets["Отчеты"], { header: 1 });

    for (let i = 0; i < rawStock.length; i++) {
        const row = rawStock[i];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
            const v = row[c]?.toString().trim();
            if (v && v.toUpperCase().includes('RIBOFAST')) {
                console.log(`Row ${i}, Col ${c}: ${v}`);
                console.log(`Headers row 1: Col ${c} = ${rawStock[1][c]}, Col ${c-1} = ${rawStock[1][c-1]}, Col ${c-2} = ${rawStock[1][c-2]}`);
            }
            if (v && v.toUpperCase().includes('OCULFIT')) {
                console.log(`Row ${i}, Col ${c}: ${v}`);
            }
        }
    }
}
main();
