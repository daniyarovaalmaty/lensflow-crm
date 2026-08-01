const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect();

client.query("SELECT name, \"priceByDk\", price FROM products WHERE category = 'lens'", (err, res) => {
  if (err) throw err;
  console.log(JSON.stringify(res.rows, null, 2));
  client.end();
});
