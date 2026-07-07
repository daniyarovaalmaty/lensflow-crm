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
        odSph, odCyl, odAx, odAdd, odPd, odPdNear, odPrism, odBc, odDia,
        osSph, osCyl, osAx, osAdd, osPd, osPdNear, osPrism, osBc, osDia,
        visualAcuityODAfter, visualAcuityOSAfter,
        pdTotal, type, notes, prescribedAt,
        refraction, cycloplegia, complaints, medicalHistory, diseaseHistory, biomicroscopy, pzo
    } = body;

    const prescription = await prisma.prescription.create({
        data: {
            patientId: params.id,
            doctorId: session.user.id,
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
            refraction: refraction || null,
            cycloplegia: cycloplegia || null,
            complaints: complaints || null,
            medicalHistory: medicalHistory || null,
            diseaseHistory: diseaseHistory || null,
            biomicroscopy: biomicroscopy || null,
            pzo: pzo || null,
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
                doctorPhone: session.user.profile?.phone || undefined,
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
