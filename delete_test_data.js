import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const org = await prisma.organization.findFirst({
        where: { name: { contains: 'Бала Vision' } }
    });
    if (!org) {
        console.log('Org not found');
        return;
    }
    const orgId = org.id;
    console.log('Deleting for', org.name, orgId);
    // Financial
    const ft = await prisma.financialTransaction.deleteMany({ where: { organizationId: orgId } });
    // Cash
    const ct = await prisma.cashTransaction.deleteMany({ where: { cashRegister: { organizationId: orgId } } });
    const cs = await prisma.cashShift.deleteMany({ where: { cashRegister: { organizationId: orgId } } });
    // Appointments
    const ap = await prisma.appointment.deleteMany({ where: { clinicId: orgId } });
    // Orders
    const ord = await prisma.order.deleteMany({ where: { organizationId: orgId } });
    // Sales
    const si = await prisma.saleItem.deleteMany({ where: { sale: { organizationId: orgId } } });
    const s = await prisma.sale.deleteMany({ where: { organizationId: orgId } });
    // Patients
    const p = await prisma.patient.deleteMany({ where: { organizationId: orgId } });
    // Stock Documents & Movements
    const sm = await prisma.stockMovement.deleteMany({ where: { organizationId: orgId } });
    const sd = await prisma.stockDocument.deleteMany({ where: { organizationId: orgId } });
    console.log(`Deleted ${ft.count} financial transactions`);
    console.log(`Deleted ${ct.count} cash transactions`);
    console.log(`Deleted ${cs.count} cash shifts`);
    console.log(`Deleted ${ap.count} appointments`);
    console.log(`Deleted ${ord.count} orders`);
    console.log(`Deleted ${s.count} sales with ${si.count} items`);
    console.log(`Deleted ${p.count} patients`);
    console.log(`Deleted ${sm.count} stock movements`);
    console.log(`Deleted ${sd.count} stock documents`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
