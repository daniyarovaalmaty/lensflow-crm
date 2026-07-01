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
    
    // For each date in CRM, find the NEXT date in the statement
    // Simple logic: we'll just show the CRM date, CRM amount, and we'll look for the exact same amount in statementKaspi within +1 to +3 days.
    
    let matchedStatementDates = new Set();
    
    for (let crmD of sortedDates) {
        if (!dbBank[crmD]) continue;
        let crm = dbBank[crmD];
        let dObj = new Date(crmD);
        
        let foundBank = null;
        let foundBankDate = null;
        
        // check up to 3 days ahead
        for (let i = 1; i <= 3; i++) {
            let nextDObj = new Date(dObj);
            nextDObj.setDate(dObj.getDate() + i);
            let nextDStr = nextDObj.toISOString().split('T')[0];
            
            // Allow 1 tenge difference
            if (statementKaspi[nextDStr] !== undefined && Math.abs(statementKaspi[nextDStr] - crm) <= 1 && !matchedStatementDates.has(nextDStr)) {
                foundBank = statementKaspi[nextDStr];
                foundBankDate = nextDStr;
                break;
            }
        }
        
        if (foundBank !== null) {
            diffs.push({ "Дата CRM": crmD, "CRM Сумма": crm, "Дата Выписка": foundBankDate, "Выписка Сумма": foundBank, "Статус": "Сходится" });
            matchedStatementDates.add(foundBankDate);
        } else {
            diffs.push({ "Дата CRM": crmD, "CRM Сумма": crm, "Дата Выписка": "-", "Выписка Сумма": "-", "Статус": "ОШИБКА (Нет в выписке)" });
        }
    }
    
    // Now add the ones in bank statement that were not matched
    for (let bD in statementKaspi) {
        if (!matchedStatementDates.has(bD)) {
            diffs.push({ "Дата CRM": "-", "CRM Сумма": "-", "Дата Выписка": bD, "Выписка Сумма": statementKaspi[bD], "Статус": "ОШИБКА (Нет в CRM)" });
        }
    }
    
    diffs.sort((a,b) => {
        let da = a["Дата CRM"] !== "-" ? a["Дата CRM"] : a["Дата Выписка"];
        let db = b["Дата CRM"] !== "-" ? b["Дата CRM"] : b["Дата Выписка"];
        return da.localeCompare(db);
    });
    
    console.table(diffs);
  } finally {
    client.end();
  }
});
