import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const where: any = {
            clinicId: session.user.organizationId,
        };

        if (session.user.role === 'doctor' || ['optic_doctor', 'optic_ophthalmologist', 'optic_orthokeratologist'].includes(session.user.subRole as string)) {
            // "для руководителя расписание коллен, для тек доктора только свое расписание"
            // If the user is an optic_doctor, they only see their own appointments, 
            // BUT wait, optic_manager or optic_admin can see everyone's.
            where.doctorId = session.user.id;
        }

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                patient: true,
                doctor: {
                    select: { id: true, fullName: true, avatar: true },
                },
                createdBy: {
                    select: { id: true, fullName: true },
                }
            },
            orderBy: { date: 'asc' },
        });

        // Step 4: Sync Itigris Appointments on-the-fly
        let itigrisAppointments: any[] = [];
        try {
            const org = await prisma.organization.findUnique({
                where: { id: session.user.organizationId },
            });
            const itg = (org as any)?.metadata?.itigris;
            if (itg && itg.company && itg.login && itg.password) {
                const { createItigrisClient } = await import('@/lib/itigris/client');
                const client = createItigrisClient({
                    company: itg.company,
                    login: itg.login,
                    password: itg.password,
                    departmentId: itg.departmentId,
                    organizationId: session.user.organizationId,
                });
                
                const records = await client.getRegistryRecords({
                    appointmentFrom: startDate || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
                    appointmentTo: endDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
                });

                // Fetch Itigris doctors to map ID to name if needed (optional)
                
                itigrisAppointments = records.map((r: any) => ({
                    id: `itigris-${r.id}`,
                    date: new Date(r.date),
                    duration: r.duration || 30,
                    status: r.status === 'CANCELLED' ? 'cancelled' : r.status === 'COMPLETED' ? 'completed' : 'scheduled',
                    type: 'consultation',
                    notes: r.comment || '',
                    patientId: null,
                    patientName: r.clientFullName || 'Пациент из Itigris',
                    patientPhone: r.clientPhone || '',
                    doctorId: r.doctorId ? `itigris-${r.doctorId}` : null,
                    clinicId: session.user.organizationId,
                    createdById: 'itigris',
                    source: 'itigris', // Virtual flag
                    doctor: { fullName: r.doctorFullName || 'Врач (Itigris)' },
                    patient: null
                }));
                
                // If user is a doctor, filter Itigris appointments by their name or ID if possible. 
                // Currently returning all or filtering by doctorId if we have mapping.
            }
        } catch (error) {
            console.warn('[APPOINTMENTS_GET] Itigris fetch failed:', error);
        }

        const merged = [...appointments, ...itigrisAppointments].sort((a, b) => a.date.getTime() - b.date.getTime());

        return NextResponse.json(merged);
    } catch (error: any) {
        console.error('[APPOINTMENTS_GET]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { date, duration, patientId, patientName, patientPhone, type, notes } = body;

        let doctorId = body.doctorId || session.user.id; // manager can specify doctorId, doctor uses their own

        // validate that doctor can only create for themselves unless manager
        if (session.user.role === 'doctor' || ['optic_doctor', 'optic_ophthalmologist', 'optic_orthokeratologist'].includes(session.user.subRole as string)) {
            doctorId = session.user.id;
        }

        const appointment = await prisma.appointment.create({
            data: {
                date: new Date(date),
                duration: parseInt(duration) || 30,
                status: 'scheduled',
                type: type || 'consultation',
                notes: notes,
                patientId: patientId || null,
                patientName: !patientId ? patientName : null,
                patientPhone: !patientId ? patientPhone : null,
                doctorId: doctorId,
                clinicId: session.user.organizationId,
                createdById: session.user.id,
            },
            include: {
                patient: true,
                doctor: { select: { id: true, fullName: true } },
                createdBy: { select: { id: true, fullName: true, email: true, phone: true } }
            }
        });

        return NextResponse.json(appointment);
    } catch (error: any) {
        console.error('[APPOINTMENTS_POST]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}
