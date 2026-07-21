const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
  });
  await client.connect();
  const res = await client.query(`SELECT email, "fullName", role, "subRole" FROM "users" WHERE "organizationId" IN (SELECT id FROM "organizations" WHERE name ILIKE '%Народная%')`);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run().catch(console.error);
