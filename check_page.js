const fs = require('fs');
console.log(fs.readFileSync('src/app/optic/finances/payroll/page.tsx', 'utf8').substring(0, 500));
