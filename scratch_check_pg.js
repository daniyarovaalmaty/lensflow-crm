const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();

  const res = await client.query(`
    SELECT id, email, phone, "fullName", role, "organizationId" 
    FROM users 
    WHERE email ILIKE '%ozat%' OR "fullName" ILIKE '%ozat%' OR phone ILIKE '%ozat%'
  `);
  
  console.log("Users:", res.rows);
  
  const orgs = await client.query(`
    SELECT id, name, type 
    FROM organizations 
    WHERE name ILIKE '%ozat%'
  `);
  console.log("Orgs:", orgs.rows);
  
  // also check if any orders were placed from this email:
  const orders = await client.query(`
    SELECT id, "orderNumber", "createdById", "organizationId", "patientId", "createdAt" 
    FROM orders 
    WHERE "createdById" IN (
      SELECT id FROM users WHERE email ILIKE '%ozat%' OR "fullName" ILIKE '%ozat%' OR phone ILIKE '%ozat%'
    )
  `);
  console.log("Orders:", orders.rows);
  
  await client.end();
}

main().catch(console.error);
