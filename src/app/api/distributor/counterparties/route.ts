import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/distributor/counterparties
 */
export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const distributorOrgId = session.user.organizationId!;

    const orders = await prisma.order.findMany({
        where: { distributorOrgId },
        select: {
            id: true,
            organizationId: true,
            opticName: true,
            totalPrice: true,
            paymentStatus: true,
            status: true,
            createdAt: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                    type: true,
                    phone: true,
                    email: true,
                    city: true,
                    inn: true,
                    address: true,
                    contactPerson: true,
                    contactPhone: true,
                    discountPercent: true,
                    status: true,
                    createdAt: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const counterpartyMap = new Map<string, any>();

    for (const order of orders) {
        const key = order.organizationId || `anon:${order.opticName || 'Неизвестная оптика'}`;
        const label = order.organization?.name || order.opticName || 'Неизвестная оптика';

        if (!counterpartyMap.has(key)) {
            counterpartyMap.set(key, {
                id: key,
                organizationId: order.organizationId,
                name: label,
                type: order.organization?.type || 'standalone',
                phone: order.organization?.phone || null,
                email: order.organization?.email || null,
                city: order.organization?.city || null,
                inn: order.organization?.inn || null,
                address: order.organization?.address || null,
                contactPerson: order.organization?.contactPerson || null,
                contactPhone: order.organization?.contactPhone || null,
                discountPercent: order.organization?.discountPercent || 0,
                status: order.organization?.status || 'active',
                memberSince: order.organization?.createdAt || order.createdAt,
                totalOrders: 0,
                totalRevenue: 0,
                unpaidAmount: 0,
                lastOrderAt: null,
            });
        }

        const cp = counterpartyMap.get(key)!;
        cp.totalOrders += 1;
        cp.totalRevenue += order.totalPrice || 0;
        if (order.paymentStatus === 'unpaid' || order.paymentStatus === 'partial') {
            cp.unpaidAmount += order.totalPrice || 0;
        }
        if (!cp.lastOrderAt || order.createdAt > cp.lastOrderAt) {
            cp.lastOrderAt = order.createdAt;
        }
    }

    const counterparties = Array.from(counterpartyMap.values());
    counterparties.sort((a, b) => b.totalOrders - a.totalOrders);

    return NextResponse.json(counterparties);
}

/**
 * POST /api/distributor/counterparties — create a new counterparty organization
 */
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const sub = session.user.subRole;
    if (sub !== 'dist_head' && sub !== 'dist_admin' && sub !== 'dist_manager') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
        name, phone, email, city, inn, address,
        contactPerson, contactPhone, discountPercent
    } = body;

    if (!name?.trim()) {
        return NextResponse.json({ error: 'Название обязательно' }, { status: 400 });
    }

    const org = await prisma.organization.create({
        data: {
            name: name.trim(),
            type: 'standalone',
            phone: phone?.trim() || undefined,
            email: email?.trim() || undefined,
            city: city?.trim() || undefined,
            inn: inn?.trim() || undefined,
            address: address?.trim() || undefined,
            contactPerson: contactPerson?.trim() || undefined,
            contactPhone: contactPhone?.trim() || undefined,
            discountPercent: Number(discountPercent) || 0,
            status: 'active',
        },
    });

    return NextResponse.json(org, { status: 201 });
}
