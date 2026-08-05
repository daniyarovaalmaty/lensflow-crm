import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const today = new Date('2026-07-31T00:00:00.000Z');
    const tomorrow = new Date('2026-08-01T00:00:00.000Z');

    const appointments = await prisma.appointment.findMany({
        where: {
            date: {
                gte: today,
                lt: tomorrow,
            },
            patient: {
                name: {
                    contains: 'Абуханова',
                    mode: 'insensitive'
                }
            }
        },
        include: {
            patient: true,
            doctor: true,
            clinic: true,
            createdBy: true
        }
    });

    console.log(JSON.stringify(appointments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
