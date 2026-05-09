import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// GET /api/patients/[id]/consultations
export async function GET(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const consultations = await prisma.consultation.findMany({
        where: { patientId: params.id },
        include: { doctor: { select: { fullName: true } } },
        orderBy: { visitDate: 'desc' },
    });

    return NextResponse.json(consultations);
}

// POST /api/patients/[id]/consultations
export async function POST(request: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
        visitDate, type, diagnosis, treatment,
        nextVisit, intraocularPressureOD, intraocularPressureOS,
        visualAcuityOD, visualAcuityOS, notes,
    } = body;

    const consultation = await prisma.consultation.create({
        data: {
            patientId: params.id,
            doctorId: session.user.id,
            visitDate: visitDate ? new Date(visitDate) : new Date(),
            type: type || 'exam',
            diagnosis: diagnosis || null,
            treatment: treatment || null,
            nextVisit: nextVisit ? new Date(nextVisit) : null,
            intraocularPressureOD: intraocularPressureOD != null ? parseFloat(intraocularPressureOD) : null,
            intraocularPressureOS: intraocularPressureOS != null ? parseFloat(intraocularPressureOS) : null,
            visualAcuityOD: visualAcuityOD != null ? parseFloat(visualAcuityOD) : null,
            visualAcuityOS: visualAcuityOS != null ? parseFloat(visualAcuityOS) : null,
            notes: notes || null,
        },
        include: { doctor: { select: { fullName: true } } },
    });

    return NextResponse.json(consultation, { status: 201 });
}
