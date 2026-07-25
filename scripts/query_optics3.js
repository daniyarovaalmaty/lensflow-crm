const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT id, name, type, \"parentId\", address FROM organizations WHERE name ILIKE '%eye%' OR name ILIKE '%max%' OR name ILIKE '%макс%' OR name ILIKE '%аймакс%'");
  console.log(res.rows);
  await client.end();
}
main().catch(console.error);
