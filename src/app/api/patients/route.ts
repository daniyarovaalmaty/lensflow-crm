import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// GET /api/patients — list patients for current org
export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 30;

    const where: any = {
        organizationId: session.user.organizationId || undefined,
    };
    if (q) {
        where.OR = [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
        ];
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

// POST /api/patients — create patient
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, phone, email, birthDate, gender, notes, doctorId } = body;

    if (!name || !phone) {
        return NextResponse.json({ error: 'ФИО и телефон обязательны' }, { status: 400 });
    }

    const patient = await prisma.patient.create({
        data: {
            name: name.trim(),
            phone: phone.trim(),
            email: email?.trim() || null,
            birthDate: birthDate ? new Date(birthDate) : null,
            gender: gender || null,
            notes: notes || null,
            organizationId: session.user.organizationId || null,
            doctorId: doctorId || null,
        },
    });

    return NextResponse.json(patient, { status: 201 });
}
