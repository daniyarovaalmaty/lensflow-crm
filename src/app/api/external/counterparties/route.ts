export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { validateExternalApiKey } from '@/lib/external-auth';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/external/counterparties — Return all counterparties (clinics/optics)
 * 
 * MedMundus uses this to show clinic dropdown when a doctor creates an order,
 * ensuring clinic names match between the two systems.
 * 
 * Headers: x-api-key: <EXTERNAL_API_KEY>
 */
export async function GET(request: NextRequest) {
    const authError = validateExternalApiKey(request);
    if (authError) return authError;

    try {
        const orgs = await prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                city: true,
                discountPercent: true,
                status: true,
            },
            where: { status: 'active' },
            orderBy: { name: 'asc' },
        });

        const result = orgs.map(o => ({
            id: o.id,
            name: o.name,
            city: o.city,
            discount_percent: o.discountPercent,
        }));

        return NextResponse.json({ counterparties: result, count: result.length });

    } catch (error: any) {
        console.error('External GET /api/external/counterparties error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch counterparties' },
            { status: 500 }
        );
    }
}
