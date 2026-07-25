const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT id, \"orderNumber\", status, \"doctorName\", \"doctorEmail\", \"createdById\", \"organizationId\" FROM orders WHERE \"organizationId\" = 'org-demo-neweye' OR \"doctorName\" ILIKE '%Айгерим%' ORDER BY \"createdAt\" DESC LIMIT 10");
  console.log('Orders:', res.rows);
  await client.end();
}
main().catch(console.error);
