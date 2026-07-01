require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query(`
      SELECT id, name, role FROM "users" WHERE name ILIKE '%Шораева%' OR name ILIKE '%Айгерим%'
    `);
    console.table(res.rows);
  } finally {
    client.end();
  }
});
