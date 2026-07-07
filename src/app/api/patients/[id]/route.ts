import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { mmUpdatePatient } from '@/lib/mm-patient-bridge';

export const dynamic = 'force-dynamic';


// GET /api/patients/[id]
export async function GET(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const patient = await prisma.patient.findUnique({
        where: { id: params.id },
        include: {
            prescriptions: { orderBy: { prescribedAt: 'desc' } },
            orders: {
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: {
                    id: true,
                    orderNumber: true,
                    status: true,
                    createdAt: true,
                    totalPrice: true,
                    isUrgent: true,
                    source: true,
                },
            },
            sales: {
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    items: true,
                    doctor: true
                }
            },
            doctor: { select: { id: true, fullName: true } },
        },
    });

    if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(patient);
}

// PUT /api/patients/[id]
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { 
        name, phone, email, birthDate, gender, notes, doctorId, attachments,
        iin, address, profession, complaints, anamnesisDisease, anamnesisLife,
        allergies, heredity, medications, dispensary, surgeries, lastCorrection
    } = body;

    const updateData: any = {
        name: name?.trim(),
        phone: phone?.trim(),
        email: email?.trim() || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        notes: notes || null,
        doctorId: doctorId || null,
        iin: iin || null,
        address: address || null,
        profession: profession || null,
        complaints: complaints || null,
        anamnesisDisease: anamnesisDisease || null,
        anamnesisLife: anamnesisLife || null,
        allergies: allergies || null,
        heredity: heredity || null,
        medications: medications || null,
        dispensary: dispensary || null,
        surgeries: surgeries || null,
        lastCorrection: lastCorrection || null,
    };

    if (attachments !== undefined) {
        updateData.attachments = attachments;
    }

    const patient = await prisma.patient.update({
        where: { id: params.id },
        data: updateData,
    });

    // Sync to MedMundus if linked
    if (patient.medmundusId) {
        try {
            await mmUpdatePatient(patient.medmundusId, {
                name: patient.name,
                phone: patient.phone,
                email: patient.email || undefined,
                birthDate: patient.birthDate?.toISOString().split('T')[0],
                gender: patient.gender || undefined,
            });
        } catch (e) {
            console.warn('[PatientSync] MM update failed:', e);
        }
    }

    return NextResponse.json(patient);
}

// DELETE /api/patients/[id]
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.patient.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}
