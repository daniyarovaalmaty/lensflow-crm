const fs = require('fs');
let code = fs.readFileSync('src/app/api/optic/finances/payroll/route.ts', 'utf8');

// The block where hasFitting is calculated
const target = `                    const hasFitting = sale.items.some((item: any) => 
                        (typeof item.name === 'string' && item.name.toLowerCase().includes('подбор') && item.name.toLowerCase().includes('ночн')) || 
                        item.category === 'service_fitting'
                    );`;

const replacement = `                    const hasFitting = sale.items.some((item: any) => {
                        const isFittingByName = typeof item.name === 'string' && item.name.toLowerCase().includes('подбор');
                        const isFittingByCategory = item.category === 'service_fitting';
                        if (!isFittingByName && !isFittingByCategory) return false;
                        
                        // For Aigerim, ONLY count night lenses!
                        const aigerim = staff.find(s => s.fullName?.includes('Айгерим'));
                        if (aigerim && assignedDoctorId === aigerim.id) {
                            return typeof item.name === 'string' && item.name.toLowerCase().includes('ночн');
                        }
                        return true;
                    });`;

code = code.replace(target, replacement);

const target2 = `                const fittingItems = s.items?.filter((item: any) => 
                    (typeof item.name === 'string' && item.name.toLowerCase().includes('подбор') && item.name.toLowerCase().includes('ночн')) || 
                    item.category === 'service_fitting'
                ) || [];`;

const replacement2 = `                const fittingItems = s.items?.filter((item: any) => {
                    const isFittingByName = typeof item.name === 'string' && item.name.toLowerCase().includes('подбор');
                    const isFittingByCategory = item.category === 'service_fitting';
                    if (!isFittingByName && !isFittingByCategory) return false;
                    
                    const aigerim = staff.find(s => s.fullName?.includes('Айгерим'));
                    if (aigerim && st.id === aigerim.id) {
                        return typeof item.name === 'string' && item.name.toLowerCase().includes('ночн');
                    }
                    return true;
                }) || [];`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/app/api/optic/finances/payroll/route.ts', code);
console.log("Replaced successfully!");
