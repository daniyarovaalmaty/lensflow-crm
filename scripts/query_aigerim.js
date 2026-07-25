const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const users = await client.query("SELECT id, email, \"fullName\", phone, role, \"subRole\", \"organizationId\" FROM users WHERE \"fullName\" ILIKE '%Айгерим%' OR email ILIKE '%aigerim%' OR email ILIKE '%neweye%' LIMIT 10");
  console.log('Users:', users.rows);

  const orgs = await client.query("SELECT id, name, phone, email, metadata FROM organizations WHERE name ILIKE '%NEW EYE%' OR name ILIKE '%Ньюай%' OR name ILIKE '%Нью ай%' LIMIT 10");
  console.log('Organizations:', orgs.rows);

  await client.end();
}
main().catch(console.error);
