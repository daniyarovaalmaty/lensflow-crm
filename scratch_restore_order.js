const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();

  const orderNumber = 'AG62';

  try {
    const res = await client.query(`UPDATE orders SET status = 'new' WHERE "orderNumber" = $1 RETURNING id, status`, [orderNumber]);
    console.log("Order updated:", res.rows);
  } catch (e) {
    console.error("Error updating order:", e);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
