import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
if (process.env.DIRECT_URL) { process.env.DATABASE_URL = process.env.DIRECT_URL; }

async function main() {
    const prismaModule = await import('../src/lib/db/prisma');
    const prisma = prismaModule.default;

    const org = await prisma.organization.findFirst({
        where: { name: { contains: "NEW EYE", mode: "insensitive" } }
    });
    
    if (!org) return console.log("Organization 'NEW EYE' not found!");

    const startDate = new Date('2026-06-01T19:00:00.000Z'); // Broader search from June
    const endDate = new Date('2026-08-31T19:00:00.000Z');

    const appts = await prisma.appointment.findMany({
        where: { clinicId: org.id, date: { gte: startDate, lte: endDate } },
        include: { createdBy: true }
    });

    for (const a of appts) {
        if (!a.patientName) continue;
        const lower = a.patientName.toLowerCase();
        if (lower.includes("рыспек") || lower.includes("айзара") || lower.includes("дауринбек") || lower.includes("даурынбек") || lower.includes("сария")) {
            console.log(`Found Appt: ${a.patientName} | Date: ${a.date.toISOString()} | Creator: ${a.createdBy?.fullName}`);
        }
    }
}
main().catch(console.error).finally(() => process.exit(0));
