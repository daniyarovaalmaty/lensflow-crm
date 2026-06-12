const xlsx = require('xlsx');

const workbook = xlsx.readFile('/Users/daniyarovaruslanovna/Downloads/Календарь записи.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

let allStrings = [];
data.forEach(row => {
    row.forEach(cell => {
        if (typeof cell === 'string' && cell.trim().length > 5) {
            allStrings.push(cell.replace(/\n/g, ' '));
        }
    });
});

console.log("Total non-empty string cells:", allStrings.length);
console.log("Sample of 20 cells:");
allStrings.slice(0, 20).forEach(str => console.log("-", str));
