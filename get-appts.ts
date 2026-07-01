import { prisma } from './src/lib/db/prisma';

async function main() {
    const aigerim = await prisma.user.findFirst({
        where: { fullName: { contains: 'Айгерим' } }
    });

    if (!aigerim) {
        console.log('Doctor Aigerim not found');
        return;
    }

    const appointments = await prisma.appointment.findMany({
        where: {
            date: {
                gte: new Date('2026-06-14T00:00:00.000Z'),
                lte: new Date('2026-06-16T00:00:00.000Z')
            }
        }
    });
    
    console.log('Found appointments around June 15:');
    appointments.forEach(a => console.log(a.id, a.patientName, a.patientPhone, a.date));

    const target = appointments.find(a => a.patientName?.toLowerCase().includes('saltanat') || a.patientPhone?.includes('5613588'));
    
    if (target) {
        await prisma.appointment.update({
            where: { id: target.id },
            data: { doctorId: aigerim.id }
        });
        console.log(`Successfully updated appointment for ${target.patientName} to doctor ${aigerim.fullName}`);
    } else {
        console.log('Target appointment not found among them.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
