import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
    try {
        const org = await prisma.organization.findFirst({
            where: { name: { contains: 'Бала Vision' } }
        });

        if (!org) {
            return NextResponse.json({ message: 'Org not found' });
        }

        const orgId = org.id;

        // Financial
        const ft = await prisma.financialTransaction.deleteMany({ where: { organizationId: orgId } });
        
        // Cash
        const ct = await prisma.cashTransaction.deleteMany({ where: { cashRegister: { organizationId: orgId } } });
        const cs = await prisma.cashShift.deleteMany({ where: { cashRegister: { organizationId: orgId } } });

        // Appointments
        const ap = await prisma.appointment.deleteMany({ where: { clinicId: orgId } });

        // Orders
        const ord = await prisma.order.deleteMany({ where: { organizationId: orgId } });

        // Sales - SaleItem cascades at DB level
        const s = await prisma.sale.deleteMany({ where: { organizationId: orgId } });

        // Patients
        const p = await prisma.patient.deleteMany({ where: { organizationId: orgId } });

        // Stock Documents & Movements
        const sm = await prisma.stockMovement.deleteMany({ where: { organizationId: orgId } });
        const sd = await prisma.stockDocument.deleteMany({ where: { organizationId: orgId } });

        return NextResponse.json({
            message: 'Deleted test data',
            ft: ft.count,
            ct: ct.count,
            cs: cs.count,
            ap: ap.count,
            ord: ord.count,
            s: s.count,
            p: p.count,
            sm: sm.count,
            sd: sd.count
        });
    } catch (e: any) {
        return NextResponse.json({ message: 'Error', error: e.message });
    }
}
