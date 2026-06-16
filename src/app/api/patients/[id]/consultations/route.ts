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
        k1OD, k2OD, axisOD, astigmatismOD, pachymetryOD, eccentricityOD,
        k1OS, k2OS, axisOS, astigmatismOS, pachymetryOS, eccentricityOS
    } = body;

    const parseNum = (val: any) => (val === '' || val == null || isNaN(parseFloat(val))) ? null : parseFloat(val);

    const consultation = await prisma.consultation.create({
        data: {
            patientId: params.id,
            doctorId: session.user.id,
            visitDate: visitDate ? new Date(visitDate) : new Date(),
            type: type || 'exam',
            diagnosis: diagnosis || null,
            treatment: treatment || null,
            nextVisit: nextVisit ? new Date(nextVisit) : null,
            intraocularPressureOD: parseNum(intraocularPressureOD),
            intraocularPressureOS: parseNum(intraocularPressureOS),
            visualAcuityOD: parseNum(visualAcuityOD),
            visualAcuityOS: parseNum(visualAcuityOS),
            k1OD: parseNum(k1OD), k2OD: parseNum(k2OD), axisOD: parseNum(axisOD), astigmatismOD: parseNum(astigmatismOD), pachymetryOD: parseNum(pachymetryOD), eccentricityOD: parseNum(eccentricityOD),
            k1OS: parseNum(k1OS), k2OS: parseNum(k2OS), axisOS: parseNum(axisOS), astigmatismOS: parseNum(astigmatismOS), pachymetryOS: parseNum(pachymetryOS), eccentricityOS: parseNum(eccentricityOS),
            notes: notes || null,
        },
        include: { doctor: { select: { fullName: true } } },
    });

    return NextResponse.json(consultation, { status: 201 });
}
