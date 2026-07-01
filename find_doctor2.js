require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query(`
      SELECT id, "fullName", role FROM users WHERE "fullName" ILIKE '%Шораева%' OR "fullName" ILIKE '%Айгерим%'
    `);
    console.table(res.rows);
  } finally {
    client.end();
  }
});
