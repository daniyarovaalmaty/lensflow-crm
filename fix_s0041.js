require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    await client.query(`
      UPDATE sale_items 
      SET 
        "productId" = 'cmobm0xu8000a04lbyque3iir',
        "name" = 'Подбор торических ночных линз + Годовое обслуживание (Со скидкой)',
        "category" = 'service_other',
        "unitPrice" = 300000,
        "total" = 130000
      WHERE "saleId" = (SELECT id FROM sales WHERE "saleNumber" = 'S-ORG--0041') 
    `);

    await client.query(`
      UPDATE sales 
      SET 
        "subtotal" = 300000,
        "total" = 130000,
        "discountAmount" = 0,
        "discountPercent" = 0
      WHERE "saleNumber" = 'S-ORG--0041'
    `);

    console.log('Successfully updated S-ORG--0041.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
});
