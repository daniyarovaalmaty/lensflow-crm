import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) {
        return NextResponse.json({ error: 'No organization linked' }, { status: 403 });
    }

    // Load cash registers for organization
    let registers = await prisma.cashRegister.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { name: 'asc' },
    });

    // If no cash register exists, automatically seed a default one
    if (registers.length === 0) {
        const defaultRegister = await prisma.cashRegister.create({
            data: {
                name: 'Основная касса',
                organizationId: user.organizationId,
                currentBalance: 0,
            },
        });
        registers = [defaultRegister];
    }

    return NextResponse.json(registers);
}
