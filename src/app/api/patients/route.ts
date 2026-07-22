import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { mmGetPatients, mmCreatePatient, mmPatientToLF } from '@/lib/mm-patient-bridge';

export const dynamic = 'force-dynamic';

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
            const doctorPhone = session.user.profile?.phone;
            const mmPatients = await mmGetPatients(doctorPhone || undefined, undefined);

            for (const mm of mmPatients) {
                const lf = mmPatientToLF(mm);
                const fullName = lf.name.trim();
                if (!fullName || fullName === ' ') continue;

                // Normalize phone for dedup comparison
                const normalizedPhone = (lf.phone || '').replace(/\D/g, '');

                // If phone exists, link medmundusId to that existing record (no duplicate)
                if (normalizedPhone) {
                    const existing = await prisma.patient.findFirst({
                        where: {
                            phone: { contains: normalizedPhone.slice(-9) }, // match last 9 digits
                            OR: [
                                { organizationId: session.user.organizationId || 'none' },
                                { doctorId: session.user.id },
                                { medmundusId: null },
                            ],
                        },
                    });

                    if (existing) {
                        // Update existing record with MM data
                        await prisma.patient.update({
                            where: { id: existing.id },
                            data: {
                                medmundusId: existing.medmundusId ?? mm.medmundus_patient_id,
                                // Use the fuller name (longer = more complete)
                                name: fullName.length > existing.name.length ? fullName : existing.name,
                                email: existing.email || lf.email,
                                birthDate: existing.birthDate || (lf.birthDate ? new Date(lf.birthDate) : null),
                                gender: existing.gender || lf.gender,
                                ...(session.user.organizationId ? { organizationId: session.user.organizationId } : {}),
                                doctorId: existing.doctorId || session.user.id,
                            },
                        });
                        continue; // don't create a new record
                    }
                }

                // No match by phone — upsert by medmundusId
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
                _count: { select: { orders: true, prescriptions: true, consultations: true } },
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
    const { 
        name, phone, email, birthDate, gender, notes, doctorId, parentId,
        iin, address, profession, complaints, anamnesisDisease, anamnesisLife,
        allergies, heredity, medications, dispensary, surgeries, lastCorrection
    } = body;

    if (!name || !phone) {
        return NextResponse.json({ error: 'ФИО и телефон обязательны' }, { status: 400 });
    }

    // Deduplication check: if a patient with the exact same normalized phone AND matching name exists, return it
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length >= 9) {
        const existing = await prisma.patient.findFirst({
            where: {
                phone: { contains: normalizedPhone.slice(-9) },
                OR: [
                    { organizationId: session.user.organizationId || 'none' },
                    { doctorId: session.user.id }
                ]
            }
        });
        
        if (existing) {
            // Check if name is somewhat similar (e.g. at least one word matches)
            const nameWords = name.trim().toLowerCase().split(' ');
            const existingName = existing.name.toLowerCase();
            const matchesName = nameWords.some((w: string) => w.length > 2 && existingName.includes(w));
            
            if (matchesName || nameWords.length === 0 || name.trim().toLowerCase() === 'неизвестный пациент') {
                return NextResponse.json(existing, { status: 200 }); // Return existing instead of duplicate
            }
        }
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
            parentId: parentId || null,
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
        },
    });

    // Push to Itigris if configured
    if (session.user.organizationId) {
        try {
            const org = await prisma.organization.findUnique({
                where: { id: session.user.organizationId }
            });
            const meta = org?.metadata as any;
            if (meta?.itigris?.company) {
                const { ItigrisApiClient } = await import('@/lib/itigris/client');
                const { ItigrisSyncService } = await import('@/lib/itigris/sync');
                
                const itigrisApi = new ItigrisApiClient({
                    company: meta.itigris.company,
                    login: meta.itigris.login,
                    password: meta.itigris.password,
                    departmentId: meta.itigris.departmentId,
                    organizationId: session.user.organizationId
                });
                
                const syncService = new ItigrisSyncService(itigrisApi, prisma as any, session.user.organizationId);
                await syncService.pushPatient(patient.id, { createIfMissing: true });
            }
        } catch (e) {
            console.warn('[PatientSync] Could not push to Itigris:', e);
        }
    }

    return NextResponse.json(patient, { status: 201 });
}

