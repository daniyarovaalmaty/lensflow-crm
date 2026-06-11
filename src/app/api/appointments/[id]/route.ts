import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const includeRels = {
    patient: { select: { id: true, name: true, phone: true } },
    doctor: { select: { id: true, fullName: true } },
    clinic: { select: { id: true, name: true } },
};

// GET /api/appointments/[id]
export async function GET(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const appointment = await prisma.appointment.findUnique({
        where: { id: params.id },
        include: includeRels,
    });
    if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(appointment);
}

// PATCH /api/appointments/[id] — reschedule / change status / edit.
// Body: { startAt?, endAt?, status?, notes?, doctorId?, patientId?, clinicId? }
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.appointment.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { startAt, endAt, status, notes, doctorId, patientId, clinicId } = body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes || null;
    if (patientId !== undefined) data.patientId = patientId || null;
    if (clinicId !== undefined) data.clinicId = clinicId || null;
    if (doctorId !== undefined) data.doctorId = doctorId || null;
    if (startAt !== undefined) {
        const s = new Date(startAt);
        if (isNaN(s.getTime())) return NextResponse.json({ error: 'Некорректный startAt' }, { status: 400 });
        data.startAt = s;
    }
    if (endAt !== undefined) data.endAt = endAt ? new Date(endAt) : null;

    // Re-check slot only when schedule/doctor changes and the appointment stays active.
    const scheduleChanged = startAt !== undefined || endAt !== undefined || doctorId !== undefined;
    if (scheduleChanged && status !== 'cancelled') {
        const effDoctor = doctorId !== undefined ? doctorId : existing.doctorId;
        const effStart = data.startAt ?? existing.startAt;
        const effEnd = (endAt !== undefined ? data.endAt : existing.endAt) ?? new Date(effStart.getTime() + 30 * 60000);

        if (effDoctor) {
            const conflict = await prisma.appointment.findFirst({
                where: {
                    id: { not: params.id },
                    doctorId: effDoctor,
                    status: { not: 'cancelled' },
                    startAt: { lt: effEnd },
                    OR: [{ endAt: { gt: effStart } }, { endAt: null, startAt: { gte: effStart } }],
                },
                select: { id: true },
            });
            if (conflict) {
                return NextResponse.json(
                    { error: 'Слот занят: у врача уже есть запись на это время', conflictId: conflict.id },
                    { status: 409 },
                );
            }
        }
    }

    // Bump sync version so the outbox/MedMundus side can tell this change is newer.
    data.syncVersion = { increment: 1 };

    const updated = await prisma.appointment.update({
        where: { id: params.id },
        data,
        include: includeRels,
    });
    return NextResponse.json(updated);
}

// DELETE /api/appointments/[id] — hard delete (use PATCH status='cancelled' to keep history).
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.appointment.delete({ where: { id: params.id } }).catch(() => null);
    return NextResponse.json({ success: true });
}
