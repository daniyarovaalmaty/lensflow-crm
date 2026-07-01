require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query('SELECT id, type, category, amount, description, "accountId" FROM financial_transactions ORDER BY date DESC LIMIT 10');
    console.table(res.rows);
  } finally {
    client.end();
  }
});
