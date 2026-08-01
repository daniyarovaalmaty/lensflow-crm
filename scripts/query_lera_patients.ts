import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
}

import * as fs from 'fs';

async function main() {
    // Dynamic import to ensure process.env is set before prisma client is initialized
    const prismaModule = await import('../src/lib/db/prisma');
    const prisma = prismaModule.default;

    const org = await prisma.organization.findFirst({
        where: { name: { contains: "NEW EYE", mode: "insensitive" } }
    });
    
    if (!org) return console.log("Organization 'NEW EYE' not found!");

    const lera = await prisma.user.findFirst({
        where: { 
            fullName: { contains: "Валерия", mode: "insensitive" },
            organizationId: org.id
        }
    });

    if (!lera) return console.log("User Lera (Валерия) not found!");

    const startDate = new Date('2026-06-30T19:00:00.000Z'); 
    const endDate = new Date('2026-07-31T19:00:00.000Z');

    const appointments = await prisma.appointment.findMany({
        where: {
            createdById: lera.id,
            date: { gte: startDate, lte: endDate }
        },
        include: { patient: true }
    });

    console.log(`Lera created ${appointments.length} appointments in July.`);

    const patientIds = Array.from(new Set(appointments.map((a: any) => a.patientId).filter(Boolean))) as string[];
    const patientNames = Array.from(new Set(appointments.map((a: any) => a.patientName).filter(Boolean))) as string[];

    console.log(`Unique patients found: ${patientIds.length} (by ID), ${patientNames.length} (by Name)`);

    const sales = await prisma.sale.findMany({
        where: {
            organizationId: org.id,
            createdAt: { gte: startDate, lte: endDate },
            OR: [
                { patientId: { in: patientIds } },
                { customerName: { in: patientNames } }
            ]
        }
    });

    const targetPatients: any[] = [];

    for (const sale of sales) {
        if (!sale.items || !Array.isArray(sale.items)) continue;

        let hasTargetItem = false;
        let matchedItem = "";

        for (const item of sale.items as any[]) {
            const name = (item.name || "").toLowerCase();
            if (name.includes("ночн") || name.includes("стелест") || name.includes("stellest") || name.includes("стеллест")) {
                hasTargetItem = true;
                matchedItem = item.name;
                break;
            }
        }

        if (hasTargetItem) {
            targetPatients.push({
                patientName: sale.customerName || 'Unknown',
                saleDate: sale.createdAt,
                item: matchedItem,
                amount: sale.total
            });
        }
    }

    console.log("\n=== Target Patients ===");
    targetPatients.forEach(p => {
        console.log(`- ${p.patientName} | Date: ${p.saleDate.toISOString()} | Item: ${p.item} | Amount: ${p.amount}`);
    });
    
    let csv = "Пациент,Дата,Товар,Сумма\n";
    targetPatients.forEach(p => {
        csv += `"${p.patientName}","${p.saleDate.toISOString()}","${p.item}",${p.amount}\n`;
    });
    fs.writeFileSync('/Users/daniyarovaruslanovna/Downloads/lera_patients_july.csv', csv);
    console.log("Saved to /Users/daniyarovaruslanovna/Downloads/lera_patients_july.csv");
}

main()
    .catch(e => console.error(e));
