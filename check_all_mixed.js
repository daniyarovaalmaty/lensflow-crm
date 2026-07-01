require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query(`
      SELECT id, total, "invoiceData", "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Almaty' as d
      FROM sales
      WHERE "paymentMethod" = 'mixed'
      ORDER BY "createdAt" ASC
    `);
    
    let issues = [];
    res.rows.forEach(r => {
      let inv = r.invoiceData;
      if (typeof inv === 'string') inv = JSON.parse(inv);
      
      let hasSplit = false;
      if (inv) {
        if (inv.split && Array.isArray(inv.split) && inv.split.length > 0) hasSplit = true;
        if (inv.kaspiAmount || inv.cardAmount || inv.cashAmount || inv.transferAmount) hasSplit = true;
      }
      
      if (!hasSplit) {
        issues.push({
          id: r.id,
          total: r.total,
          date: r.d.toISOString().split('T')[0],
          invoiceData: JSON.stringify(inv)
        });
      }
    });
    
    if (issues.length > 0) {
      console.log("Found mixed payments MISSING split data:");
      console.table(issues);
    } else {
      console.log("All mixed payments have correct split data!");
    }
    
  } finally {
    client.end();
  }
});
