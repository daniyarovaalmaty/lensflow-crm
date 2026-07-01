require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
    await client.connect();
    const res = await client.query(`
        SELECT s.id, s."createdAt", s."customerName", si.name as item_name, si.total as item_total,
               (SELECT type FROM appointments a 
                WHERE (a."patientId" = s."patientId" OR a."patientName" = s."customerName") 
                  AND a."doctorId" = 'cmm64iwmr0007jxu35ncgntbt'
                  AND a.date >= (s."createdAt" - interval '24 hours') 
                  AND a.date <= (s."createdAt" + interval '24 hours') 
                ORDER BY a.date DESC LIMIT 1) as appt_type
        FROM sales s
        JOIN sale_items si ON s.id = si."saleId"
        WHERE (s."doctorId" = 'cmm64iwmr0007jxu35ncgntbt' OR s."doctorId" IS NULL)
          AND si.name ILIKE '%консультация%'
          AND s."createdAt" >= '2026-06-01' AND s."createdAt" <= '2026-06-30 23:59:59'
    `);
    console.log(res.rows);
    await client.end();
}
run();
