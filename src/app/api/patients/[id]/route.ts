import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { mmUpdatePatient } from '@/lib/mm-patient-bridge';
import { ItigrisApiClient, ItigrisSyncService } from '@/lib/itigris';

export const dynamic = 'force-dynamic';


// GET /api/patients/[id]
export async function GET(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const patient = await prisma.patient.findUnique({
        where: { id: params.id },
        include: {
            prescriptions: { orderBy: { prescribedAt: 'desc' } },
            sales: { orderBy: { createdAt: 'desc' }, include: { items: true, doctor: true } },
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
            doctor: { select: { id: true, fullName: true } },
            parent: true,
            children: true,
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
    const { name, phone, email, birthDate, gender, notes, doctorId, attachments, parentId } = body;

    const updateData: any = {
        name: name?.trim(),
        phone: phone?.trim(),
        email: email?.trim() || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        notes: notes || null,
        doctorId: doctorId || null,
        parentId: parentId || null,
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

    // Sync to ITIGRIS (Optima) if linked and the org has ITIGRIS configured.
    // Loop-safe: the inbound ITIGRIS→LensFlow sync writes via prisma directly,
    // not through this route, so it won't bounce back.
    if (patient.externalId?.startsWith('itigris:') && patient.organizationId) {
        try {
            const org = await prisma.organization.findUnique({ where: { id: patient.organizationId } });
            const itg = (org as any)?.metadata?.itigris;
            if (itg?.company && itg?.login && itg?.password) {
                const client = new ItigrisApiClient({
                    company: itg.company,
                    login: itg.login,
                    password: itg.password,
                    departmentId: Number(itg.departmentId) || 0,
                    organizationId: patient.organizationId,
                });
                const svc = new ItigrisSyncService(client, prisma as any, patient.organizationId);
                await svc.pushPatient(patient.id); // linked → safe partial update (PUT merge)
            }
        } catch (e) {
            console.warn('[PatientSync] ITIGRIS update failed:', e);
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
