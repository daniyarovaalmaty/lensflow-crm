const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query("DELETE FROM orders WHERE number = 'AH08' RETURNING id, number, \"patientName\"");
  console.log("Deleted:", res.rows);

  await client.end();
}
main().catch(console.error);
