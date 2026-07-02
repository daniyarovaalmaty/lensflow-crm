const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 10th of July 2026 or 2025? Let's check 2026 since current year is 2026.
    const appts = await prisma.appointment.findMany({
        where: {
            OR: [
                { patientName: { contains: 'тест', mode: 'insensitive' } },
                { patient: { name: { contains: 'тест', mode: 'insensitive' } } }
            ]
        },
        include: { patient: true }
    });
    
    console.log("Found Test Appointments:");
    appts.forEach(a => {
        console.log(`- ID: ${a.id} | Date: ${a.date} | Name: ${a.patientName || a.patient?.name} | Status: ${a.status}`);
    });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
