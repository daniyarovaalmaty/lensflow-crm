require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query('SELECT id, name, balance FROM company_accounts');
    console.table(res.rows);
  } finally {
    client.end();
  }
});
