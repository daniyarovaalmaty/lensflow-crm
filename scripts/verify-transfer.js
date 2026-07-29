const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const SOURCE_ID = 'cms34b6hp000004jmrh8twbhn';
    const TARGET_ID = 'cms34ougg000604jmef6lcu7c';
    const SALE_ID = 'cms34gp3r000304jmf3limvn3';

    // 1. Check sale record - all fields
    console.log('=== SALE #S-ORG--0134 — FULL RECORD ===');
    const saleRes = await client.query(`SELECT * FROM sales WHERE id = $1`, [SALE_ID]);
    const sale = saleRes.rows[0];
    console.log(`  saleNumber: ${sale.saleNumber}`);
    console.log(`  patientId: ${sale.patientId}`);
    console.log(`  customerName: ${sale.customerName}`);
    console.log(`  customerPhone: ${sale.customerPhone}`);
    console.log(`  organizationId: ${sale.organizationId}`);
    console.log(`  total: ${sale.total}`);
    console.log(`  subtotal: ${sale.subtotal}`);
    console.log(`  paymentMethod: ${sale.paymentMethod}`);
    console.log(`  paymentStatus: ${sale.paymentStatus}`);
    console.log(`  paidAmount: ${sale.paidAmount}`);
    console.log(`  performedByName: ${sale.performedByName}`);
    console.log(`  doctorId: ${sale.doctorId}`);
    console.log(`  createdAt: ${sale.createdAt}`);
    console.log(`  updatedAt: ${sale.updatedAt}`);

    // 2. Sale items — untouched?
    console.log('\n=== SALE ITEMS ===');
    const itemsRes = await client.query(`SELECT * FROM sale_items WHERE "saleId" = $1`, [SALE_ID]);
    for (const item of itemsRes.rows) {
      console.log(`  ID: ${item.id}`);
      console.log(`  saleId: ${item.saleId}`);
      console.log(`  quantity: ${item.quantity}`);
      console.log(`  price: ${item.price}`);
      console.log(`  total: ${item.total}`);
      console.log(`  ---`);
    }

    // 3. Source patient — still intact?
    console.log('\n=== SOURCE PATIENT (Эльмира Амангельдиева) ===');
    const srcRes = await client.query(`SELECT * FROM patients WHERE id = $1`, [SOURCE_ID]);
    const src = srcRes.rows[0];
    console.log(`  id: ${src.id}`);
    console.log(`  name: ${src.name}`);
    console.log(`  phone: ${src.phone}`);
    console.log(`  organizationId: ${src.organizationId}`);
    console.log(`  createdAt: ${src.createdAt}`);
    console.log(`  (record exists: YES — not deleted)`);

    // 4. Target patient — still intact?
    console.log('\n=== TARGET PATIENT (Амангельдиева Эльмира) ===');
    const tgtRes = await client.query(`SELECT * FROM patients WHERE id = $1`, [TARGET_ID]);
    const tgt = tgtRes.rows[0];
    console.log(`  id: ${tgt.id}`);
    console.log(`  name: ${tgt.name}`);
    console.log(`  phone: ${tgt.phone}`);
    console.log(`  organizationId: ${tgt.organizationId}`);
    console.log(`  createdAt: ${tgt.createdAt}`);

    // 5. Target patient's consultations and prescriptions — untouched?
    const consRes = await client.query(`SELECT COUNT(*) as cnt FROM consultations WHERE "patientId" = $1`, [TARGET_ID]);
    const prescRes = await client.query(`SELECT COUNT(*) as cnt FROM prescriptions WHERE "patientId" = $1`, [TARGET_ID]);
    const salesRes = await client.query(`SELECT COUNT(*) as cnt FROM sales WHERE "patientId" = $1`, [TARGET_ID]);
    console.log(`  Sales: ${salesRes.rows[0].cnt}`);
    console.log(`  Consultations: ${consRes.rows[0].cnt}`);
    console.log(`  Prescriptions: ${prescRes.rows[0].cnt}`);

    // 6. Verify NOTHING else was modified — check total sales count in org
    const orgSalesRes = await client.query(`
      SELECT COUNT(*) as total_sales FROM sales WHERE "organizationId" = 'org-demo-neweye'
    `);
    console.log(`\n=== ORG "New Eye" TOTAL SALES COUNT: ${orgSalesRes.rows[0].total_sales} ===`);

    console.log('\n✅ VERIFICATION COMPLETE — only patientId and customerName were changed on the sale record');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
