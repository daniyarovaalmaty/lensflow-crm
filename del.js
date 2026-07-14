require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  return client.query('SELECT id, "documentNumber" FROM stock_documents;');
}).then(res => {
  console.log('Docs:', res.rows);
  return client.query('DELETE FROM stock_documents WHERE "documentNumber" LIKE \'%2%\';');
}).then(res => {
  console.log('Deleted:', res.rowCount);
  return client.end();
}).catch(console.error);
