import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { mmGetPatients, mmCreatePatient, mmPatientToLF } from '@/lib/mm-patient-bridge';

export const dynamic = 'force-dynamic';

// Stages where a patient IS visible (lead has progressed past just being a lead)
// Note: uses Prisma enum names, NOT the @map("new") DB values
const APPOINTMENT_AND_BEYOND: string[] = [
    'appointment',
    'visited',
    'converted',
    'lost',
    'checkup',
    'supplies',
    'renewal',
    'retention_dialog',
    'retention_success',
    'retention_lost',
];

// GET /api/patients — list patients (local + pull from MedMundus on first load)
export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const noSync = searchParams.get('noSync') === '1';
    const limit = 30;

    // Org/doctor ownership filter
    const ownershipFilter = {
        OR: [
            { organizationId: session.user.organizationId || 'none' },
            { doctorId: session.user.id },
        ],
    };

    // Visibility rule:
    //   Show patient if they have NO leads (created manually)
    //   OR if at least one of their leads has reached appointment stage or beyond.
    //   Hide if ALL linked leads are still in new_lead / contacted / qualified.
    const visibilityFilter = {
        OR: [
            // No leads at all → manually created, always show
            { leads: { none: {} } },
            // Has at least one lead that is at appointment stage or beyond
            { leads: { some: { stage: { in: APPOINTMENT_AND_BEYOND } } } },
        ],
    };

    const where: any = {
        AND: [
            ownershipFilter,
            visibilityFilter,
            ...(q ? [{
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                ],
            }] : []),
        ],
    };

    // Sync from MedMundus on first page load (not on search/paginate to keep it fast)
    if (!noSync && page === 1) {
        try {
            const doctorPhone = session.user.profile?.phone;
            const mmPatients = await mmGetPatients(doctorPhone || undefined, undefined);

            for (const mm of mmPatients) {
                const lf = mmPatientToLF(mm);
                const fullName = lf.name.trim();
                if (!fullName || fullName === ' ') continue;

                const normalizedPhone = (lf.phone || '').replace(/[\s\-\+\(\)]/g, '');

                if (normalizedPhone) {
                    const existing = await prisma.patient.findFirst({
                        where: {
                            phone: { contains: normalizedPhone.slice(-9) },
                            OR: [
                                { organizationId: session.user.organizationId || 'none' },
                                { doctorId: session.user.id },
                                { medmundusId: null },
                            ],
                        },
                    });

                    if (existing) {
                        await prisma.patient.update({
                            where: { id: existing.id },
                            data: {
                                medmundusId: existing.medmundusId ?? mm.medmundus_patient_id,
                                name: fullName.length > existing.name.length ? fullName : existing.name,
                                email: existing.email || lf.email,
                                birthDate: existing.birthDate || (lf.birthDate ? new Date(lf.birthDate) : null),
                                gender: existing.gender || lf.gender,
                                ...(session.user.organizationId ? { organizationId: session.user.organizationId } : {}),
                                doctorId: existing.doctorId || session.user.id,
                            },
                        });
                        continue;
                    }
                }

                await prisma.patient.upsert({
                    where: { medmundusId: mm.medmundus_patient_id },
                    update: {
                        name: fullName,
                        phone: lf.phone || '',
                        email: lf.email,
                        birthDate: lf.birthDate ? new Date(lf.birthDate) : null,
                        gender: lf.gender,
                        ...(session.user.organizationId ? { organizationId: session.user.organizationId } : {}),
                        doctorId: session.user.id,
                    },
                    create: {
                        medmundusId: mm.medmundus_patient_id,
                        name: fullName,
                        phone: lf.phone || '',
                        email: lf.email,
                        birthDate: lf.birthDate ? new Date(lf.birthDate) : null,
                        gender: lf.gender,
                        organizationId: session.user.organizationId || null,
                        doctorId: session.user.id,
                    },
                });
            }
        } catch (e) {
            console.warn('[PatientSync] MedMundus sync failed:', e);
        }
    }

    const [patients, total] = await Promise.all([
        prisma.patient.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                _count: { select: { orders: true, prescriptions: true } },
                prescriptions: {
                    orderBy: { prescribedAt: 'desc' },
                    take: 1,
                },
                sales: {
                    select: { total: true },
                },
            },
        }),
        prisma.patient.count({ where }),
    ]);

    // Compute totalSpent per patient from their sales
    const enriched = patients.map((p: any) => {
        const totalSpent = (p.sales || []).reduce((sum: number, s: any) => sum + (s.total || 0), 0);
        const { sales, ...rest } = p;
        return { ...rest, totalSpent };
    });

    return NextResponse.json({ patients: enriched, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/patients — create patient locally AND push to MedMundus
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, phone, email, birthDate, gender, notes, doctorId } = body;

    if (!name || !phone) {
        return NextResponse.json({ error: 'ФИО и телефон обязательны' }, { status: 400 });
    }

    let medmundusId: number | null = null;
    try {
        medmundusId = await mmCreatePatient({
            name: name.trim(),
            phone: phone.trim(),
            email: email?.trim() || undefined,
            birthDate: birthDate || undefined,
            gender: gender || undefined,
            doctorPhone: session.user.profile?.phone || undefined,
        });
    } catch (e) {
        console.warn('[PatientSync] Could not push to MedMundus:', e);
    }

    const patient = await prisma.patient.create({
        data: {
            medmundusId: medmundusId || undefined,
            name: name.trim(),
            phone: phone.trim(),
            email: email?.trim() || null,
            birthDate: birthDate ? new Date(birthDate) : null,
            gender: gender || null,
            notes: notes || null,
            organizationId: session.user.organizationId || null,
            doctorId: doctorId || session.user.id || null,
        },
    });

    return NextResponse.json(patient, { status: 201 });
}
