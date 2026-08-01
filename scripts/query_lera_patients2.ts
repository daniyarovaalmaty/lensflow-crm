import * as fs from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
if (process.env.DIRECT_URL) { process.env.DATABASE_URL = process.env.DIRECT_URL; }

async function main() {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const org = await prisma.organization.findFirst({ where: { name: { contains: "NEW EYE", mode: "insensitive" } } });
    if (!org) return;

    const lera = await prisma.user.findFirst({ where: { fullName: { contains: "Валерия", mode: "insensitive" }, organizationId: org.id } });
    if (!lera) return;

    const startDate = new Date('2026-06-30T19:00:00.000Z'); 
    const endDate = new Date('2026-07-31T19:00:00.000Z');

    const appointments = await prisma.appointment.findMany({
        where: { createdById: lera.id, date: { gte: startDate, lte: endDate } }
    });

    const patientNames = Array.from(new Set(appointments.map((a: any) => a.patientName).filter(Boolean))) as string[];
    
    // Also let's check sales where Lera was the performedBy, just in case "записала" means she was the seller
    const sales = await prisma.sale.findMany({
        where: {
            organizationId: org.id,
            createdAt: { gte: startDate, lte: endDate },
        }
    });

    console.log("=== All Sales in July for patients scheduled by Lera or where Lera was seller ===");
    for (const sale of sales) {
        if (!sale.items || !Array.isArray(sale.items)) continue;
        const isScheduledByLera = sale.customerName && patientNames.includes(sale.customerName);
        const isPerformedByLera = sale.performedById === lera.id;
        
        if (isScheduledByLera || isPerformedByLera) {
            for (const item of sale.items as any[]) {
                console.log(`- Patient: ${sale.customerName} | Item: ${item.name} | Category: ${item.category} | Seller: ${isPerformedByLera ? 'Lera' : 'Other'} | ApptBy: ${isScheduledByLera ? 'Lera' : 'Other'}`);
            }
        }
    }
}
main().catch(console.error).finally(() => process.exit(0));
