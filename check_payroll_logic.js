require('dotenv').config();
const fs = require('fs');
const content = fs.readFileSync('src/app/api/optic/finances/payroll/route.ts', 'utf8');
const lines = content.split('\n');
const start = lines.findIndex(l => l.includes('function calculatePayroll'));
console.log(lines.slice(Math.max(0, start - 5), start + 50).join('\n'));
