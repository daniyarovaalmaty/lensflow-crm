export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/counterparties/[id] - Get details for a specific counterparty
 * type=clinic → org info + orders
 * type=doctor → doctor info + orders
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'laboratory') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'clinic';

        if (type === 'clinic') {
            const org = await prisma.organization.findUnique({
                where: { id: params.id },
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
                    status: true,
                    createdAt: true,
                    users: {
                        select: { id: true, fullName: true, email: true, subRole: true, phone: true },
                        orderBy: { fullName: 'asc' },
                    },
                },
            });
            if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

            const orders = await prisma.order.findMany({
                where: { organizationId: params.id },
                select: {
                    orderNumber: true,
                    doctorName: true,
                    totalPrice: true,
                    paymentStatus: true,
                    status: true,
                    isUrgent: true,
                    createdAt: true,
                    patient: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });

            const statusMap: Record<string, string> = {
                'new_order': 'new', 'in_production': 'in_production', 'ready': 'ready',
                'rework': 'rework', 'shipped': 'shipped', 'out_for_delivery': 'out_for_delivery',
                'delivered': 'delivered', 'cancelled': 'cancelled',
            };

            return NextResponse.json({
                type: 'clinic',
                data: org,
                orders: orders.map(o => ({
                    order_id: o.orderNumber,
                    doctor: o.doctorName,
                    patient: o.patient?.name || '',
                    total_price: o.totalPrice,
                    payment_status: o.paymentStatus,
                    status: statusMap[o.status] || o.status,
                    is_urgent: o.isUrgent,
                    created_at: o.createdAt.toISOString(),
                })),
            });
        } else {
            // Doctor detail
            const user = await prisma.user.findUnique({
                where: { id: params.id },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    subRole: true,
                    discountPercent: true,
                    organization: { select: { id: true, name: true } },
                    createdAt: true,
                },
            });

            // Get orders by this doctor
            const orders = await prisma.order.findMany({
                where: { createdById: params.id },
                select: {
                    orderNumber: true,
                    doctorName: true,
                    totalPrice: true,
                    paymentStatus: true,
                    status: true,
                    isUrgent: true,
                    createdAt: true,
                    patient: { select: { name: true } },
                    organization: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });

            const statusMap: Record<string, string> = {
                'new_order': 'new', 'in_production': 'in_production', 'ready': 'ready',
                'rework': 'rework', 'shipped': 'shipped', 'out_for_delivery': 'out_for_delivery',
                'delivered': 'delivered', 'cancelled': 'cancelled',
            };

            return NextResponse.json({
                type: 'doctor',
                data: user || { id: params.id, fullName: 'Не найден' },
                orders: orders.map(o => ({
                    order_id: o.orderNumber,
                    doctor: o.doctorName,
                    patient: o.patient?.name || '',
                    clinic: o.organization?.name || '',
                    total_price: o.totalPrice,
                    payment_status: o.paymentStatus,
                    status: statusMap[o.status] || o.status,
                    is_urgent: o.isUrgent,
                    created_at: o.createdAt.toISOString(),
                })),
            });
        }
    } catch (error) {
        console.error('GET /api/counterparties/[id] error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
