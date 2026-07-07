import * as xlsx from 'xlsx';

const catalogFile = "/Users/daniyarovaruslanovna/Downloads/матведомость на 19062026.xlsx";
const wb = xlsx.readFile(catalogFile, { raw: false });
const rawData: any[][] = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

const queries = ['Silicone', 'Glautex', 'Ribocross', 'V40', 'V78'];

for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;
    const name = row[1];
    if (typeof name !== 'string') continue;

    for (const q of queries) {
        if (name.toLowerCase().includes(q.toLowerCase())) {
            console.log(`Found in catalog: ${name}`);
        }
    }
}
