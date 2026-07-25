const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT id, name, type, \"parentId\", address FROM organizations LIMIT 50");
  console.log(res.rows);
  await client.end();
}
main().catch(console.error);
