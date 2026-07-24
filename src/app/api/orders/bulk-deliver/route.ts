import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'laboratory' || session.user.subRole !== 'lab_head') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const result = await prisma.order.updateMany({
      where: { status: 'shipped' },
      data: { status: 'delivered', deliveredAt: new Date() }
    });
    return NextResponse.json({ updated: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
