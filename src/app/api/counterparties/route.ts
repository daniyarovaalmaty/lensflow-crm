export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/counterparties - Rich counterparty data for lab
 * Returns doctors (with clinic name) and organizations
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'laboratory') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get all organizations
        const organizations = await prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                city: true,
                inn: true,
                discountPercent: true,
                status: true,
                _count: { select: { orders: true, users: true } },
            },
            orderBy: { name: 'asc' },
        });

        // Get all orders with doctor info
        const orders = await prisma.order.findMany({
            select: {
                id: true,
                orderNumber: true,
                doctorName: true,
                totalPrice: true,
                paymentStatus: true,
                createdAt: true,
                isUrgent: true,
                status: true,
                organizationId: true,
                organization: { select: { name: true } },
                createdBy: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        organizationId: true,
                        discountPercent: true,
                        organization: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Build doctor map
        const doctorMap = new Map<string, {
            id: string;
            name: string;
            email: string;
            clinicName: string;
            clinicId: string;
            hasOrg: boolean;
            discountPercent: number | null;
            orders: number;
            revenue: number;
            unpaid: number;
            lastDate: string;
        }>();

        orders.forEach(order => {
            const doctorName = order.doctorName || order.createdBy?.fullName || 'Не указан';
            const doctorId = order.createdBy?.id || doctorName;
            const existing = doctorMap.get(doctorId) || {
                id: doctorId,
                name: doctorName,
                email: order.createdBy?.email || '',
                clinicName: order.createdBy?.organization?.name || order.organization?.name || '',
                clinicId: order.createdBy?.organizationId || order.organizationId || '',
                hasOrg: !!(order.createdBy?.organizationId),
                discountPercent: order.createdBy?.discountPercent ?? null,
                orders: 0,
                revenue: 0,
                unpaid: 0,
                lastDate: '',
            };
            existing.orders++;
            existing.revenue += order.totalPrice || 0;
            if (order.paymentStatus !== 'paid') existing.unpaid += order.totalPrice || 0;
            const dateStr = order.createdAt.toISOString();
            if (!existing.lastDate || dateStr > existing.lastDate) existing.lastDate = dateStr;
            doctorMap.set(doctorId, existing);
        });

        // Build clinic data from orders for revenue
        const clinicOrderData = new Map<string, { revenue: number; unpaid: number; orderCount: number; lastDate: string }>();
        orders.forEach(order => {
            const orgId = order.organizationId;
            if (!orgId) return;
            const existing = clinicOrderData.get(orgId) || { revenue: 0, unpaid: 0, orderCount: 0, lastDate: '' };
            existing.orderCount++;
            existing.revenue += order.totalPrice || 0;
            if (order.paymentStatus !== 'paid') existing.unpaid += order.totalPrice || 0;
            const dateStr = order.createdAt.toISOString();
            if (!existing.lastDate || dateStr > existing.lastDate) existing.lastDate = dateStr;
            clinicOrderData.set(orgId, existing);
        });

        const clinics = organizations.map(org => {
            const orderData = clinicOrderData.get(org.id) || { revenue: 0, unpaid: 0, orderCount: 0, lastDate: '' };
            return {
                id: org.id,
                name: org.name,
                phone: org.phone,
                email: org.email,
                city: org.city,
                inn: org.inn,
                discountPercent: org.discountPercent,
                status: org.status,
                orders: orderData.orderCount,
                revenue: orderData.revenue,
                unpaid: orderData.unpaid,
                lastDate: orderData.lastDate,
                staffCount: org._count.users,
            };
        });

        return NextResponse.json({
            doctors: Array.from(doctorMap.values()).sort((a, b) => b.orders - a.orders),
            clinics: clinics.sort((a, b) => b.orders - a.orders),
        });
    } catch (error) {
        console.error('GET /api/counterparties error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
