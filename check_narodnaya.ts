import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  // Narodnaya Optika and branches
  const orgs = await pool.query(`
    SELECT id, name, type, "parentId", metadata FROM organizations
    WHERE id IN ('cmowv0aio000204la3rf3ff0f','cmppqdn94000004gs8rwc1upr','cmppqdyy7000104gshlynzaw6','cmppqe8gr000c04l7n2mih9tq')
    ORDER BY type, name
  `);
  console.log('=== Оптика Народная ===');
  orgs.rows.forEach(o => console.log(`  [${o.type}] ${o.name} | id=${o.id} | parent=${o.parentId}`));

  // ЦКК distributor
  const ckk = await pool.query(`SELECT id, name FROM organizations WHERE LOWER(name) LIKE '%цкк%'`);
  console.log('\n=== ЦКК ===');
  ckk.rows.forEach(o => console.log(`  ${o.name} | id=${o.id}`));

  // Laboratory
  const lab = await pool.query(`SELECT id, name, type FROM organizations WHERE type = 'laboratory' OR role = 'laboratory' LIMIT 5`);
  console.log('\n=== Лаборатории ===');
  lab.rows.forEach(o => console.log(`  ${o.name} | id=${o.id} | type=${o.type}`));

  await pool.end();
}
main().catch(e => console.error(e.message));
