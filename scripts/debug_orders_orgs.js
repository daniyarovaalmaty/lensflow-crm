const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query(`
    SELECT o.id, o."orderNumber", o."totalPrice", o."organizationId", org.name as org_name, org."parentId" as org_parent_id, u."organizationId" as user_org_id
    FROM orders o
    LEFT JOIN organizations org ON o."organizationId" = org.id
    LEFT JOIN users u ON o."createdById" = u.id
    WHERE o.status != 'cancelled'
    LIMIT 20
  `);
  console.log('Sample orders with org details:', res.rows);

  await client.end();
}
main().catch(console.error);
