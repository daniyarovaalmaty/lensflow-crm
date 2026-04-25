import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const clinicId = searchParams.get('clinicId');
        const doctorId = searchParams.get('doctorId');

        const where: any = {
            appointmentAt: { not: null }
        };

        if (clinicId) where.clinicId = clinicId;
        if (doctorId) where.doctorId = doctorId;

        // Fetch leads with appointments
        const leads = await prisma.lead.findMany({
            where,
            include: {
                doctor: { select: { id: true, fullName: true, email: true } },
                clinic: { select: { id: true, name: true } },
                assignee: { select: { id: true, fullName: true } }
            },
            orderBy: {
                appointmentAt: 'asc'
            }
        });

        // Also fetch filter options (clinics and doctors that have appointments)
        // For a more complete filter, we should just fetch all clinics/doctors, but this is fine for now
        const doctors = await prisma.user.findMany({
            where: { role: 'doctor' },
            select: { id: true, fullName: true }
        });
        
        const clinics = await prisma.organization.findMany({
            where: { status: 'active' },
            select: { id: true, name: true }
        });

        return NextResponse.json({ leads, doctors, clinics });
    } catch (error) {
        console.error('[CRM Appointments GET]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
