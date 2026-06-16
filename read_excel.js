const XLSX = require('xlsx');
const workbook = XLSX.readFile('invoice_template.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log(JSON.stringify(json, null, 2));
