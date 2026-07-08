const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
async function main() {
  await client.connect();
  const orgRes = await client.query('SELECT id, name FROM "organizations" WHERE lower(name) LIKE $1', ['%new eye%']);
  
  if (orgRes.rows.length === 0) {
    console.log('Clinic not found');
    return;
  }
  
  const orgId = orgRes.rows[0].id;
  console.log('Org:', orgRes.rows[0].name);
  
  const res = await client.query('SELECT phone, lower(name) as name, count(*) as count FROM "patients" WHERE "organizationId" = $1 GROUP BY phone, lower(name) HAVING count(*) > 1', [orgId]);
  
  console.log(JSON.stringify(res.rows, null, 2));
}
main().catch(console.error).finally(() => client.end());
