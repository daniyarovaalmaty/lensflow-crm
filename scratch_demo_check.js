const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});
async function main() {
  await client.connect();
  const res = await client.query("SELECT id, name FROM organizations WHERE id = 'org-demo-clinic';");
  console.log('Org:', res.rows);
  const users = await client.query("SELECT email, password FROM users WHERE \"organizationId\" = 'org-demo-clinic';");
  console.log('Users:', users.rows);
  await client.end();
}
main().catch(console.error);
