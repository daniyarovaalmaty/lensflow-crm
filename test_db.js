require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();
    const res = await client.query(`
        SELECT s.id, si.name, si.category
        FROM sales s
        JOIN sale_items si ON s.id = si."saleId"
        WHERE s."doctorId" = 'cmm64iwmr0007jxu35ncgntbt'
    `);
    
    let fittingsCount = 0;
    const aigerimSales = {};
    for (let r of res.rows) {
        if (!aigerimSales[r.id]) aigerimSales[r.id] = [];
        aigerimSales[r.id].push(r);
    }
    
    for (let saleId in aigerimSales) {
        const items = aigerimSales[saleId];
        const hasFitting = items.some(item => {
            const isFittingByName = typeof item.name === 'string' && item.name.toLowerCase().includes('подбор');
            const isFittingByCategory = item.category === 'service_fitting';
            if (!isFittingByName && !isFittingByCategory) return false;
            
            // For Aigerim, ONLY count night lenses!
            return typeof item.name === 'string' && item.name.toLowerCase().includes('ночн');
        });
        if (hasFitting) fittingsCount++;
    }
    
    console.log("Fittings for Aigerim with new logic: " + fittingsCount);
    await client.end();
}
run();
