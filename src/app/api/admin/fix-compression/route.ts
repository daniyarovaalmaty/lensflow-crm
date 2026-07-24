export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'laboratory' || session.user.subRole !== 'lab_head') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const orders = await prisma.order.findMany({
            select: { id: true, lensConfig: true }
        });

        let updatedCount = 0;

        for (const order of orders) {
            if (!order.lensConfig || !(order.lensConfig as any).eyes) continue;

            let needsUpdate = false;
            const newConfig = { ...(order.lensConfig as any) };

            ['od', 'os'].forEach(eye => {
                if (newConfig.eyes[eye] && typeof newConfig.eyes[eye].compression_factor === 'number' && newConfig.eyes[eye].compression_factor < 0) {
                    newConfig.eyes[eye].compression_factor = Math.abs(newConfig.eyes[eye].compression_factor);
                    needsUpdate = true;
                }
            });

            if (needsUpdate) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { lensConfig: newConfig }
                });
                updatedCount++;
            }
        }

        return NextResponse.json({ success: true, updatedCount });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
