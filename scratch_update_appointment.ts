import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const appointmentId = 'cms7n2efe000104l6ptoz4sh1';

    await prisma.$executeRaw`
        UPDATE appointments
        SET status = 'scheduled'
        WHERE id = ${appointmentId};
    `;

    console.log(`Appointment ${appointmentId} updated to 'scheduled'.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
