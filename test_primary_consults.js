require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
    await client.connect();
    const res = await client.query(`
        SELECT a.date, a."patientName", s.total as sale_total, si.name as item_name, si.total as item_total
        FROM appointments a
        LEFT JOIN sales s ON (s."patientId" = a."patientId" OR s."customerName" = a."patientName")
            AND s."createdAt" >= (a.date - interval '24 hours') AND s."createdAt" <= (a.date + interval '24 hours')
        LEFT JOIN sale_items si ON s.id = si."saleId" AND si.name ILIKE '%консультация%'
        WHERE a."doctorId" = 'cmm64iwmr0007jxu35ncgntbt'
          AND a.type ILIKE '%primary%'
          AND a.date >= '2026-06-01'
    `);
    console.log(res.rows);
    await client.end();
}
run();
