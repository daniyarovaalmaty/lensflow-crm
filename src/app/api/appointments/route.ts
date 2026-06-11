import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// GET /api/appointments — list appointments (org-scoped), optional filters:
//   ?doctorId= &patientId= &clinicId= &from=ISO &to=ISO
export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');
    const clinicId = searchParams.get('clinicId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {};

    // Scope to the user's clinic when they belong to one; otherwise allow explicit clinic filter.
    if (session.user.organizationId) where.clinicId = session.user.organizationId;
    else if (clinicId) where.clinicId = clinicId;

    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (from || to) {
        where.startAt = {};
        if (from) where.startAt.gte = new Date(from);
        if (to) where.startAt.lte = new Date(to);
    }

    const appointments = await prisma.appointment.findMany({
        where,
        include: {
            patient: { select: { id: true, name: true, phone: true } },
            doctor: { select: { id: true, fullName: true } },
            clinic: { select: { id: true, name: true } },
        },
        orderBy: { startAt: 'asc' },
        take: 500,
    });

    return NextResponse.json({ appointments });
}

// POST /api/appointments — create an appointment with a slot-conflict check.
// Body: { patientId?, doctorId, clinicId?, startAt, endAt?, status?, notes?, leadId? }
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { patientId, doctorId, clinicId, startAt, endAt, status, notes, leadId } = body;

    if (!startAt) return NextResponse.json({ error: 'startAt обязателен' }, { status: 400 });
    if (!doctorId) return NextResponse.json({ error: 'doctorId обязателен' }, { status: 400 });

    const start = new Date(startAt);
    if (isNaN(start.getTime())) return NextResponse.json({ error: 'Некорректный startAt' }, { status: 400 });
    // Default visit length: 30 min if no end provided.
    const end = endAt ? new Date(endAt) : new Date(start.getTime() + 30 * 60 * 1000);

    // Slot conflict: same doctor, overlapping window, not cancelled.
    // Rows with an explicit endAt overlap if endAt > start; open-ended rows count if they start within the window.
    const conflict = await prisma.appointment.findFirst({
        where: {
            doctorId,
            status: { not: 'cancelled' },
            startAt: { lt: end },
            OR: [
                { endAt: { gt: start } },
                { endAt: null, startAt: { gte: start } },
            ],
        },
        select: { id: true, startAt: true },
    });
    if (conflict) {
        return NextResponse.json(
            { error: 'Слот занят: у врача уже есть запись на это время', conflictId: conflict.id },
            { status: 409 },
        );
    }

    const appointment = await prisma.appointment.create({
        data: {
            patientId: patientId || null,
            doctorId,
            clinicId: clinicId || session.user.organizationId || null,
            startAt: start,
            endAt: end,
            status: status || 'booked',
            notes: notes || null,
            leadId: leadId || null,
            source: 'lensflow',
        },
        include: {
            patient: { select: { id: true, name: true, phone: true } },
            doctor: { select: { id: true, fullName: true } },
            clinic: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json(appointment, { status: 201 });
}
