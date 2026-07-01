const fs = require('fs');
let code = fs.readFileSync('src/app/api/optic/finances/payroll/route.ts', 'utf8');

const target = `                        const hasFitting = sale.items?.some((item: any) => 
                            typeof item.name === 'string' && 
                            item.name.toLowerCase().includes('подбор') && item.name.toLowerCase().includes('ночн')
                        );`;

const replacement = `                        const hasFitting = sale.items?.some((item: any) => 
                            (typeof item.name === 'string' && item.name.toLowerCase().includes('подбор')) || 
                            item.category === 'service_fitting'
                        );`;

code = code.replace(target, replacement);
fs.writeFileSync('src/app/api/optic/finances/payroll/route.ts', code);
console.log("Valeria logic reverted successfully!");
