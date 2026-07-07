import * as xlsx from 'xlsx';

const catalogFile = "/Users/daniyarovaruslanovna/Downloads/матведомость на 19062026.xlsx";
const wbCat = xlsx.readFile(catalogFile, { raw: false });
const rawCat: any[][] = xlsx.utils.sheet_to_json(wbCat.Sheets[wbCat.SheetNames[0]], { header: 1 });

for (let i = 5; i < 15; i++) {
    console.log(`Row ${i}:`, rawCat[i]);
}
