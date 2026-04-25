const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});
async function main() {
  await client.connect();
  const res = await client.query("SELECT id, email, avatar FROM users WHERE email = 'manager@neweye.kz';");
  console.log('Avatar:', res.rows[0].avatar);
  
  if (res.rows[0].avatar) {
     await client.query("UPDATE organizations SET logo = $1 WHERE id = 'org-demo-neweye';", [res.rows[0].avatar]);
     console.log('Updated org logo with avatar!');
  }
  await client.end();
}
main().catch(console.error);
