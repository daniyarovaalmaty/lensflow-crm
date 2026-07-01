import prisma from './src/lib/db/prisma';

async function main() {
  const duplicates = await prisma.financialTransaction.findMany({
    where: { 
      amount: 2000000,
      type: 'income',
      description: { contains: 'medinn' }
    }
  });

  if (duplicates.length > 1) {
    // Delete the latest one (or the first one)
    await prisma.financialTransaction.delete({
      where: { id: duplicates[0].id }
    });
    console.log(`Deleted duplicate investment: ${duplicates[0].id}`);
    
    // Decrease the account balance since an income was removed
    await prisma.companyAccount.update({
      where: { id: duplicates[0].accountId },
      data: { balance: { decrement: 2000000 } }
    });
    console.log(`Decremented balance by 2M`);
  } else {
    console.log(`Found only ${duplicates.length} records. Nothing deleted.`);
  }
}
main().catch(console.error);
