require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
    await client.connect();
    const res = await client.query(`
        SELECT s.total as sale_total, s."invoiceData", si."unitPrice", si.quantity, si.total as item_total
        FROM sales s
        JOIN sale_items si ON s.id = si."saleId"
        WHERE s."customerName" ILIKE '%Мацковские%'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
}
run();
