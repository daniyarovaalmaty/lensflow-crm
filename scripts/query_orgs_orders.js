const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const org = await client.query("SELECT id, name, address FROM organizations WHERE name ILIKE '%Коновалова%Астана%'");
  console.log("Org:", org.rows);

  if (org.rows.length > 0) {
    const orders = await client.query("SELECT id, \"orderNumber\", \"deliveryAddress\", \"organizationId\" FROM orders WHERE \"organizationId\" = $1 LIMIT 5", [org.rows[0].id]);
    console.log("Orders:", orders.rows);
  }
  
  await client.end();
}
main().catch(console.error);
