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
    
    let dbBank = {};
    for (let r of res.rows) {
      let date = r.d.toISOString().split('T')[0];
      let bankAmt = 0;
      if (['kaspi', 'card', 'installment', 'installment3', 'installment6', 'installment12', 'transfer'].includes(r.paymentMethod)) {
        bankAmt = Number(r.total);
      } else if (r.paymentMethod === 'mixed') {
        const inv = typeof r.invoiceData === 'string' ? JSON.parse(r.invoiceData) : r.invoiceData;
        if (inv && inv.split && Array.isArray(inv.split)) {
          inv.split.forEach(s => {
            if (s.method !== 'cash') bankAmt += Number(s.amount);
          });
        } else if (inv) {
          bankAmt += Number(inv.kaspiAmount || inv.kaspi || 0) + Number(inv.cardAmount || inv.card || 0) + Number(inv.transferAmount || inv.transfer || 0);
        }
      }
      if (bankAmt > 0) {
        dbBank[date] = (dbBank[date] || 0) + bankAmt;
      }
    }
    
    let diffs = [];
    let allDates = new Set([...Object.keys(statementKaspi), ...Object.keys(dbBank)]);
    let sortedDates = Array.from(allDates).sort();
    
    let totalBank = 0;
    let totalCrm = 0;
    
    for (let d of sortedDates) {
      let bank = statementKaspi[d] || 0;
      let crm = dbBank[d] || 0;
      totalBank += bank;
      totalCrm += crm;
      
      diffs.push({ date: d, "Выписка Kaspi": bank, "CRM Безнал (Kaspi+Card+Red)": crm, "Разница": crm - bank });
    }
    
    console.table(diffs);
    console.log(`Итого по выписке: ${totalBank}`);
    console.log(`Итого по CRM (весь безнал): ${totalCrm}`);
    console.log(`Общая разница: ${totalCrm - totalBank}`);
  } finally {
    client.end();
  }
});
