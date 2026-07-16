import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function getTables() {
  const { rows } = await pool.query(SELECT table_name FROM information_schema.tables WHERE table_schema='public');
  console.log(rows);
}
getTables().finally(() => pool.end());
