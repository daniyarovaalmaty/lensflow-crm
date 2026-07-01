require('dotenv').config();
const { Client } = require('pg');

const kaspiReport = {
  '2026-06-30': [1500, 1500],
  '2026-06-27': [135000, 253000, 2000],
  '2026-06-26': [5000, 135000],
  '2026-06-24': [300000, 26000],
  '2026-06-23': [227700, 270000],
  '2026-06-22': [50000],
  '2026-06-19': [3500, 338000, 7000, 93000, 16500, 16500, 16500],
  '2026-06-18': [11500, 12000, 130000],
  '2026-06-17': [10000],
  '2026-06-16': [248000, 10000, 5000],
  '2026-06-15': [5000],
  '2026-06-13': [150000, 253000, 63250],
  '2026-06-12': [300000, 10000, 54450],
  '2026-06-11': [35000, 5000, 5000],
  '2026-06-10': [55000, 120000, 12000],
  '2026-06-09': [300000],
  '2026-06-08': [18000],
  '2026-06-06': [300000, 5000, 300000, 270000],
  '2026-06-05': [3000, 320000],
  '2026-06-04': [210000],
  '2026-06-03': [5000, 16000, 12000],
  '2026-06-02': [5000, 5000, 168000, 300000]
};

let aggregated = {};
for (let d in kaspiReport) {
    let sum = kaspiReport[d].reduce((a, b) => a + b, 0);
    aggregated[d] = sum;
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query(`
      SELECT 
        "createdAt",
        "paymentMethod",
        total,
        "invoiceData"
      FROM "sales"
      WHERE "paymentStatus" != 'refunded'
        AND "createdAt" >= '2026-05-31'
    `);
    
    let dbBank = {};
    for (let r of res.rows) {
      // Create date object and shift to Almaty time (+5)
      let d = new Date(r.createdAt);
      d.setHours(d.getHours() + 5);
      let dateStr = d.toISOString().split('T')[0];
      
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
        dbBank[dateStr] = (dbBank[dateStr] || 0) + bankAmt;
      }
    }
    
    let diffs = [];
    let allDates = new Set([...Object.keys(aggregated), ...Object.keys(dbBank)]);
    let sortedDates = Array.from(allDates).sort().filter(d => d.startsWith('2026-06')); // Only June
    
    let totalKaspi = 0;
    let totalCrm = 0;
    
    for (let d of sortedDates) {
      let kaspi = aggregated[d] || 0;
      let crm = dbBank[d] || 0;
      totalKaspi += kaspi;
      totalCrm += crm;
      
      diffs.push({ date: d, "Kaspi Отчет": kaspi, "CRM Безнал": crm, "Разница": crm - kaspi });
    }
    
    console.table(diffs);
  } finally {
    client.end();
  }
});
