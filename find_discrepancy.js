require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res1 = await client.query(`
      SELECT total, "paymentMethod", "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Almaty' as d
      FROM sales
      WHERE "paymentStatus" != 'refunded' AND total = 35000 AND "createdAt" >= '2026-06-10' AND "createdAt" <= '2026-06-13'
    `);
    console.log("35,000 sales around 11.06:");
    console.table(res1.rows);

    const res2 = await client.query(`
      SELECT total, "paymentMethod", "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Almaty' as d
      FROM sales
      WHERE "paymentStatus" != 'refunded' AND total = 211000 AND "createdAt" >= '2026-06-20' AND "createdAt" <= '2026-06-24'
    `);
    console.log("211,000 sales around 22.06:");
    console.table(res2.rows);

    const res3 = await client.query(`
      SELECT total, "paymentMethod", "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Almaty' as d
      FROM sales
      WHERE "paymentStatus" != 'refunded' AND "createdAt" >= '2026-06-18' AND "createdAt" <= '2026-06-20'
    `);
    console.log("All sales around 19.06 to find 96,400:");
    let sum19 = 0;
    res3.rows.forEach(r => {
        let dateStr = r.d.toISOString().split('T')[0];
        if (dateStr === '2026-06-19' && ['kaspi','card'].includes(r.paymentMethod)) sum19 += Number(r.total);
    });
    console.table(res3.rows);

  } finally {
    client.end();
  }
});
