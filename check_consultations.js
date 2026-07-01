require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
    await client.connect();
    const res = await client.query(`
        SELECT DISTINCT si.name
        FROM sales s
        JOIN sale_items si ON s.id = si."saleId"
        WHERE s."doctorId" = 'cmm64iwmr0007jxu35ncgntbt'
          AND si.name ILIKE '%консультация%'
    `);
    console.log(res.rows);
    await client.end();
}
run();
