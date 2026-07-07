import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.prescription.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
        odSph, odCyl, odAx, odAdd, odPd, odPdNear, odPrism, odBc, odDia,
        osSph, osCyl, osAx, osAdd, osPd, osPdNear, osPrism, osBc, osDia,
        visualAcuityODAfter, visualAcuityOSAfter,
        pdTotal, type, notes
    } = body;

    const prescription = await prisma.prescription.update({
        where: { id: params.id },
        data: {
            odSph: odSph != null && !isNaN(parseFloat(odSph)) ? parseFloat(odSph) : null,
            odCyl: odCyl != null && !isNaN(parseFloat(odCyl)) ? parseFloat(odCyl) : null,
            odAx: odAx != null && !isNaN(parseFloat(odAx)) ? parseFloat(odAx) : null,
            odAdd: odAdd != null && !isNaN(parseFloat(odAdd)) ? parseFloat(odAdd) : null,
            odPd: odPd != null && !isNaN(parseFloat(odPd)) ? parseFloat(odPd) : null,
            odPdNear: odPdNear != null && !isNaN(parseFloat(odPdNear)) ? parseFloat(odPdNear) : null,
            odPrism: odPrism || null,
            odBc: odBc || null,
            odDia: odDia || null,
            osSph: osSph != null && !isNaN(parseFloat(osSph)) ? parseFloat(osSph) : null,
            osCyl: osCyl != null && !isNaN(parseFloat(osCyl)) ? parseFloat(osCyl) : null,
            osAx: osAx != null && !isNaN(parseFloat(osAx)) ? parseFloat(osAx) : null,
            osAdd: osAdd != null && !isNaN(parseFloat(osAdd)) ? parseFloat(osAdd) : null,
            osPd: osPd != null && !isNaN(parseFloat(osPd)) ? parseFloat(osPd) : null,
            osPdNear: osPdNear != null && !isNaN(parseFloat(osPdNear)) ? parseFloat(osPdNear) : null,
            osPrism: osPrism || null,
            osBc: osBc || null,
            osDia: osDia || null,
            visualAcuityODAfter: visualAcuityODAfter != null && !isNaN(parseFloat(visualAcuityODAfter)) ? parseFloat(visualAcuityODAfter) : null,
            visualAcuityOSAfter: visualAcuityOSAfter != null && !isNaN(parseFloat(visualAcuityOSAfter)) ? parseFloat(visualAcuityOSAfter) : null,
            pdTotal: pdTotal != null && !isNaN(parseFloat(pdTotal)) ? parseFloat(pdTotal) : null,
            type: type || 'glasses',
            notes: notes || null,
        },
    });

    return NextResponse.json(prescription);
}
