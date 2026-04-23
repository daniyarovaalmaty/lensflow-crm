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
 * GET /api/patient/doctors — Public list of doctors from LensFlow
 * Optional filters: ?city=Алматы&org_id=xxx
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const city = searchParams.get('city');
        const orgId = searchParams.get('org_id');

        const where: any = {
            role: 'doctor',
            status: 'active',
        };

        if (orgId) where.organizationId = orgId;

        const users = await prisma.user.findMany({
            where,
            include: {
                organization: {
                    select: { id: true, name: true, city: true, phone: true, address: true },
                },
            },
            orderBy: { fullName: 'asc' },
            take: 200,
        });

        // Filter by city (from organization)
        let filtered = users;
        if (city) {
            const normalizedCity = city.toLowerCase();
            filtered = users.filter((u: any) =>
                u.organization?.city?.toLowerCase().includes(normalizedCity)
            );
        }

        const result = filtered.map((u: any) => ({
            id: u.id,
            name: u.fullName || 'Врач',
            phone: u.phone || '',
            email: u.email,
            avatar: u.avatar || null,
            clinic: u.organization ? {
                id: u.organization.id,
                name: u.organization.name,
                city: u.organization.city || '',
                address: u.organization.address || '',
                phone: u.organization.phone || '',
            } : null,
        }));

        return NextResponse.json(
            { doctors: result, count: result.length },
            { headers: CORS_HEADERS }
        );
    } catch (error: any) {
        console.error('GET /api/patient/doctors error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch doctors' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
