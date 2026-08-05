import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const appointments = await prisma.$queryRaw`
        SELECT a.id, a.date, a.status, p.name as patient_name, a."doctorId", a."clinicId" 
        FROM appointments a
        JOIN patients p ON a."patientId" = p.id
        WHERE p.name ILIKE '%Абуханова%'
        AND a.date >= '2026-07-31' 
        AND a.date < '2026-08-01';
    `;
    
    console.log(JSON.stringify(appointments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
