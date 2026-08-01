import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
if (process.env.DIRECT_URL) { process.env.DATABASE_URL = process.env.DIRECT_URL; }

import * as fs from 'fs';

async function main() {
    const prismaModule = await import('../src/lib/db/prisma');
    const prisma = prismaModule.default;

    const org = await prisma.organization.findFirst({ where: { name: { contains: "NEW EYE", mode: "insensitive" } } });
    if (!org) return;

    const lera = await prisma.user.findFirst({
        where: { 
            fullName: { contains: "Валерия", mode: "insensitive" },
            organizationId: org.id
        }
    });

    const startDate = new Date('2026-06-30T19:00:00.000Z'); 
    const endDate = new Date('2026-07-31T19:00:00.000Z');

    const sales = await prisma.sale.findMany({
        where: {
            organizationId: org.id,
            createdAt: { gte: startDate, lte: endDate },
        }
    });

    console.log(`Total sales in July in NEW EYE: ${sales.length}`);

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
            // Found a sale! Let's check who recorded the appointment for this patient in July
            const appts = await prisma.appointment.findMany({
                where: { 
                    clinicId: org.id,
                    patientName: sale.customerName,
                    date: { gte: startDate, lte: endDate }
                },
                include: { createdBy: true }
            });

            // If the user "Валерия" (Lera) created any of these appointments:
            const leraAppt = appts.find((a: any) => a.createdById === lera?.id);
            
            if (leraAppt) {
                targetPatients.push({
                    patientName: sale.customerName || 'Unknown',
                    saleDate: sale.createdAt,
                    item: matchedItem,
                    amount: sale.total
                });
            }
        }
    }

    console.log(`\nFound ${targetPatients.length} target patients who bought these items and were scheduled by Lera.`);
    targetPatients.forEach(p => {
        console.log(`- ${p.patientName} | Date: ${p.saleDate.toISOString()} | Item: ${p.item} | Amount: ${p.amount}`);
    });
    
    let csv = "Пациент,Дата,Товар,Сумма\n";
    targetPatients.forEach(p => {
        csv += `"${p.patientName}","${p.saleDate.toISOString()}","${p.item}",${p.amount}\n`;
    });
    fs.writeFileSync('/Users/daniyarovaruslanovna/Downloads/Lera_NightLenses_Stellest_July2026.csv', csv);
    console.log("Saved to /Users/daniyarovaruslanovna/Downloads/Lera_NightLenses_Stellest_July2026.csv");
}
main().catch(console.error).finally(() => process.exit(0));
