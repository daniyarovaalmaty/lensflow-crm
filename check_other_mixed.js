require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query(`
      SELECT id, total, "invoiceData", "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Almaty' as d
      FROM sales
      WHERE "paymentMethod" = 'mixed'
    `);
    console.table(res.rows);
  } finally {
    client.end();
  }
});
