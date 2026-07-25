const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT id, name, type, \"parentId\" FROM organizations WHERE type = 'optic' OR type = 'branch'");
  console.log(res.rows);
  await client.end();
}
main().catch(console.error);
