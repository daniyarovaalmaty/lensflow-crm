const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();

  const oldUserId = 'cmocl4s7g000204jutt3x2eec';
  const oldOrgId = 'cmocl4s2u000104jum9fij0bk';

  const orders = await client.query(`SELECT count(*) FROM orders WHERE "organizationId" = $1`, [oldOrgId]);
  const patients = await client.query(`SELECT count(*) FROM patients WHERE "organizationId" = $1`, [oldOrgId]);
  const sales = await client.query(`SELECT count(*) FROM sales WHERE "organizationId" = $1`, [oldOrgId]);
  const leads = await client.query(`SELECT count(*) FROM leads WHERE "clinicId" = $1`, [oldOrgId]);

  console.log(`Old Org Data (${oldOrgId}):`);
  console.log(`Orders: ${orders.rows[0].count}`);
  console.log(`Patients: ${patients.rows[0].count}`);
  console.log(`Sales: ${sales.rows[0].count}`);
  console.log(`Leads: ${leads.rows[0].count}`);

  await client.end();
}

main().catch(console.error);
