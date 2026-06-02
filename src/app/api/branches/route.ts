import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET() {
    const session = await auth();
    if (!session?.user?.organizationId || session.user.subRole !== 'optic_manager') {
        return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const orgId = session.user.organizationId;
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            branches: {
                where: { status: 'active' },
                include: {
                    _count: { select: { users: true, orders: true, patients: true } },
                    userBranches: {
                        include: { user: { select: { id: true, fullName: true, subRole: true } } },
                    },
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!org) {
        return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
    }

    const branches = org.branches.map(b => ({
        id: b.id,
        name: b.name,
        address: b.address,
        city: b.city,
        phone: b.phone,
        crmPhone: b.crmPhone,
        createdAt: b.createdAt,
        usersCount: b._count.users,
        ordersCount: b._count.orders,
        patientsCount: b._count.patients,
        employees: b.userBranches.map(ub => ({
            id: ub.user.id,
            fullName: ub.user.fullName,
            subRole: ub.user.subRole,
        })),
    }));

    return NextResponse.json({
        orgType: org.type,
        orgName: org.name,
        orgCrmPhone: org.crmPhone,
        branches,
    });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.organizationId || session.user.subRole !== 'optic_manager') {
        return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const orgId = session.user.organizationId;
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
        const { name, address, city, phone, crmPhone } = body;
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Название филиала обязательно' }, { status: 400 });
        }

        const currentOrg = await prisma.organization.findUnique({ where: { id: orgId } });
        if (!currentOrg) {
            return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
        }

        if (currentOrg.type === 'branch') {
            return NextResponse.json({ error: 'Филиал не может создавать подфилиалы' }, { status: 400 });
        }

        if (currentOrg.type === 'standalone') {
            await prisma.organization.update({
                where: { id: orgId },
                data: { type: 'headquarters' },
            });
        }

        const branch = await prisma.organization.create({
            data: {
                name: name.trim(),
                type: 'branch',
                parentId: orgId,
                address: address?.trim() || null,
                city: city?.trim() || null,
                phone: phone?.trim() || null,
                crmPhone: crmPhone?.trim() || null,
                status: 'active',
            },
        });

        return NextResponse.json(branch);
    }

    if (action === 'update') {
        const { branchId, name, address, city, phone, crmPhone } = body;
        if (!branchId) return NextResponse.json({ error: 'branchId обязателен' }, { status: 400 });

        const branch = await prisma.organization.findFirst({
            where: { id: branchId, parentId: orgId, type: 'branch' },
        });
        if (!branch) return NextResponse.json({ error: 'Филиал не найден' }, { status: 404 });

        const updated = await prisma.organization.update({
            where: { id: branchId },
            data: {
                ...(name && { name: name.trim() }),
                ...(address !== undefined && { address: address?.trim() || null }),
                ...(city !== undefined && { city: city?.trim() || null }),
                ...(phone !== undefined && { phone: phone?.trim() || null }),
                ...(crmPhone !== undefined && { crmPhone: crmPhone?.trim() || null }),
            },
        });

        return NextResponse.json(updated);
    }

    if (action === 'update_org_crm') {
        const { crmPhone } = body;
        await prisma.organization.update({
            where: { id: orgId },
            data: { crmPhone: crmPhone?.trim() || null },
        });
        return NextResponse.json({ ok: true });
    }

    if (action === 'delete') {
        const { branchId } = body;
        if (!branchId) return NextResponse.json({ error: 'branchId обязателен' }, { status: 400 });

        const branch = await prisma.organization.findFirst({
            where: { id: branchId, parentId: orgId, type: 'branch' },
            include: { _count: { select: { orders: true } } },
        });
        if (!branch) return NextResponse.json({ error: 'Филиал не найден' }, { status: 404 });

        if (branch._count.orders > 0) {
            return NextResponse.json({ error: `Невозможно удалить: ${branch._count.orders} заказов привязано` }, { status: 400 });
        }

        await prisma.organization.update({
            where: { id: branchId },
            data: { status: 'blocked' },
        });

        const remainingBranches = await prisma.organization.count({
            where: { parentId: orgId, type: 'branch', status: 'active' },
        });
        if (remainingBranches === 0) {
            await prisma.organization.update({
                where: { id: orgId },
                data: { type: 'standalone' },
            });
        }

        return NextResponse.json({ ok: true });
    }

    if (action === 'assign_employee') {
        const { branchId, userId } = body;
        if (!branchId || !userId) return NextResponse.json({ error: 'branchId и userId обязательны' }, { status: 400 });

        const branch = await prisma.organization.findFirst({
            where: { id: branchId, parentId: orgId, type: 'branch' },
        });
        if (!branch) return NextResponse.json({ error: 'Филиал не найден' }, { status: 404 });

        const user = await prisma.user.findFirst({
            where: { id: userId, organizationId: orgId },
        });
        if (!user) return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });

        await prisma.userBranch.upsert({
            where: { userId_branchId: { userId, branchId } },
            create: { userId, branchId },
            update: {},
        });

        return NextResponse.json({ ok: true });
    }

    if (action === 'unassign_employee') {
        const { branchId, userId } = body;
        if (!branchId || !userId) return NextResponse.json({ error: 'branchId и userId обязательны' }, { status: 400 });

        await prisma.userBranch.deleteMany({
            where: { userId, branchId },
        });

        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}
