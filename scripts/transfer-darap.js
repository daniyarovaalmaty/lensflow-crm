const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const SOURCE_ID = 'cmru7go1y000004jv7wg4ngt5';  // Дарап Дарын 77762824014 (удаляем)
    const TARGET_ID = 'cmrt0dw4o000004l04mcpqfib';  // Дарап Дарын 87762824014 (оставляем)

    // ─── Step 1: Verify both patients exist ───
    const srcCheck = await client.query(`SELECT id, name, phone FROM patients WHERE id = $1`, [SOURCE_ID]);
    const tgtCheck = await client.query(`SELECT id, name, phone FROM patients WHERE id = $1`, [TARGET_ID]);
    if (srcCheck.rows.length === 0 || tgtCheck.rows.length === 0) {
      console.log('ERROR: One of the patients not found!');
      await client.query('ROLLBACK');
      return;
    }
    console.log(`Source: ${srcCheck.rows[0].name} (${srcCheck.rows[0].phone})`);
    console.log(`Target: ${tgtCheck.rows[0].name} (${tgtCheck.rows[0].phone})`);

    // ─── Step 2: Transfer Order AG70 ───
    const orderUpd = await client.query(`
      UPDATE orders SET "patientId" = $1
      WHERE "orderNumber" = 'AG70' AND "patientId" = $2
      RETURNING id, "orderNumber", "patientId"
    `, [TARGET_ID, SOURCE_ID]);
    console.log(`\n✅ Order AG70 transferred: ${orderUpd.rows.length} row(s) updated`);

    // ─── Step 3: Transfer Sale S-ORG--0132 ───
    const saleUpd = await client.query(`
      UPDATE sales SET "patientId" = $1, "customerName" = 'Дарап Дарын'
      WHERE "saleNumber" = 'S-ORG--0132' AND "patientId" = $2
      RETURNING id, "saleNumber", "patientId", total
    `, [TARGET_ID, SOURCE_ID]);
    console.log(`✅ Sale S-ORG--0132 transferred: ${saleUpd.rows.length} row(s) updated, total: ${saleUpd.rows[0]?.total}`);

    // ─── Step 4: Transfer 2 Appointments ───
    const apptUpd = await client.query(`
      UPDATE appointments SET "patientId" = $1
      WHERE "patientId" = $2
      RETURNING id
    `, [TARGET_ID, SOURCE_ID]);
    console.log(`✅ Appointments transferred: ${apptUpd.rows.length} row(s) updated`);

    // ─── Step 5: Verify nothing references source patient anymore ───
    console.log('\n=== PRE-DELETE VERIFICATION ===');
    const remainingSales = await client.query(`SELECT COUNT(*) as cnt FROM sales WHERE "patientId" = $1`, [SOURCE_ID]);
    const remainingOrders = await client.query(`SELECT COUNT(*) as cnt FROM orders WHERE "patientId" = $1`, [SOURCE_ID]);
    const remainingAppts = await client.query(`SELECT COUNT(*) as cnt FROM appointments WHERE "patientId" = $1`, [SOURCE_ID]);
    const remainingPresc = await client.query(`SELECT COUNT(*) as cnt FROM prescriptions WHERE "patientId" = $1`, [SOURCE_ID]);
    const remainingConsult = await client.query(`SELECT COUNT(*) as cnt FROM consultations WHERE "patientId" = $1`, [SOURCE_ID]);
    const remainingChildren = await client.query(`SELECT COUNT(*) as cnt FROM patients WHERE "parentId" = $1`, [SOURCE_ID]);

    console.log(`  Sales remaining on source: ${remainingSales.rows[0].cnt} (should be 0)`);
    console.log(`  Orders remaining on source: ${remainingOrders.rows[0].cnt} (should be 0)`);
    console.log(`  Appointments remaining on source: ${remainingAppts.rows[0].cnt} (should be 0)`);
    console.log(`  Prescriptions remaining on source: ${remainingPresc.rows[0].cnt} (will cascade-delete)`);
    console.log(`  Consultations remaining on source: ${remainingConsult.rows[0].cnt} (should be 0)`);
    console.log(`  Children patients on source: ${remainingChildren.rows[0].cnt} (should be 0)`);

    // Safety check: only proceed if sales, orders, appointments are 0
    if (parseInt(remainingSales.rows[0].cnt) > 0 || parseInt(remainingOrders.rows[0].cnt) > 0 || parseInt(remainingAppts.rows[0].cnt) > 0 || parseInt(remainingChildren.rows[0].cnt) > 0) {
      console.log('\n❌ ABORT: Source patient still has non-cascading references!');
      await client.query('ROLLBACK');
      return;
    }

    // ─── Step 6: Delete source patient (prescription will cascade) ───
    const delRes = await client.query(`
      DELETE FROM patients WHERE id = $1 RETURNING id, name, phone
    `, [SOURCE_ID]);
    console.log(`\n🗑️ Deleted patient: ${delRes.rows[0]?.name} (${delRes.rows[0]?.phone})`);

    // ─── Step 7: Final verification on target patient ───
    console.log('\n=== FINAL STATE OF TARGET PATIENT ===');
    const finalSales = await client.query(`SELECT "saleNumber", total FROM sales WHERE "patientId" = $1`, [TARGET_ID]);
    const finalOrders = await client.query(`SELECT "orderNumber", status, "totalPrice" FROM orders WHERE "patientId" = $1`, [TARGET_ID]);
    const finalAppts = await client.query(`SELECT id FROM appointments WHERE "patientId" = $1`, [TARGET_ID]);
    const finalConsult = await client.query(`SELECT id FROM consultations WHERE "patientId" = $1`, [TARGET_ID]);
    const finalPresc = await client.query(`SELECT id FROM prescriptions WHERE "patientId" = $1`, [TARGET_ID]);

    console.log(`  Sales (${finalSales.rows.length}):`);
    for (const s of finalSales.rows) console.log(`    ${s.saleNumber} | ${s.total} ₸`);
    console.log(`  Orders (${finalOrders.rows.length}):`);
    for (const o of finalOrders.rows) console.log(`    ${o.orderNumber} | ${o.status} | ${o.totalPrice} ₸`);
    console.log(`  Appointments: ${finalAppts.rows.length}`);
    console.log(`  Consultations: ${finalConsult.rows.length}`);
    console.log(`  Prescriptions: ${finalPresc.rows.length}`);

    // Verify source patient is gone
    const srcGone = await client.query(`SELECT COUNT(*) as cnt FROM patients WHERE id = $1`, [SOURCE_ID]);
    console.log(`\n  Source patient exists: ${srcGone.rows[0].cnt === '0' ? 'NO ✅' : 'YES ❌'}`);

    // Verify total sales count in org unchanged
    const orgTotal = await client.query(`SELECT COUNT(*) as cnt FROM sales WHERE "organizationId" = 'org-demo-neweye'`);
    console.log(`  New Eye total sales: ${orgTotal.rows[0].cnt}`);

    await client.query('COMMIT');
    console.log('\n✅ TRANSACTION COMMITTED SUCCESSFULLY');

  } catch (err) {
    await client.query('ROLLBACK');
    console.log('\n❌ TRANSACTION ROLLED BACK');
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
