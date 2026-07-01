import prisma from './src/lib/db/prisma';

async function main() {
  const fTxs = await prisma.financialTransaction.findMany({
    where: { type: 'expense' },
    orderBy: { date: 'desc' }
  });
  console.log('FinancialTransactions (Expenses):');
  fTxs.forEach(t => console.log(`${t.date.toISOString().slice(0,10)} | ${t.category} | ${t.amount} | ${t.description}`));

  const cTxs = await prisma.cashTransaction.findMany({
    where: { transType: { in: ['expense', 'cash_out'] } },
    orderBy: { createdAt: 'desc' }
  });
  console.log('\nCashTransactions (Expenses/Out):');
  cTxs.forEach(t => console.log(`${t.createdAt.toISOString().slice(0,10)} | ${t.category} | ${t.amount} | ${t.description}`));
}
main().catch(console.error).finally(() => process.exit(0));
