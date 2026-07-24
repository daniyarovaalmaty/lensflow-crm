const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT id, name, description, category FROM \"Product\" WHERE category = 'lens'");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
main().catch(async e => {
  console.error("Trying lowercase product");
  try {
    const res2 = await client.query("SELECT id, name, description, category FROM product WHERE category = 'lens'");
    console.log(JSON.stringify(res2.rows, null, 2));
  } catch(e2) {
    console.error(e2);
  }
  await client.end();
});
