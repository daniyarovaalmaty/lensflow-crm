import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// DELETE /api/consultations/[id]
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.consultation.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}

// PUT /api/consultations/[id]
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const updated = await prisma.consultation.update({
        where: { id: params.id },
        data: {
            visitDate: body.visitDate ? new Date(body.visitDate) : undefined,
            type: body.type,
            diagnosis: body.diagnosis,
            treatment: body.treatment,
            nextVisit: body.nextVisit ? new Date(body.nextVisit) : null,
            intraocularPressureOD: body.intraocularPressureOD ? parseFloat(body.intraocularPressureOD) : null,
            intraocularPressureOS: body.intraocularPressureOS ? parseFloat(body.intraocularPressureOS) : null,
            visualAcuityOD: body.visualAcuityOD ? parseFloat(body.visualAcuityOD) : null,
            visualAcuityOS: body.visualAcuityOS ? parseFloat(body.visualAcuityOS) : null,
            k1OD: body.k1OD ? parseFloat(body.k1OD) : null,
            k2OD: body.k2OD ? parseFloat(body.k2OD) : null,
            axisOD: body.axisOD ? parseFloat(body.axisOD) : null,
            astigmatismOD: body.astigmatismOD ? parseFloat(body.astigmatismOD) : null,
            pachymetryOD: body.pachymetryOD ? parseFloat(body.pachymetryOD) : null,
            eccentricityOD: body.eccentricityOD ? parseFloat(body.eccentricityOD) : null,
            k1OS: body.k1OS ? parseFloat(body.k1OS) : null,
            k2OS: body.k2OS ? parseFloat(body.k2OS) : null,
            axisOS: body.axisOS ? parseFloat(body.axisOS) : null,
            astigmatismOS: body.astigmatismOS ? parseFloat(body.astigmatismOS) : null,
            pachymetryOS: body.pachymetryOS ? parseFloat(body.pachymetryOS) : null,
            eccentricityOS: body.eccentricityOS ? parseFloat(body.eccentricityOS) : null,
            lensFittingOD: body.lensFittingOD,
            lensFittingOS: body.lensFittingOS,
            refractionOD: body.refractionOD,
            refractionOS: body.refractionOS,
            notes: body.notes,
        },
    });
    return NextResponse.json(updated);
}
