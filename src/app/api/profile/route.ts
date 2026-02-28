import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// GET /api/profile — get current user profile
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatar: true,
            role: true,
            subRole: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                    inn: true,
                    phone: true,
                    email: true,
                    address: true,
                    city: true,
                    actualAddress: true,
                    deliveryAddress: true,
                    bankName: true,
                    bik: true,
                    iban: true,
                    directorName: true,
                    contactPerson: true,
                    contactPhone: true,
                    discountPercent: true,
                },
            },
        },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
}

// PUT /api/profile — update current user profile + organization
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, phone, avatar, organization } = body;

    // Update user fields
    const updateData: any = {};
    if (typeof fullName === 'string') updateData.fullName = fullName.trim();
    if (typeof phone === 'string') updateData.phone = phone.trim() || null;
    if (typeof avatar === 'string' || avatar === null) updateData.avatar = avatar;

    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatar: true,
            role: true,
            subRole: true,
            organizationId: true,
        },
    });

    // Update organization fields (only for optic_manager)
    if (organization && user.organizationId && session.user.subRole === 'optic_manager') {
        const orgData: any = {};
        const orgFields = [
            'name', 'inn', 'phone', 'email', 'address', 'city',
            'actualAddress', 'deliveryAddress', 'bankName', 'bik',
            'iban', 'directorName', 'contactPerson', 'contactPhone',
        ];
        for (const f of orgFields) {
            if (organization[f] !== undefined) {
                orgData[f] = typeof organization[f] === 'string' ? organization[f].trim() || null : organization[f];
            }
        }
        // 'name' should never be null
        if (orgData.name === null) orgData.name = '';

        if (Object.keys(orgData).length > 0) {
            await prisma.organization.update({
                where: { id: user.organizationId },
                data: orgData,
            });
        }
    }

    return NextResponse.json(user);
}
