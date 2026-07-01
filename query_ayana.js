require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();
    const res = await client.query(`
        SELECT s.id, s."createdAt", s."customerName", s.total, s.discount, s."paymentMethod", s."invoiceData"
        FROM sales s
        JOIN sale_items si ON s.id = si."saleId"
        WHERE s."doctorId" = 'cmm64iwmr0007jxu35ncgntbt'
          AND si.name ILIKE '%подбор%' AND si.name ILIKE '%ночн%'
        ORDER BY s."createdAt" ASC
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
}
run();
