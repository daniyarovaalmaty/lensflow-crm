import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    try {
        const accounts = await prisma.companyAccount.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(accounts);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    try {
        const body = await req.json();
        const { name, initialBalance } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const account = await prisma.companyAccount.create({
            data: {
                organizationId: user.organizationId,
                name,
                balance: initialBalance ? parseInt(initialBalance, 10) : 0,
            },
        });

        return NextResponse.json(account, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
