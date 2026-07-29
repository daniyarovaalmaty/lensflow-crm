const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // 1. Find both patients
    console.log('=== ALL "Дарап Дарын" PATIENTS IN NEW EYE ===');
    const patientsRes = await client.query(`
      SELECT p.id, p.name, p.phone, p."organizationId", p."birthDate", p.gender,
             p."isChild", p."parentName", p."parentPhone", p."parentId", p."doctorId", 
             p."externalId", p."externalSource", p.notes, p."createdAt"
      FROM patients p
      WHERE p.name ILIKE '%Дарап%' AND p."organizationId" = 'org-demo-neweye'
      ORDER BY p."createdAt"
    `);

    for (const p of patientsRes.rows) {
      console.log(`\n--- PATIENT ---`);
      console.log(`ID: ${p.id}`);
      console.log(`  Name: ${p.name}`);
      console.log(`  Phone: ${p.phone}`);
      console.log(`  BirthDate: ${p.birthDate}`);
      console.log(`  Gender: ${p.gender}`);
      console.log(`  IsChild: ${p.isChild}`);
      console.log(`  ParentName: ${p.parentName}`);
      console.log(`  ParentPhone: ${p.parentPhone}`);
      console.log(`  ParentId: ${p.parentId}`);
      console.log(`  DoctorId: ${p.doctorId}`);
      console.log(`  ExternalId: ${p.externalId}`);
      console.log(`  Notes: ${p.notes}`);
      console.log(`  Created: ${p.createdAt}`);

      // Count related
      const sales = await client.query(`SELECT id, "saleNumber", total, "paymentStatus", "customerName" FROM sales WHERE "patientId" = $1`, [p.id]);
      const orders = await client.query(`SELECT id, "orderNumber", status, "totalPrice", "isUrgent" FROM orders WHERE "patientId" = $1`, [p.id]);
      const consults = await client.query(`SELECT id, "visitDate" FROM consultations WHERE "patientId" = $1`, [p.id]);
      const prescripts = await client.query(`SELECT id, "createdAt" FROM prescriptions WHERE "patientId" = $1`, [p.id]);
      const appts = await client.query(`SELECT id, "createdAt" FROM appointments WHERE "patientId" = $1`, [p.id]);
      const children = await client.query(`SELECT id, name, phone FROM patients WHERE "parentId" = $1`, [p.id]);

      console.log(`\n  SALES (${sales.rows.length}):`);
      for (const s of sales.rows) console.log(`    ${s.saleNumber} | ${s.total} ₸ | ${s.paymentStatus} | customer: ${s.customerName}`);
      
      console.log(`  ORDERS (${orders.rows.length}):`);
      for (const o of orders.rows) console.log(`    ${o.orderNumber} | ${o.status} | ${o.totalPrice} ₸ | urgent: ${o.isUrgent}`);
      
      console.log(`  CONSULTATIONS (${consults.rows.length}):`);
      for (const c of consults.rows) console.log(`    ID: ${c.id} | visit: ${c.visitDate}`);
      
      console.log(`  PRESCRIPTIONS (${prescripts.rows.length}):`);
      for (const pr of prescripts.rows) console.log(`    ID: ${pr.id} | ${pr.createdAt}`);
      
      console.log(`  APPOINTMENTS (${appts.rows.length}):`);
      for (const a of appts.rows) console.log(`    ID: ${a.id}`);
      
      console.log(`  CHILDREN (${children.rows.length}):`);
      for (const ch of children.rows) console.log(`    ${ch.name} (${ch.phone})`);
    }

    // Check invoices table exists
    try {
      for (const p of patientsRes.rows) {
        const inv = await client.query(`SELECT COUNT(*) as cnt FROM invoices WHERE "patientId" = $1`, [p.id]);
        console.log(`\n  INVOICES for ${p.phone}: ${inv.rows[0].cnt}`);
      }
    } catch(e) {
      console.log(`\n  (invoices table check: ${e.message})`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
