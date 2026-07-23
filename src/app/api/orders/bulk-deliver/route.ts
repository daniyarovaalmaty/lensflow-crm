import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await prisma.order.updateMany({
      where: { status: 'shipped' },
      data: { status: 'delivered', deliveredAt: new Date() }
    });
    return NextResponse.json({ updated: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
