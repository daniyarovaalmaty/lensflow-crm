export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/patient/clinics/[id] — Full clinic profile
 * Returns: clinic info, staff, public products & services
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: params.id },
            include: {
                users: {
                    where: { status: 'active' },
                    select: {
                        id: true, fullName: true, phone: true, email: true,
                        avatar: true, role: true, subRole: true,
                    },
                    orderBy: { fullName: 'asc' },
                },
                opticProducts: {
                    where: { isActive: true, isPublic: true },
                    select: {
                        id: true, name: true, category: true, type: true,
                        brand: true, model: true, shortDescription: true,
                        retailPrice: true, images: true, currentStock: true, unit: true,
                    },
                    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                    take: 100,
                },
                _count: { select: { orders: true } },
            },
        });

        if (!org) {
            return NextResponse.json(
                { error: 'Clinic not found' },
                { status: 404, headers: CORS_HEADERS }
            );
        }

        const ROLE_LABELS: Record<string, string> = {
            doctor: 'Врач',
            optic_manager: 'Менеджер',
            optic_doctor: 'Врач-оптик',
            optic_accountant: 'Бухгалтер',
        };

        const result = {
            id: org.id,
            name: org.name,
            inn: org.inn || '',
            phone: org.phone || '',
            email: org.email || '',
            address: org.address || '',
            actualAddress: org.actualAddress || '',
            deliveryAddress: org.deliveryAddress || '',
            city: org.city || '',
            directorName: org.directorName || '',
            contactPerson: org.contactPerson || '',
            contactPhone: org.contactPhone || '',
            bankName: org.bankName || '',
            bik: org.bik || '',
            iban: org.iban || '',
            totalOrders: org._count.orders,
            staff: org.users.map((u: any) => ({
                id: u.id,
                name: u.fullName || '',
                phone: u.phone || '',
                email: u.email || '',
                avatar: u.avatar || null,
                role: ROLE_LABELS[u.subRole] || ROLE_LABELS[u.role] || u.role,
            })),
            products: (org.opticProducts as any[]).filter((p: any) => p.type === 'product').map((p: any) => ({
                id: p.id,
                name: p.name,
                category: p.category,
                brand: p.brand || '',
                model: p.model || '',
                description: p.shortDescription || '',
                price: p.retailPrice,
                images: p.images || [],
                inStock: p.currentStock > 0,
            })),
            services: (org.opticProducts as any[]).filter((p: any) => p.type === 'service').map((p: any) => ({
                id: p.id,
                name: p.name,
                category: p.category,
                description: p.shortDescription || '',
                price: p.retailPrice,
            })),
        };

        return NextResponse.json(result, { headers: CORS_HEADERS });
    } catch (error: any) {
        console.error('GET /api/patient/clinics/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch clinic' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
