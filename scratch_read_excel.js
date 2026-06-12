const xlsx = require('xlsx');

const workbook = xlsx.readFile('/Users/daniyarovaruslanovna/Downloads/Календарь записи.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Analyzing Календарь записи...");
let recordsWithNumbers = [];
data.forEach((row, rowIndex) => {
    let hasString = false;
    let hasNumber = false;
    let textContent = '';
    let numberContent = [];
    
    row.forEach(cell => {
        if (typeof cell === 'string' && cell.trim().length > 5) {
            hasString = true;
            textContent += cell + ' | ';
        } else if (typeof cell === 'number' && cell > 100) {
            // Exclude small numbers that could be times (0.375) or ages
            // Exclude excel dates (around 45000)
            if (cell < 44000 || cell > 46000) {
               hasNumber = true;
               numberContent.push(cell);
            }
        }
    });

    if (hasString && hasNumber) {
        recordsWithNumbers.push({ row: rowIndex, text: textContent, numbers: numberContent });
    }
});

console.log(`Found ${recordsWithNumbers.length} rows with both text and large numbers (>100).`);
recordsWithNumbers.slice(0, 10).forEach(r => {
    console.log(`Row ${r.row}: text=${r.text.substring(0, 50)}... nums=${JSON.stringify(r.numbers)}`);
});
