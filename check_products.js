const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
});

async function main() {
  await client.connect();
  const count = await client.query("SELECT COUNT(*) FROM products");
  console.log('Total products:', count.rows[0].count);
  await client.end();
}

main().catch(console.error);
