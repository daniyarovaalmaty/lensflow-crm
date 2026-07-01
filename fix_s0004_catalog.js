require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    await client.query(`
      UPDATE sale_items 
      SET 
        "productId" = 'cmobm0xu8000a04lbyque3iir',
        "name" = 'Подбор торических ночных линз + Годовое обслуживание (Скидка 50%)',
        "category" = 'service_other',
        "unitPrice" = 300000,
        "total" = 150000
      WHERE "saleId" = (SELECT id FROM sales WHERE "saleNumber" = 'S-0004') 
      AND "name" ILIKE '%Подбор%'
    `);
    console.log('Successfully linked S-0004 to catalog item.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
});
