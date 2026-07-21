import prisma from './src/lib/db/prisma';
async function main() {
  const patientId = 'cmruvm013000004ih5jp0q9x4';
  const purchases = await prisma.sale.findMany({
    where: { patientId }
  });
  console.log(`Purchases for patient ${patientId}:`, purchases);
  
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { itigrisClient: true }
  });
  console.log('Patient Itigris info:', patient?.itigrisClient);
}
main().finally(() => prisma.$disconnect());
