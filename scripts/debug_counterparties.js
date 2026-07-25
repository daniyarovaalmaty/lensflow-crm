const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const totalOrders = await client.query("SELECT COUNT(*) FROM orders");
  console.log('Total orders in DB:', totalOrders.rows[0].count);

  const nonCancelled = await client.query("SELECT COUNT(*) FROM orders WHERE status != 'cancelled'");
  console.log('Non-cancelled orders:', nonCancelled.rows[0].count);

  const sampleOrders = await client.query("SELECT id, \"orderNumber\", status, \"totalPrice\", \"paymentStatus\", \"organizationId\", source FROM orders LIMIT 10");
  console.log('Sample orders:', sampleOrders.rows);

  await client.end();
}
main().catch(console.error);
