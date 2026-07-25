const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const org = await client.query("SELECT id, address FROM organizations WHERE name = 'ТОО «Лазерный центр Коновалова» Астана'");
  if (org.rows.length > 0) {
    const orgId = org.rows[0].id;
    const address = org.rows[0].address;
    const res = await client.query("UPDATE orders SET \"deliveryAddress\" = $1 WHERE \"organizationId\" = $2 RETURNING id, \"orderNumber\", \"deliveryAddress\"", [address, orgId]);
    console.log(`Updated ${res.rowCount} orders to address: ${address}`);
  }
  
  await client.end();
}
main().catch(console.error);
