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

// PATCH /api/consultations/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const updated = await prisma.consultation.update({
        where: { id: params.id },
        data: {
            ...(body.visitDate && { visitDate: new Date(body.visitDate) }),
            ...(body.type && { type: body.type }),
            ...(body.diagnosis !== undefined && { diagnosis: body.diagnosis }),
            ...(body.treatment !== undefined && { treatment: body.treatment }),
            ...(body.nextVisit !== undefined && { nextVisit: body.nextVisit ? new Date(body.nextVisit) : null }),
            ...(body.notes !== undefined && { notes: body.notes }),
        },
    });
    return NextResponse.json(updated);
}
