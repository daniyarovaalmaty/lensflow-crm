const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    const SOURCE_PATIENT_ID = 'cms34b6hp000004jmrh8twbhn';  // Эльмира Амангельдиева (+7 (705) 531-08-16)
    const TARGET_PATIENT_ID = 'cms34ougg000604jmef6lcu7c';  // Амангельдиева Эльмира (77055310816)
    const SALE_NUMBER = 'S-ORG--0134';

    // Step 1: Verify the sale exists and belongs to source patient
    const verifyRes = await client.query(`
      SELECT id, "saleNumber", "patientId", total, "customerName"
      FROM sales
      WHERE "saleNumber" = $1 AND "patientId" = $2
    `, [SALE_NUMBER, SOURCE_PATIENT_ID]);

    if (verifyRes.rows.length === 0) {
      console.log('ERROR: Sale not found or does not belong to source patient!');
      await client.query('ROLLBACK');
      return;
    }

    console.log('=== BEFORE UPDATE ===');
    console.log(`Sale: ${verifyRes.rows[0].saleNumber}`);
    console.log(`Current patientId: ${verifyRes.rows[0].patientId}`);
    console.log(`Current customerName: ${verifyRes.rows[0].customerName}`);

    // Step 2: Verify target patient exists
    const targetRes = await client.query(`
      SELECT id, name, phone FROM patients WHERE id = $1
    `, [TARGET_PATIENT_ID]);

    if (targetRes.rows.length === 0) {
      console.log('ERROR: Target patient not found!');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`\nTarget patient: ${targetRes.rows[0].name} (${targetRes.rows[0].phone})`);

    // Step 3: Update the sale
    const updateRes = await client.query(`
      UPDATE sales
      SET "patientId" = $1,
          "customerName" = $2
      WHERE "saleNumber" = $3 AND "patientId" = $4
      RETURNING id, "saleNumber", "patientId", "customerName", total
    `, [TARGET_PATIENT_ID, 'Амангельдиева Эльмира', SALE_NUMBER, SOURCE_PATIENT_ID]);

    if (updateRes.rows.length === 0) {
      console.log('ERROR: Update failed!');
      await client.query('ROLLBACK');
      return;
    }

    console.log('\n=== AFTER UPDATE ===');
    console.log(`Sale: ${updateRes.rows[0].saleNumber}`);
    console.log(`New patientId: ${updateRes.rows[0].patientId}`);
    console.log(`New customerName: ${updateRes.rows[0].customerName}`);
    console.log(`Total: ${updateRes.rows[0].total}`);

    // Step 4: Verify sale items are still intact
    const itemsRes = await client.query(`
      SELECT COUNT(*) as item_count, SUM(total) as items_total
      FROM sale_items
      WHERE "saleId" = $1
    `, [updateRes.rows[0].id]);

    console.log(`\nSale items: ${itemsRes.rows[0].item_count} items, total: ${itemsRes.rows[0].items_total}`);

    // Step 5: Verify counts for both patients
    const sourceSales = await client.query(`
      SELECT COUNT(*) as cnt FROM sales WHERE "patientId" = $1
    `, [SOURCE_PATIENT_ID]);

    const targetSales = await client.query(`
      SELECT COUNT(*) as cnt FROM sales WHERE "patientId" = $1
    `, [TARGET_PATIENT_ID]);

    console.log(`\nSource patient (Эльмира Амангельдиева) sales: ${sourceSales.rows[0].cnt}`);
    console.log(`Target patient (Амангельдиева Эльмира) sales: ${targetSales.rows[0].cnt}`);

    // Commit
    await client.query('COMMIT');
    console.log('\n✅ TRANSACTION COMMITTED SUCCESSFULLY');

  } catch (err) {
    await client.query('ROLLBACK');
    console.log('❌ TRANSACTION ROLLED BACK');
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
