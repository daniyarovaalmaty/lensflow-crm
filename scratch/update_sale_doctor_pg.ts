import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DIRECT_URL
});

async function run() {
  try {
    const { rows } = await pool.query(`SELECT id, "fullName" FROM "users" WHERE "fullName" ILIKE '%Сапарова%'`);
    if (rows.length === 0) {
      console.log('Doctor not found');
      return;
    }
    const doctorId = rows[0].id;
    const doctorName = rows[0].fullName;
    console.log('Doctor ID:', doctorId, doctorName);

    const saleRes = await pool.query(`SELECT id, "saleNumber", "doctorId" FROM "sales" WHERE "saleNumber" = 'S-ORG--0171'`);
    if (saleRes.rows.length === 0) {
      console.log('Sale not found');
      return;
    }
    const saleId = saleRes.rows[0].id;
    console.log('Sale ID:', saleId, 'Current doctorId:', saleRes.rows[0].doctorId);

    await pool.query(`UPDATE "sales" SET "doctorId" = $1, "performedByName" = $2 WHERE id = $3`, [doctorId, doctorName, saleId]);
    console.log('Sale updated successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
