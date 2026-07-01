import prisma from './src/lib/db/prisma';

async function main() {
  const sales = await prisma.sale.aggregate({
    _sum: { total: true },
    where: { paymentStatus: { not: 'refunded' } }
  });
  console.log('Total from Sales:', sales._sum.total);

  const txs = await prisma.financialTransaction.aggregate({
    _sum: { amount: true },
    where: { type: 'income' }
  });
  console.log('Total from FinancialTransactions:', txs._sum.amount);

  const cashTxs = await prisma.cashTransaction.findMany();
  let totalCashIncome = 0;
  cashTxs.forEach(t => {
      if (t.transType === 'income' || (t.transType === 'cash_in' && t.category !== 'other')) {
          totalCashIncome += t.amount;
      }
  });
  console.log('Total from CashTransactions:', totalCashIncome);
}
main().catch(console.error).finally(() => process.exit(0));
