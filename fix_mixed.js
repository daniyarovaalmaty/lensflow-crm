require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    // Let's fix the invoiceData in the database to properly reflect the 93,000 kaspi and 2,000 cash
    const txId = 'cmqrx2bky000204l196am1b3f'; // wait, that was 300000 on 24.06. 
    
    const res = await client.query(`
      SELECT id, "invoiceData" FROM sales WHERE total = 95000 AND "paymentMethod" = 'mixed'
    `);
    
    if (res.rows.length === 1) {
      const saleId = res.rows[0].id;
      let invoiceData = res.rows[0].invoiceData;
      if (typeof invoiceData === 'string') invoiceData = JSON.parse(invoiceData);
      
      invoiceData.split = [
        { method: 'kaspi', label: 'Kaspi QR/Перевод', amount: 93000 },
        { method: 'cash', label: 'Наличные', amount: 2000 }
      ];
      
      await client.query(`UPDATE sales SET "invoiceData" = $1 WHERE id = $2`, [JSON.stringify(invoiceData), saleId]);
      console.log(`Updated sale ${saleId} to have Kaspi 93k and Cash 2k split.`);
    }

  } finally {
    client.end();
  }
});
