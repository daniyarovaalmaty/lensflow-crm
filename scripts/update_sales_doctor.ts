import { config } from 'dotenv';
config();

import prisma from '../src/lib/db/prisma';

async function main() {
    const aigerim = await prisma.user.findFirst({
        where: { fullName: { contains: 'Айгерим', mode: 'insensitive' } }
    });

    if (!aigerim) {
        console.error("Could not find Aigerim in the database");
        return;
    }
    console.log("Found Aigerim:", aigerim.id, aigerim.fullName);

    const saleNumbers = ["S-ORG--0088", "S-ORG--0087", "S-ORG--0084", "S-ORG--0081", "S-ORG--0079"];

    const existing = await prisma.sale.findMany({
        where: { saleNumber: { in: saleNumbers } },
        select: { id: true, saleNumber: true, doctorId: true, doctor: { select: { fullName: true } } }
    });
    console.log("Existing sales before update:", existing);

    for (const sale of existing) {
        await prisma.sale.update({
            where: { id: sale.id },
            data: { doctorId: aigerim.id }
        });
        console.log(`Updated sale ${sale.saleNumber} (${sale.id}) to doctor Aigerim`);
    }

    const updated = await prisma.sale.findMany({
        where: { saleNumber: { in: saleNumbers } },
        select: { saleNumber: true, doctorId: true, doctor: { select: { fullName: true } } }
    });
    console.log("Sales after update:", updated);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
