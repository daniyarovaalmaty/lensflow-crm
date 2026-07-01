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

        const org = await prisma.organization.findUnique({
            where: { id: userOrgId },
            select: { parentId: true }
        });

        const orgIds = [userOrgId];
        if (org?.parentId) {
            orgIds.push(org.parentId);
        }

        const contracts = await prisma.contract.findMany({
            where: {
                OR: [
                    { clientId: { in: orgIds } },
                    { client: { parentId: userOrgId } }
                ]
            },
            include: {
                provider: {
                    select: { id: true, name: true }
                },
                client: {
                    select: { id: true, name: true, type: true }
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
        const { number, date, providerId, document, branchId } = body;

        if (!number || !date || !providerId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        let targetClientId = userOrgId;
        if (branchId) {
            const branch = await prisma.organization.findFirst({
                where: { id: branchId, parentId: userOrgId }
            });
            if (!branch) {
                return NextResponse.json({ error: 'Филиал не найден или нет доступа' }, { status: 404 });
            }
            targetClientId = branchId;
        }

        const contract = await prisma.contract.create({
            data: {
                number,
                date: new Date(date),
                providerId,
                clientId: targetClientId,
                status: 'active',
                document: document || null,
            },
            include: {
                provider: {
                    select: { id: true, name: true }
                },
                client: {
                    select: { id: true, name: true, type: true }
                }
            }
        });

        return NextResponse.json(contract);
    } catch (error) {
        console.error('POST /api/optic/contracts Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
