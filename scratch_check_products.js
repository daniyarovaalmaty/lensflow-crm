const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});
async function main() {
  await client.connect();
  const res = await client.query("SELECT id, name, category, type, sku, barcode, \"isActive\" FROM optic_products WHERE type = 'product' AND \"isActive\" = true;");
  console.log('Active Products:', res.rows);
  await client.end();
}
main().catch(console.error);
