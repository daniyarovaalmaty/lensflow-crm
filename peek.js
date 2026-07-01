const XLSX = require('xlsx');
const fs = require('fs');

const file = '/Users/daniyarovaruslanovna/Downloads/New EYE пациенты/Абдихан Айдана.xlsx';
const workbook = XLSX.readFile(file);
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log(json.slice(0, 10)); // print first 10 rows
