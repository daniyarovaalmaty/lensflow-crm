import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { transaction_id } = body;

    if (!transaction_id) {
        return NextResponse.json({ error: 'Missing transaction_id' }, { status: 400 });
    }

    // Simulate successful payment swipe/QR scanning by client
    return NextResponse.json({
        status: 'PAID',
        transaction_id,
        message: 'Оплата успешно проведена клиентом.'
    });
}
