require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query(`
      SELECT 
        id, 
        "createdAt", 
        total 
      FROM sales 
      WHERE total = 300000 OR total = 168000
      ORDER BY "createdAt" ASC
      LIMIT 10
    `);
    console.table(res.rows);
  } finally {
    client.end();
  }
});
