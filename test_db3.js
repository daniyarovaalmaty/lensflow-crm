const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
});
async function run() {
  await client.connect();
  const res = await client.query('SELECT id, name FROM "organizations" WHERE name ILIKE \'%Народная%\';');
  console.log('Orgs:', res.rows);
  const users = await client.query('SELECT id, email, "organizationId", "fullName", role FROM "users" WHERE "organizationId" IN (SELECT id FROM "organizations" WHERE name ILIKE \'%Народная%\');');
  console.log('Users linked directly:', users.rows);
  const branches = await client.query('SELECT "userId", "branchId" FROM user_branches WHERE "branchId" IN (SELECT id FROM "organizations" WHERE name ILIKE \'%Народная%\');');
  console.log('Users linked via branches:', branches.rows);
  await client.end();
}
run();
