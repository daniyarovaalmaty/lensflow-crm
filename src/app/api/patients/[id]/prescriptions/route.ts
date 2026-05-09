import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { mmPushPrescription } from '@/lib/mm-patient-bridge';


// POST /api/patients/[id]/prescriptions — add prescription
export async function POST(request: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
        odSph, odCyl, odAx, odAdd, odPd,
        osSph, osCyl, osAx, osAdd, osPd,
        pdTotal, type, notes, prescribedAt,
    } = body;

    const prescription = await prisma.prescription.create({
        data: {
            patientId: params.id,
            doctorId: session.user.id,
            odSph: odSph != null ? parseFloat(odSph) : null,
            odCyl: odCyl != null ? parseFloat(odCyl) : null,
            odAx: odAx != null ? parseFloat(odAx) : null,
            odAdd: odAdd != null ? parseFloat(odAdd) : null,
            odPd: odPd != null ? parseFloat(odPd) : null,
            osSph: osSph != null ? parseFloat(osSph) : null,
            osCyl: osCyl != null ? parseFloat(osCyl) : null,
            osAx: osAx != null ? parseFloat(osAx) : null,
            osAdd: osAdd != null ? parseFloat(osAdd) : null,
            osPd: osPd != null ? parseFloat(osPd) : null,
            pdTotal: pdTotal != null ? parseFloat(pdTotal) : null,
            type: type || 'glasses',
            notes: notes || null,
            prescribedAt: prescribedAt ? new Date(prescribedAt) : new Date(),
        },
    });

    // Push Rx to MedMundus as a PatientNote
    const patient = await prisma.patient.findUnique({ where: { id: params.id } });
    if (patient?.medmundusId) {
        try {
            await mmPushPrescription(patient.medmundusId, {
                doctorPhone: session.user.phone || undefined,
                date: prescribedAt || new Date().toISOString().split('T')[0],
                rxType: type || 'glasses',
                od: { sph: prescription.odSph ?? undefined, cyl: prescription.odCyl ?? undefined, ax: prescription.odAx ?? undefined, add: prescription.odAdd ?? undefined, pd: prescription.odPd ?? undefined },
                os: { sph: prescription.osSph ?? undefined, cyl: prescription.osCyl ?? undefined, ax: prescription.osAx ?? undefined, add: prescription.osAdd ?? undefined, pd: prescription.osPd ?? undefined },
                pdTotal: prescription.pdTotal ?? undefined,
            });
        } catch (e) {
            console.warn('[PatientSync] MM prescription push failed:', e);
        }
    }

    return NextResponse.json(prescription, { status: 201 });
}

// GET /api/patients/[id]/prescriptions
export async function GET(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const prescriptions = await prisma.prescription.findMany({
        where: { patientId: params.id },
        orderBy: { prescribedAt: 'desc' },
    });

    return NextResponse.json(prescriptions);
}
