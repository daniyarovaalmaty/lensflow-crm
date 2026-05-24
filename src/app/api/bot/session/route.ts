import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// GET /api/bot/session — list all sessions or get one by phone
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const phone = req.nextUrl.searchParams.get('phone');
    
    if (phone) {
        const botSession = await prisma.botSession.findUnique({
            where: { phone: phone.replace(/\D/g, '') }
        });
        return NextResponse.json(botSession || { state: 'greeting' });
    }

    const sessions = await prisma.botSession.findMany({
        orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(sessions);
}

// PATCH /api/bot/session — toggle bot state for a phone number
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, state } = await req.json();
    if (!phone || !state) {
        return NextResponse.json({ error: 'phone and state are required' }, { status: 400 });
    }

    const normalizedPhone = phone.replace(/\D/g, '');

    const botSession = await prisma.botSession.upsert({
        where: { phone: normalizedPhone },
        create: { phone: normalizedPhone, state },
        update: { state }
    });

    return NextResponse.json(botSession);
}
