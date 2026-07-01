import prisma from './src/lib/db/prisma';

const kaspiIncomes = [
  { date: '2026-06-24', amount: 326000 },
  { date: '2026-06-23', amount: 497700 },
  { date: '2026-06-22', amount: 50000 },
  { date: '2026-06-19', amount: 491000 },
  { date: '2026-06-18', amount: 153500 },
  { date: '2026-06-17', amount: 10000 },
  { date: '2026-06-16', amount: 263000 },
  { date: '2026-06-15', amount: 5000 },
  { date: '2026-06-15', amount: 466250 },
  { date: '2026-06-12', amount: 364450 },
  { date: '2026-06-11', amount: 35000 },
  { date: '2026-06-11', amount: 10000 },
  { date: '2026-06-10', amount: 187000 },
  { date: '2026-06-09', amount: 300000 },
  { date: '2026-06-08', amount: 18000 },
  { date: '2026-06-08', amount: 875000 },
  { date: '2026-06-05', amount: 323000 },
  { date: '2026-06-04', amount: 210000 },
  { date: '2026-06-03', amount: 33000 },
  { date: '2026-06-02', amount: 478000 },
  { date: '2026-06-01', amount: 570000 }
];

async function main() {
  const sumKaspi = kaspiIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  console.log(`Sum of extracted Kaspi incomes: ${sumKaspi}`);

  const sales = await prisma.sale.findMany({
    where: { 
      paymentStatus: { not: 'refunded' },
      createdAt: { gte: new Date('2026-06-01T00:00:00Z'), lte: new Date('2026-06-30T23:59:59Z') }
    }
  });

  const salesByDate: Record<string, { total: number, kaspi: number }> = {};
  sales.forEach(s => {
    const d = s.createdAt.toISOString().slice(0, 10);
    if (!salesByDate[d]) salesByDate[d] = { total: 0, kaspi: 0 };
    salesByDate[d].total += s.total;
    
    // Attempt to calculate non-cash/kaspi part
    if (s.paymentMethod === 'kaspi' || s.paymentMethod === 'card' || s.paymentMethod === 'transfer') {
      salesByDate[d].kaspi += s.total;
    } else if (s.paymentMethod === 'mixed' && s.invoiceData) {
      const inv: any = s.invoiceData;
      if (inv.split && Array.isArray(inv.split)) {
        inv.split.forEach((sp: any) => {
          if (sp.method !== 'cash') salesByDate[d].kaspi += Number(sp.amount);
        });
      } else if (inv.splitPayment) {
        salesByDate[d].kaspi += Number(inv.splitPayment.kaspi || 0) + Number(inv.splitPayment.card || 0) + Number(inv.splitPayment.transfer || 0);
      }
    }
  });

  const kaspiByDate: Record<string, number> = {};
  kaspiIncomes.forEach(k => {
    kaspiByDate[k.date] = (kaspiByDate[k.date] || 0) + k.amount;
  });

  const allDates = Array.from(new Set([...Object.keys(salesByDate), ...Object.keys(kaspiByDate)])).sort();

  console.log('Date | Kaspi PDF | CRM Kaspi/Card | CRM Total Sales | Diff (Kaspi PDF - CRM Kaspi)');
  let totalDiff = 0;
  for (const d of allDates) {
    const k = kaspiByDate[d] || 0;
    const crmK = salesByDate[d]?.kaspi || 0;
    const crmT = salesByDate[d]?.total || 0;
    const diff = k - crmK;
    totalDiff += diff;
    console.log(`${d} | ${k} | ${crmK} | ${crmT} | ${diff}`);
  }
  console.log(`Total Difference: ${totalDiff}`);
}
main().catch(console.error);
