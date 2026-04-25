const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function main() {
  await client.connect();
  const res = await client.query("UPDATE organizations SET logo = $1 WHERE id = $2 RETURNING id, name, logo", [
    'https://mmundus.com/media/lensflow/7687dab9ad3f430ab5d29b409746da29.png',
    'org-demo-neweye'
  ]);
  console.log('Updated:', res.rows[0]);
  await client.end();
}

main().catch(console.error);
