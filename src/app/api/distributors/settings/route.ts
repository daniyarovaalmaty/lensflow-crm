import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// GET /api/distributors/settings — get distributor org settings (defaultLabId)
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
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
            defaultLabId: true,
            defaultLab: {
                select: { id: true, name: true, phone: true, email: true, city: true },
            },
        },
    });

    return NextResponse.json(org);
}

// PATCH /api/distributors/settings — update default lab
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json();
    const { 
        defaultLabId, name, inn, phone, email, address, city, 
        actualAddress, deliveryAddress, bankName, bik, iban, 
        directorName, contactPerson, contactPhone 
    } = body;

    const dataToUpdate: any = {};
    if (defaultLabId !== undefined) dataToUpdate.defaultLabId = defaultLabId || null;
    if (name !== undefined) dataToUpdate.name = name;
    if (inn !== undefined) dataToUpdate.inn = inn;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (email !== undefined) dataToUpdate.email = email;
    if (address !== undefined) dataToUpdate.address = address;
    if (city !== undefined) dataToUpdate.city = city;
    if (actualAddress !== undefined) dataToUpdate.actualAddress = actualAddress;
    if (deliveryAddress !== undefined) dataToUpdate.deliveryAddress = deliveryAddress;
    if (bankName !== undefined) dataToUpdate.bankName = bankName;
    if (bik !== undefined) dataToUpdate.bik = bik;
    if (iban !== undefined) dataToUpdate.iban = iban;
    if (directorName !== undefined) dataToUpdate.directorName = directorName;
    if (contactPerson !== undefined) dataToUpdate.contactPerson = contactPerson;
    if (contactPhone !== undefined) dataToUpdate.contactPhone = contactPhone;

    const updated = await prisma.organization.update({
        where: { id: orgId },
        data: dataToUpdate,
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
            defaultLabId: true,
            defaultLab: {
                select: { id: true, name: true, phone: true, email: true, city: true },
            },
        },
    });

    return NextResponse.json(updated);
}
