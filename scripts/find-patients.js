const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // Find patients by name containing "Амангельдиева"
    console.log('=== PATIENTS WITH NAME "Амангельдиева" ===');
    const patientsRes = await client.query(`
      SELECT p.id, p.name, p.phone, p."organizationId",
             o.name as org_name,
             (SELECT COUNT(*) FROM sales s WHERE s."patientId" = p.id) as sale_count,
             (SELECT COUNT(*) FROM consultations c WHERE c."patientId" = p.id) as consultation_count,
             (SELECT COUNT(*) FROM prescriptions pr WHERE pr."patientId" = p.id) as prescription_count,
             p."createdAt"
      FROM patients p
      LEFT JOIN organizations o ON p."organizationId" = o.id
      WHERE p.name ILIKE '%Амангельдиева%' 
         OR p.name ILIKE '%Эльмира%Амангельдиева%'
         OR p.name ILIKE '%Амангельдиева%Эльмира%'
      ORDER BY p."createdAt"
    `);

    for (const p of patientsRes.rows) {
      console.log(`ID: ${p.id}`);
      console.log(`  Name: ${p.name}`);
      console.log(`  Phone: ${p.phone}`);
      console.log(`  Org: ${p.org_name} (${p.organizationId})`);
      console.log(`  Sales: ${p.sale_count}, Consultations: ${p.consultation_count}, Prescriptions: ${p.prescription_count}`);
      console.log(`  Created: ${p.createdAt}`);
      console.log('---');
    }

    // Find the specific sale
    console.log('\n=== SALE #S-ORG--0134 ===');
    const saleRes = await client.query(`
      SELECT s.id, s."saleNumber", s."patientId", s.total, s."paymentMethod", s."paymentStatus",
             s."customerName", s."customerPhone", s."createdAt", s."performedByName",
             s."organizationId",
             p.name as patient_name, p.phone as patient_phone
      FROM sales s
      LEFT JOIN patients p ON s."patientId" = p.id
      WHERE s."saleNumber" = 'S-ORG--0134'
    `);

    for (const s of saleRes.rows) {
      console.log(`Sale ID: ${s.id}`);
      console.log(`Sale Number: ${s.saleNumber}`);
      console.log(`Org ID: ${s.organizationId}`);
      console.log(`Patient ID: ${s.patientId}`);
      console.log(`Patient Name: ${s.patient_name}`);
      console.log(`Patient Phone: ${s.patient_phone}`);
      console.log(`Customer Name: ${s.customerName}`);
      console.log(`Customer Phone: ${s.customerPhone}`);
      console.log(`Total: ${s.total}`);
      console.log(`Payment: ${s.paymentMethod} / ${s.paymentStatus}`);
      console.log(`Performed by: ${s.performedByName}`);
      console.log(`Date: ${s.createdAt}`);
    }

    // Show sale items
    if (saleRes.rows.length > 0) {
      const itemsRes = await client.query(`
        SELECT si.id, si."productName", si.quantity, si.price, si.total
        FROM sale_items si
        WHERE si."saleId" = $1
      `, [saleRes.rows[0].id]);

      console.log(`\nItems:`);
      for (const item of itemsRes.rows) {
        console.log(`  - ${item.productName} x${item.quantity} = ${item.total}`);
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
