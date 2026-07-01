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
    
    console.table(res.rows);
  } finally {
    client.end();
  }
});
