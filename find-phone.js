const XLSX = require('xlsx');
const fs = require('fs');

const dir = '/Users/daniyarovaruslanovna/Downloads/New EYE пациенты/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx')).slice(0, 5);

for (const f of files) {
    const workbook = XLSX.readFile(dir + f);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let phone = null;
    json.forEach((row, i) => {
        row.forEach((cell, j) => {
            if (typeof cell === 'string' && (cell.includes('+7') || cell.includes('870') || cell.includes('770'))) {
                phone = cell;
            }
        });
    });
    console.log(f, ':', phone);
}
