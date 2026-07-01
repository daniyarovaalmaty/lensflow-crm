const kaspiReport = {
  '30.06.2026': [1500, 1500],
  '27.06.2026': [135000, 253000, 2000],
  '26.06.2026': [5000, 135000],
  '24.06.2026': [300000, 26000],
  '23.06.2026': [227700, 270000],
  '22.06.2026': [50000],
  '19.06.2026': [3500, 338000, 7000, 93000, 16500, 16500, 16500],
  '18.06.2026': [11500, 12000, 130000],
  '17.06.2026': [10000],
  '16.06.2026': [248000, 10000, 5000],
  '15.06.2026': [5000],
  '13.06.2026': [150000, 253000, 63250],
  '12.06.2026': [300000, 10000, 54450],
  '11.06.2026': [35000, 5000, 5000],
  '10.06.2026': [55000, 120000, 12000],
  '09.06.2026': [300000],
  '08.06.2026': [18000],
  '06.06.2026': [300000, 5000, 300000, 270000],
  '05.06.2026': [3000, 320000],
  '04.06.2026': [210000],
  '03.06.2026': [5000, 16000, 12000],
  '02.06.2026': [5000, 5000, 168000, 300000]
};

let aggregated = {};
for (let d in kaspiReport) {
    let sum = kaspiReport[d].reduce((a, b) => a + b, 0);
    // format to YYYY-MM-DD
    let parts = d.split('.');
    let iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
    aggregated[iso] = sum;
}

require('dotenv').config();
const { Client } = require('pg');

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
    let allDates = new Set([...Object.keys(aggregated), ...Object.keys(dbBank)]);
    let sortedDates = Array.from(allDates).sort();
    
    let totalKaspi = 0;
    let totalCrm = 0;
    
    for (let d of sortedDates) {
      let kaspi = aggregated[d] || 0;
      let crm = dbBank[d] || 0;
      totalKaspi += kaspi;
      totalCrm += crm;
      
      diffs.push({ date: d, "Kaspi (Терминал)": kaspi, "CRM Безнал": crm, "Разница": crm - kaspi });
    }
    
    console.table(diffs);
  } finally {
    client.end();
  }
});
