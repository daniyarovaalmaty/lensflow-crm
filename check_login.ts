import pg from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const res = await pool.query(`SELECT id, email, password, role, "subRole", status FROM users WHERE LOWER(email) LIKE '%zakazy%'`);
  console.log('Found:', res.rows.length, 'users');
  for (const u of res.rows) {
    console.log('  email:', u.email);
    console.log('  status:', u.status);
    console.log('  role:', u.role, '/', u.subRole);
    const ok = await bcrypt.compare('Narodnaya2026!', u.password);
    console.log('  password match:', ok);
  }
  await pool.end();
}
main().catch(e => console.error(e.message));
