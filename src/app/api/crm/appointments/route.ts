import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

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

        const orgId = session.user.organizationId;
        let allowedOrgIds: string[] = orgId ? [orgId] : [];
        
        if (orgId) {
            const org = await prisma.organization.findUnique({
                where: { id: orgId },
                select: { type: true },
            });

            if (org?.type === 'headquarters') {
                const branches = await prisma.organization.findMany({
                    where: { parentId: orgId, status: 'active' },
                    select: { id: true },
                });
                allowedOrgIds = [orgId, ...branches.map(b => b.id)];
            }
        }

        if (clinicId) {
            where.clinicId = clinicId;
        } else if (orgId) {
            where.clinicId = { in: allowedOrgIds };
        }

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
        const doctors = await prisma.user.findMany({
            where: { 
                organizationId: { in: allowedOrgIds },
                subRole: { in: ['optic_doctor', 'doctor'] }
            },
            select: { id: true, fullName: true }
        });
        
        const clinics = await prisma.organization.findMany({
            where: { 
                id: { in: allowedOrgIds },
                status: 'active' 
            },
            select: { id: true, name: true }
        });

        return NextResponse.json({ leads, doctors, clinics });
    } catch (error) {
        console.error('[CRM Appointments GET]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
