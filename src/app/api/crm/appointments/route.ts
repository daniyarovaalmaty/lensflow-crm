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
                assignee: { select: { id: true, fullName: true, email: true, phone: true } }
            },
            orderBy: {
                appointmentAt: 'asc'
            }
        });

        // Fetch regular clinic appointments
        const apptWhere: any = {};
        if (clinicId) {
            apptWhere.clinicId = clinicId;
        } else if (orgId) {
            apptWhere.clinicId = { in: allowedOrgIds };
        }
        if (doctorId) apptWhere.doctorId = doctorId;

        const appointments = await prisma.appointment.findMany({
            where: apptWhere,
            include: {
                doctor: { select: { id: true, fullName: true, email: true } },
                patient: true,
                createdBy: { select: { id: true, fullName: true, email: true, phone: true } }
            }
        });

        // Map appointments to match Lead format for the frontend calendar
        const mappedAppointments = appointments.map(app => ({
            id: `appt-${app.id}`, // prefix to avoid id collision
            name: app.patientName || app.patient?.name || 'Пациент клиники',
            phone: app.patientPhone || app.patient?.phone || '—',
            appointmentAt: app.date,
            appointmentNotes: app.notes || app.type,
            doctor: app.doctor ? { id: app.doctor.id, fullName: app.doctor.fullName || app.doctor.email || '' } : null,
            duration: app.duration,
            clinic: null, // we don't have clinic name easily accessible here without another join, but it's fine
            createdBy: app.createdBy ? { id: app.createdBy.id, fullName: app.createdBy.fullName || app.createdBy.email || app.createdBy.phone || 'Сотрудник' } : null
        }));

        const mappedLeads = leads.map(lead => ({
            ...lead,
            createdBy: lead.assignee ? { id: lead.assignee.id, fullName: lead.assignee.fullName || lead.assignee.email || lead.assignee.phone || 'Сотрудник' } : null
        }));

        // Combine and sort
        const combinedLeads = [...mappedLeads, ...mappedAppointments].sort((a: any, b: any) => {
            return new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime();
        });

        // Also fetch filter options (clinics and doctors that have appointments)
        const doctors = await prisma.user.findMany({
            where: { 
                organizationId: { in: allowedOrgIds },
                subRole: { in: ['optic_doctor', 'optic_ophthalmologist', 'optic_orthokeratologist', 'doctor'] }
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

        return NextResponse.json({ leads: combinedLeads, doctors, clinics });
    } catch (error) {
        console.error('[CRM Appointments GET]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
