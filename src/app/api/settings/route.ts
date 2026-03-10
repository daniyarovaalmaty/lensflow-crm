export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/settings - Get lab settings
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const settings = await prisma.labSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default' },
            update: {},
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error('GET /api/settings error:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

/**
 * PATCH /api/settings - Update lab settings (lab_head / lab_admin only)
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const sub = session.user.subRole;
        if (sub !== 'lab_head' && sub !== 'lab_admin') {
            return NextResponse.json({ error: 'Только руководитель может изменять настройки' }, { status: 403 });
        }

        const body = await request.json();
        const { urgentSurchargePercent, urgentDiscountPercent } = body;

        const updateData: any = {};
        if (urgentSurchargePercent != null) updateData.urgentSurchargePercent = Math.max(0, Math.min(100, Number(urgentSurchargePercent)));
        if (urgentDiscountPercent != null) updateData.urgentDiscountPercent = Math.max(0, Math.min(100, Number(urgentDiscountPercent)));

        const settings = await prisma.labSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', ...updateData },
            update: updateData,
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error('PATCH /api/settings error:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
