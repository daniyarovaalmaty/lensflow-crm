import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
        if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

        const url = new URL(req.url);
        const startDateParam = url.searchParams.get('startDate');
        const endDateParam = url.searchParams.get('endDate');

        // Default to today if not provided
        const startDate = startDateParam ? new Date(startDateParam) : new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = endDateParam ? new Date(endDateParam) : new Date();
        endDate.setHours(23, 59, 59, 999);

        // Fetch orders for this lab within the date range
        // Since the user said "статусы заказов соответствующие этому дню", we look at updatedAt
        const orders = await prisma.order.findMany({
            where: {
                labOrgId: user.organizationId,
                updatedAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                engineer: true,
                createdBy: true,
            }
        });

        // Data structures for response
        const engineerStats = new Map<string, { inProgress: number, produced: number, transferred: number }>();
        const creatorStats = new Map<string, { totalLenses: number, totalPrice: number, types: Record<string, number> }>();

        // Helper to parse config
        const getLensCountAndType = (config: any) => {
            let count = 0;
            const types: Record<string, number> = {};

            if (config?.eyes?.od) {
                const qty = Number(config.eyes.od.qty || 0);
                count += qty;
                if (qty > 0) {
                    let type = config.eyes.od.characteristic || 'Sph';
                    if (config.eyes.od.isRgp) type = 'RGP';
                    if (config.eyes.od.trial) type = 'Trial';
                    types[type] = (types[type] || 0) + qty;
                }
            }
            if (config?.eyes?.os) {
                const qty = Number(config.eyes.os.qty || 0);
                count += qty;
                if (qty > 0) {
                    let type = config.eyes.os.characteristic || 'Sph';
                    if (config.eyes.os.isRgp) type = 'RGP';
                    if (config.eyes.os.trial) type = 'Trial';
                    types[type] = (types[type] || 0) + qty;
                }
            }
            return { count, types };
        };

        for (const order of orders) {
            const { count, types } = getLensCountAndType(order.lensConfig);
            if (count === 0) continue; // Skip orders with 0 lenses

            // 1. Daily/Engineer Stats
            const engineerName = order.engineer?.fullName || 'Не назначен';
            if (!engineerStats.has(engineerName)) {
                engineerStats.set(engineerName, { inProgress: 0, produced: 0, transferred: 0 });
            }
            const eStats = engineerStats.get(engineerName)!;

            if (['in_production', 'rework'].includes(order.status)) {
                eStats.inProgress += count;
            } else if (['ready', 'docs_prep', 'accountant_review', 'docs_ready'].includes(order.status)) {
                eStats.produced += count;
            } else if (['shipped', 'out_for_delivery', 'delivered'].includes(order.status)) {
                eStats.transferred += count;
            }

            // 2. Creator Stats
            const creatorName = order.createdBy?.fullName || 'Система / Неизвестно';
            if (!creatorStats.has(creatorName)) {
                creatorStats.set(creatorName, { totalLenses: 0, totalPrice: 0, types: {} });
            }
            const cStats = creatorStats.get(creatorName)!;
            cStats.totalLenses += count;
            cStats.totalPrice += (order.totalPrice || 0);
            
            for (const [t, qty] of Object.entries(types)) {
                cStats.types[t] = (cStats.types[t] || 0) + qty;
            }
        }

        // Format for response
        const engineerData = Array.from(engineerStats.entries()).map(([name, stats]) => ({
            name,
            ...stats
        }));

        const creatorData = Array.from(creatorStats.entries()).map(([name, stats]) => ({
            name,
            ...stats
        }));

        return NextResponse.json({
            engineerData,
            creatorData,
        });

    } catch (error: any) {
        console.error('Analytics API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
