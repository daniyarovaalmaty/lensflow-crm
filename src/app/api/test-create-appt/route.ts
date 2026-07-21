export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
    try {
        const testUser = await prisma.user.findFirst();
        if (!testUser) return NextResponse.json({ error: 'No user' });

        const appt = await prisma.appointment.create({
            data: {
                date: new Date(),
                duration: 30,
                status: 'scheduled',
                type: 'consultation',
                patientName: 'Test Patient',
                patientPhone: '87070000000',
                createdById: testUser.id,
            },
            include: { createdBy: true }
        });

        return NextResponse.json(appt);
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
