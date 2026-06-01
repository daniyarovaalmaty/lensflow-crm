export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    // Find order by orderNumber (ITG-XXXXXXX) or by DB id
    let order = await prisma.order.findFirst({
        where: {
            OR: [
                { orderNumber: id },
                { orderNumber: id.startsWith('ITG-') ? id : `ITG-${id}` },
                { externalId: `itigris:${id.replace('ITG-', '')}` },
            ],
            source: 'itigris',
        },
        include: {
            patient: { select: { id: true, name: true, phone: true, email: true, birthDate: true, gender: true } },
            organization: { select: { name: true } },
        },
    });

    if (!order) {
        return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    // Check org access
    if (session.user.role === 'optic' && order.organizationId !== session.user.organizationId) {
        return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    return NextResponse.json(order);
}
