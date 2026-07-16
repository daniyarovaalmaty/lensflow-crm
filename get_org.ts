import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function getOrg() {
  const { rows } = await pool.query(SELECT id, email, "organizationId" FROM "User" WHERE email = 'medinnovation.kaz2021@gmail.com');
  console.log(rows);
}
getOrg().finally(() => pool.end());
