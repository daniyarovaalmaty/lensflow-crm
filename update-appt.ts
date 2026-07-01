import { prisma } from './src/lib/db/prisma';

async function main() {
    const aigerim = await prisma.user.findFirst({
        where: { fullName: { contains: 'Айгерим' } }
    });

    if (!aigerim) {
        console.log('Doctor Aigerim not found');
        return;
    }

    const leads = await prisma.lead.findMany({
        where: {
            OR: [
                { name: { contains: 'Saltanat', mode: 'insensitive' } },
                { phone: { contains: '5613588' } }
            ]
        }
    });

    console.log('Found leads:', leads.map(l => ({ id: l.id, name: l.name, phone: l.phone, appt: l.appointmentAt })));

    for (const lead of leads) {
        await prisma.lead.update({
            where: { id: lead.id },
            data: { doctorId: aigerim.id }
        });
        console.log(`Updated lead ${lead.id} for ${lead.name} to doctor ${aigerim.fullName}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
