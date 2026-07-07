import * as xlsx from 'xlsx';

const catalogFile = "/Users/daniyarovaruslanovna/Downloads/матведомость на 19062026.xlsx";
const wbCat = xlsx.readFile(catalogFile, { raw: false });
const rawCat: any[][] = xlsx.utils.sheet_to_json(wbCat.Sheets[wbCat.SheetNames[0]], { header: 1 });

console.log("Header row:", rawCat[0]);
console.log("First data row:", rawCat[1]);
console.log("Second data row:", rawCat[2]);
