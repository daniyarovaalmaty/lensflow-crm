import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userOrgId = session.user.organizationId;
        if (!userOrgId) {
            return NextResponse.json({ error: 'No organization linked' }, { status: 400 });
        }

        const contracts = await prisma.contract.findMany({
            where: { clientId: userOrgId },
            include: {
                provider: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(contracts);
    } catch (error) {
        console.error('GET /api/optic/contracts Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userOrgId = session.user.organizationId;
        if (!userOrgId) {
            return NextResponse.json({ error: 'No organization linked' }, { status: 400 });
        }

        const body = await req.json();
        const { number, date, providerId } = body;

        if (!number || !date || !providerId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const contract = await prisma.contract.create({
            data: {
                number,
                date: new Date(date),
                providerId,
                clientId: userOrgId,
                status: 'active'
            },
            include: {
                provider: {
                    select: { id: true, name: true }
                }
            }
        });

        return NextResponse.json(contract);
    } catch (error) {
        console.error('POST /api/optic/contracts Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
