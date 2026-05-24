import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { amount, order_id } = body;

    if (!amount || !order_id) {
        return NextResponse.json({ error: 'Missing amount or order_id' }, { status: 400 });
    }

    // Simulate SmartPOS trigger and generate transaction ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const txId = `KASPI-TX-${order_id}-${randomSuffix}`;

    return NextResponse.json({
        status: 'pending',
        transaction_id: txId,
        message: 'Запрос отправлен на Kaspi SmartPOS терминал. Ожидайте оплаты.'
    });
}
