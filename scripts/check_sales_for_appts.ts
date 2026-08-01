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

    const lera = await prisma.user.findFirst({
        where: { fullName: { contains: "Валерия", mode: "insensitive" }, organizationId: org.id }
    });

    const sales = await prisma.sale.findMany({
        where: { 
            organizationId: org.id,
            OR: [
                { customerName: { contains: "Рыспек", mode: "insensitive" } },
                { customerName: { contains: "Дауринбек", mode: "insensitive" } },
                { customerName: { contains: "Даурынбек", mode: "insensitive" } }
            ]
        }
    });

    for (const s of sales) {
        console.log(`Found Sale: ${s.customerName} | PatientId: ${s.patientId} | SaleId: ${s.id} | Date: ${s.createdAt}`);
        
        if (s.patientId) {
            const appts = await prisma.appointment.findMany({
                where: { patientId: s.patientId },
                include: { createdBy: true }
            });
            console.log(`  -> Patient has ${appts.length} appointments:`);
            for (const a of appts) {
                console.log(`     - Date: ${a.date.toISOString()} | Creator: ${a.createdBy?.fullName} | Name in appt: ${a.patientName}`);
                // Reassign if found
                if (a.createdById !== lera.id) {
                    await prisma.appointment.update({ where: { id: a.id }, data: { createdById: lera.id } });
                    console.log(`       -> Reassigned to Lera!`);
                }
            }
        }
    }
}
main().catch(console.error).finally(() => process.exit(0));
