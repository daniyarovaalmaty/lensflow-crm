const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT email, role, \"subRole\" FROM users WHERE email ILIKE '%accountant%' OR email ILIKE '%бухгалтер%' OR role = 'laboratory' LIMIT 10");
  console.log(res.rows);
  await client.end();
}
main().catch(console.error);
