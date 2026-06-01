import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = (session.user as any).organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const meta = (org as any)?.metadata || {};
    const itigrisConnected = !!meta.itigris?.company;

    const [patientsTotal, patientsFromItigris, ordersTotal, ordersFromItigris, lastSync] = await Promise.all([
        (prisma as any).patient.count({ where: { organizationId: orgId } }),
        (prisma as any).patient.count({ where: { organizationId: orgId, externalSource: 'itigris' } }),
        (prisma as any).order.count({ where: { organizationId: orgId } }),
        (prisma as any).order.count({ where: { organizationId: orgId, source: 'itigris' } }),
        (prisma as any).itigrisSyncLog.findFirst({
            where: { organizationId: orgId },
            orderBy: { syncedAt: 'desc' },
        }),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlySales = await (prisma as any).sale.aggregate({
        where: { organizationId: orgId, createdAt: { gte: startOfMonth } },
        _sum: { total: true },
    });

    return NextResponse.json({
        itigrisConnected,
        itigrisCompany: meta.itigris?.company || null,
        itigrisConnectedAt: meta.itigris?.connectedAt || null,
        lastSyncAt: lastSync?.syncedAt || null,
        stats: {
            patientsTotal,
            patientsFromItigris,
            ordersTotal,
            ordersFromItigris,
            monthlyRevenue: monthlySales._sum.total || 0,
        },
    });
}
