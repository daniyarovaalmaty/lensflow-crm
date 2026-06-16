const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
});

async function main() {
  await client.connect();
  
  const orgs = await client.query("SELECT id, name, type FROM organizations WHERE type = 'laboratory'");
  console.log('Laboratories:', orgs.rows);
  
  const products = await client.query("SELECT id, name, price, category FROM products WHERE \"name1c\" LIKE '%ЦКК%' OR name LIKE '%ЦКК%' LIMIT 5");
  console.log('Products:', products.rows);
  
  await client.end();
}

main().catch(console.error);
