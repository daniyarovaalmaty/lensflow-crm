export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * PUT /api/counterparties/[id]/info - Update basic counterparty info
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'laboratory') {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        
        // Ensure only admins/heads can edit basic info? Or maybe any lab user?
        // Let's allow lab_head and lab_admin.
        if (session.user.subRole !== 'lab_head' && session.user.subRole !== 'lab_admin') {
            return NextResponse.json({ error: 'Нет прав для изменения данных' }, { status: 403 });
        }

        const body = await request.json();
        const { type } = body;

        if (type === 'clinic') {
            const {
                name, inn, phone, email, city, address, deliveryAddress,
                directorName, contactPerson, bankName, iban
            } = body;

            const updated = await prisma.organization.update({
                where: { id: params.id },
                data: {
                    name, inn, phone, email, city, address, deliveryAddress,
                    directorName, contactPerson, bankName, iban
                }
            });

            return NextResponse.json(updated);
        } else if (type === 'doctor') {
            const { fullName, phone, email } = body;

            const updated = await prisma.user.update({
                where: { id: params.id },
                data: {
                    fullName, phone, email
                }
            });

            return NextResponse.json(updated);
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

    } catch (error) {
        console.error('PUT /api/counterparties/[id]/info error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
