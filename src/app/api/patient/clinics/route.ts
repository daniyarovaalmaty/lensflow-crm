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
 * GET /api/patient/clinics — Public list of clinics/optics from LensFlow
 * Optional filter: ?city=Алматы
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const city = searchParams.get('city');

        const where: any = { status: 'active' };
        if (city) {
            where.city = { contains: city, mode: 'insensitive' };
        }

        const orgs = await prisma.organization.findMany({
            where,
            include: {
                users: {
                    where: { role: 'doctor', status: 'active' },
                    select: { id: true, fullName: true, phone: true, email: true, avatar: true },
                    orderBy: { fullName: 'asc' },
                },
                _count: { select: { orders: true } },
            },
            orderBy: { name: 'asc' },
            take: 100,
        });

        const result = orgs.map((org: any) => ({
            id: org.id,
            name: org.name,
            logo: org.logo || null,
            city: org.city || '',
            address: org.actualAddress || org.address || '',
            phone: org.phone || '',
            email: org.email || '',
            contactPerson: org.contactPerson || '',
            contactPhone: org.contactPhone || '',
            totalOrders: org._count.orders,
            doctors: org.users.map((u: any) => ({
                id: u.id,
                name: u.fullName || 'Врач',
                phone: u.phone || '',
                avatar: u.avatar || null,
            })),
        }));

        return NextResponse.json(
            { clinics: result, count: result.length },
            { headers: CORS_HEADERS }
        );
    } catch (error: any) {
        console.error('GET /api/patient/clinics error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch clinics' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
