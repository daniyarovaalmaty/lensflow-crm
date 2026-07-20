import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// GET all suppliers for this distributor
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'distributor') {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        const organizationId = session.user.organizationId!;

        const suppliers = await prisma.supplier.findMany({
            where: { organizationId },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// POST create a new supplier
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'distributor') {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        const organizationId = session.user.organizationId!;
        const body = await req.json();
        const { name } = body;

        if (!name?.trim()) {
            return new NextResponse('Name is required', { status: 400 });
        }

        const supplier = await prisma.supplier.create({
            data: {
                organizationId,
                name: name.trim()
            }
        });

        return NextResponse.json(supplier);
    } catch (error: any) {
        console.error('Error creating supplier:', error);
        if (error.code === 'P2002') {
            return new NextResponse('Supplier already exists', { status: 400 });
        }
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
