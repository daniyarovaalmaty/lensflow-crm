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

        if (session.user.role === 'doctor' || session.user.subRole === 'optic_doctor') {
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

        return NextResponse.json(appointments);
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
        if (session.user.role === 'doctor' || session.user.subRole === 'optic_doctor') {
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
                createdBy: { select: { id: true, fullName: true } }
            }
        });

        return NextResponse.json(appointment);
    } catch (error: any) {
        console.error('[APPOINTMENTS_POST]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}
