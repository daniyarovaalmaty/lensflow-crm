const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query("DELETE FROM orders WHERE \"orderNumber\" = 'AH08' RETURNING id, \"orderNumber\"");
  console.log("Deleted:", res.rows);

  await client.end();
}
main().catch(console.error);
