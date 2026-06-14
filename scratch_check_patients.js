const XLSX = require('xlsx');

function countRows() {
    const filepath = '/Users/daniyarovaruslanovna/Downloads/Календарь записи.xlsx';
    console.log(`Reading ${filepath}...`);
    try {
        const workbook = XLSX.readFile(filepath);
        const incomingSheet = workbook.Sheets['пришедшие'];
        if (incomingSheet) {
            const data = XLSX.utils.sheet_to_json(incomingSheet, { header: 1 });
            console.log(`Rows in 'пришедшие': ${data.length}`);
            
            let validRows = 0;
            for (let i = 2; i < data.length; i++) {
                const row = data[i];
                if (row && row.length >= 3 && row[2] && typeof row[2] === 'string' && row[2].trim().length > 0) {
                    validRows++;
                }
            }
            console.log(`Valid patient rows: ${validRows}`);
        } else {
            console.log(`Sheet 'пришедшие' not found.`);
        }
    } catch(e) {
        console.error(e.message);
    }
}

countRows();
