const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const orgs = await client.query("SELECT id, name FROM organizations LIMIT 10");
  console.log('Sample orgs:', orgs.rows);

  for (const org of orgs.rows) {
    const count = await client.query("SELECT COUNT(*) FROM orders WHERE \"organizationId\" = $1", [org.id]);
    console.log(`Org ${org.name} (${org.id}) orders count: ${count.rows[0].count}`);
  }

  await client.end();
}
main().catch(console.error);
