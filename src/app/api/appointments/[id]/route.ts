import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        
        // Find appointment to ensure it belongs to this clinic
        const existing = await prisma.appointment.findUnique({
            where: { id: params.id }
        });

        if (!existing || existing.clinicId !== session.user.organizationId) {
            return new NextResponse('Not found', { status: 404 });
        }

        const updated = await prisma.appointment.update({
            where: { id: params.id },
            data: {
                status: body.status !== undefined ? body.status : undefined,
                date: body.date ? new Date(body.date) : undefined,
                notes: body.notes !== undefined ? body.notes : undefined,
                duration: body.duration !== undefined ? parseInt(body.duration) : undefined,
                type: body.type !== undefined ? body.type : undefined,
                patientId: body.patientId !== undefined ? body.patientId : undefined,
            },
            include: {
                patient: true,
                doctor: { select: { id: true, fullName: true } }
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('[APPOINTMENT_PATCH]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        
        const existing = await prisma.appointment.findUnique({
            where: { id: params.id }
        });

        if (!existing || existing.clinicId !== session.user.organizationId) {
            return new NextResponse('Not found', { status: 404 });
        }

        await prisma.appointment.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[APPOINTMENT_DELETE]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}
