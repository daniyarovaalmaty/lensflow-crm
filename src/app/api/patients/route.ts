import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { mmGetPatients, mmCreatePatient, mmPatientToLF } from '@/lib/mm-patient-bridge';

// GET /api/patients — list patients (local + pull from MedMundus on first load)
export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const noSync = searchParams.get('noSync') === '1'; // skip sync for subsequent pages
    const limit = 30;

    // Build base filter — show org patients OR doctor's own patients
    const where: any = {
        OR: [
            { organizationId: session.user.organizationId || 'none' },
            { doctorId: session.user.id },
        ],
    };

    if (q) {
        where.AND = [{
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
            ]
        }];
    }

    // Sync from MedMundus on first page load (not on search/paginate to keep it fast)
    if (!noSync && page === 1) {
        try {
            // Fetch all MM patients (doctor-filtered or all if admin)
            const doctorPhone = session.user.phone;
            const mmPatients = await mmGetPatients(doctorPhone || undefined, undefined);

            for (const mm of mmPatients) {
                const lf = mmPatientToLF(mm);
                // Skip nameless records
                const fullName = lf.name.trim();
                if (!fullName || fullName === ' ') continue;

                await prisma.patient.upsert({
                    where: { medmundusId: mm.medmundus_patient_id },
                    update: {
                        name: fullName,
                        phone: lf.phone || '',
                        email: lf.email,
                        birthDate: lf.birthDate ? new Date(lf.birthDate) : null,
                        gender: lf.gender,
                        // Only set org/doctor if not already set to avoid overwriting manual links
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
            },
        }),
        prisma.patient.count({ where }),
    ]);

    return NextResponse.json({ patients, total, page, pages: Math.ceil(total / limit) });
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

    // Push to MedMundus first to get their ID
    let medmundusId: number | null = null;
    try {
        medmundusId = await mmCreatePatient({
            name: name.trim(),
            phone: phone.trim(),
            email: email?.trim() || undefined,
            birthDate: birthDate || undefined,
            gender: gender || undefined,
            doctorPhone: session.user.phone || undefined,
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

