require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
    await client.connect();
    const res = await client.query(`
        SELECT a.date, a."patientName", a.type
        FROM appointments a
        WHERE a."doctorId" = 'cmm64iwmr0007jxu35ncgntbt'
          AND a.type ILIKE '%primary%'
          AND a.date >= '2026-06-01'
    `);
    
    const salesRes = await client.query(`
        SELECT s.id, s."createdAt", s."customerName", s.total, si.name as item_name, si.total as item_total
        FROM sales s
        JOIN sale_items si ON s.id = si."saleId"
        WHERE si.name ILIKE '%консультация%'
          AND s."createdAt" >= '2026-06-01' AND s."createdAt" <= '2026-06-30 23:59:59'
    `);
    
    let matched = [];
    for (let appt of res.rows) {
        let apptName = appt.patientName.toLowerCase().trim();
        let match = salesRes.rows.find(s => {
            let saleName = (s.customerName || '').toLowerCase().trim();
            if (!saleName) return false;
            // check for fuzzy match
            const aParts = apptName.split(' ').filter(p => p.length >= 3);
            const sParts = saleName.split(' ').filter(p => p.length >= 3);
            if (aParts.length > 0 && sParts.length > 0) {
                return aParts.some(ap => sParts.some(sp => ap.includes(sp) || sp.includes(ap)));
            }
            return apptName.includes(saleName) || saleName.includes(apptName);
        });
        if (match) {
            matched.push({ apptName, date: appt.date, saleTotal: match.item_total });
        }
    }
    console.log("Matched:", matched.length, "out of", res.rows.length);
    console.log(matched);
    await client.end();
}
run();
