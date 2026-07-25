const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const ordersWithoutOrg = await client.query(`
    SELECT o.id, o."orderNumber", o.company, o."opticName", o."createdById", u."organizationId" as u_org_id, u."fullName" as u_name, org.name as u_org_name
    FROM orders o
    LEFT JOIN users u ON o."createdById" = u.id
    LEFT JOIN organizations org ON u."organizationId" = org.id
    WHERE o."organizationId" IS NULL AND o.status != 'cancelled'
    LIMIT 20
  `);
  console.log('Orders with NULL organizationId count:', ordersWithoutOrg.rows.length);
  if (ordersWithoutOrg.rows.length > 0) {
    console.log('Sample orders without organizationId:', ordersWithoutOrg.rows);
  }

  // Check parentId branches vs headquarter organizations
  const branches = await client.query("SELECT id, name, \"parentId\" FROM organizations WHERE \"parentId\" IS NOT NULL");
  console.log('Branches with parentId:', branches.rows);

  await client.end();
}
main().catch(console.error);
