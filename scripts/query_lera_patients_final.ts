import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
}

import * as fs from 'fs';

async function main() {
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

    // Get patients scheduled by Lera
    const appointments = await prisma.appointment.findMany({
        where: {
            createdById: lera.id,
            date: { gte: startDate, lte: endDate }
        }
    });
    
    // We match by patient name or by patient id
    const patientIdsScheduled = Array.from(new Set(appointments.map((a: any) => a.patientId).filter(Boolean))) as string[];
    const patientNamesScheduled = Array.from(new Set(appointments.map((a: any) => a.patientName).filter(Boolean))) as string[];

    // Get sales in July WITH items
    const sales = await prisma.sale.findMany({
        where: {
            organizationId: org.id,
            createdAt: { gte: startDate, lte: endDate },
        },
        include: { items: true }
    });

    const targetPatients: any[] = [];

    for (const sale of sales) {
        if (!sale.items || sale.items.length === 0) continue;

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
            // Did Lera schedule this patient or was Lera the performer?
            const isScheduledByName = sale.customerName && patientNamesScheduled.includes(sale.customerName);
            const isScheduledById = sale.patientId && patientIdsScheduled.includes(sale.patientId);
            const isScheduled = isScheduledByName || isScheduledById;
            
            const isPerformed = sale.performedById === lera.id;
            const isDoctor = sale.doctorId === lera.id;

            if (isScheduled || isPerformed || isDoctor) {
                targetPatients.push({
                    patientName: sale.customerName || 'Unknown',
                    saleDate: sale.createdAt,
                    item: matchedItem,
                    amount: sale.total,
                    role: isScheduled ? 'Scheduled' : (isPerformed ? 'Seller' : 'Doctor')
                });
            }
        }
    }

    console.log("\n=== Target Patients ===");
    targetPatients.forEach(p => {
        console.log(`- ${p.patientName} | Date: ${p.saleDate.toISOString()} | Item: ${p.item} | Amount: ${p.amount} | Lera Role: ${p.role}`);
    });
    
    let csv = "Пациент,Дата,Товар,Сумма\n";
    targetPatients.forEach(p => {
        csv += `"${p.patientName}","${p.saleDate.toISOString()}","${p.item}",${p.amount}\n`;
    });
    fs.writeFileSync('/Users/daniyarovaruslanovna/Downloads/lera_patients_july.csv', csv);
    console.log("Saved to /Users/daniyarovaruslanovna/Downloads/lera_patients_july.csv");
}

main().catch(e => console.error(e)).finally(() => process.exit(0));
