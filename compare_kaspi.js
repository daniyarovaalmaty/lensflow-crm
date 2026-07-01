require('dotenv').config();
const { Client } = require('pg');

const statementKaspi = {
  '2026-06-27': 390000,
  '2026-06-26': 140000,
  '2026-06-24': 326000,
  '2026-06-23': 497700,
  '2026-06-22': 50000,
  '2026-06-19': 491000,
  '2026-06-18': 153500,
  '2026-06-17': 10000,
  '2026-06-16': 263000,
  '2026-06-15': 5000,
  '2026-06-13': 466250,
  '2026-06-12': 364450,
  '2026-06-11': 45000,
  '2026-06-10': 187000,
  '2026-06-09': 300000,
  '2026-06-08': 18000,
  '2026-06-06': 875000,
  '2026-06-05': 323000,
  '2026-06-04': 210000,
  '2026-06-03': 33000,
  '2026-06-02': 478000
};

const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query(`
      SELECT 
        DATE("createdAt" AT TIME ZONE 'Asia/Almaty') as d,
        "paymentMethod",
        total,
        "invoiceData"
      FROM "sales"
      WHERE "paymentStatus" != 'refunded'
        AND "createdAt" >= '2026-06-01'
    `);
    
    let dbKaspi = {};
    for (let r of res.rows) {
      let date = r.d.toISOString().split('T')[0];
      let kaspiAmt = 0;
      if (r.paymentMethod === 'kaspi') {
        kaspiAmt = Number(r.total);
      } else if (r.paymentMethod === 'mixed') {
        const inv = typeof r.invoiceData === 'string' ? JSON.parse(r.invoiceData) : r.invoiceData;
        if (inv && inv.split && Array.isArray(inv.split)) {
          inv.split.forEach(s => {
            if (s.method === 'kaspi') kaspiAmt += Number(s.amount);
          });
        } else if (inv) {
          kaspiAmt += Number(inv.kaspiAmount || inv.kaspi || 0);
        }
      }
      if (kaspiAmt > 0) {
        dbKaspi[date] = (dbKaspi[date] || 0) + kaspiAmt;
      }
    }
    
    let diffs = [];
    let allDates = new Set([...Object.keys(statementKaspi), ...Object.keys(dbKaspi)]);
    let sortedDates = Array.from(allDates).sort();
    
    for (let d of sortedDates) {
      let bank = statementKaspi[d] || 0;
      let crm = dbKaspi[d] || 0;
      if (bank !== crm) {
        diffs.push({ date: d, "Выписка (Bank)": bank, "CRM (Kaspi)": crm, "Разница": crm - bank });
      }
    }
    
    console.table(diffs);
  } finally {
    client.end();
  }
});
