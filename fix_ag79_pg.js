const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function run() {
  await client.connect();
  const res = await client.query(`UPDATE orders SET status = 'new' WHERE "orderNumber" = 'AG79'`);
  console.log('Updated rows:', res.rowCount);
  await client.end();
}

run().catch(console.error);
