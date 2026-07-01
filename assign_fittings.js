require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query(`
      SELECT 
        s.id as "saleId",
        s.total,
        s."customerName",
        s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Almaty' as d,
        si.name as "itemName",
        si.total as "itemTotal",
        s."doctorId"
      FROM sales s
      JOIN sale_items si ON s.id = si."saleId"
      WHERE si.name ILIKE '%ночн%' AND si.name ILIKE '%подбор%'
      ORDER BY s."createdAt" ASC
    `);
    
    let saleIds = res.rows.map(r => r.saleId);
    
    // Assign to Aigerim
    const updateRes = await client.query(`
      UPDATE sales 
      SET "doctorId" = 'cmm64iwmr0007jxu35ncgntbt'
      WHERE id = ANY($1::text[])
    `, [saleIds]);
    
    console.log(`Updated ${updateRes.rowCount} sales to doctor Aigerim.`);
    
    // Format the list
    let list = res.rows.map((r, i) => {
        let date = r.d.toISOString().split('T')[0];
        let name = r.customerName || 'Без имени';
        return `${i+1}. **${name}** (${date}) — ${r.itemName} | Оплачено по чеку: **${r.total} ₸**`;
    }).join('\n');
    
    const fs = require('fs');
    fs.writeFileSync('/Users/daniyarovaruslanovna/.gemini/antigravity/brain/ba8828ab-d477-4dc6-8081-f8fcdf475d62/artifacts/aigerim_fittings.md', '# Список всех подборов ночных линз (Шораева Айгерим)\n\n' + list);
    
  } finally {
    client.end();
  }
});
