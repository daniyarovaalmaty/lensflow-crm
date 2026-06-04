import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  // Find ЦКК
  const orgs = await pool.query(`SELECT id, name, type, "discountPercent" FROM organizations WHERE LOWER(name) LIKE '%цкк%' OR LOWER(name) LIKE '%ckk%'`);
  console.log('=== Орг ЦКК ===');
  orgs.rows.forEach(o => console.log(`  ${o.name} (${o.id}) type=${o.type} discount=${o.discountPercent}`));

  // Find catalog products (lenses)
  const products = await pool.query(`SELECT id, name, category, price, "priceByDk", description, unit FROM products ORDER BY category, name`);
  console.log('\n=== Товары в каталоге ===');
  products.rows.forEach(p => console.log(`  [${p.category}] ${p.name} | price=${p.price} | dk=${JSON.stringify(p.priceByDk)} | desc=${p.description}`));

  // Check if distributor pricing exists
  const tables = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%pric%' OR tablename LIKE '%dist%'`);
  console.log('\n=== Таблицы (price/dist) ===');
  tables.rows.forEach(t => console.log(`  ${t.tablename}`));

  await pool.end();
}
main().catch(e => console.error(e.message));
