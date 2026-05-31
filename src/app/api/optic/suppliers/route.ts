import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ==================== GET — список поставщиков ====================
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(suppliers);
}

// ==================== POST — создать поставщика ====================
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const body = await req.json();
  const { name, inn, phone, email, contactPerson } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Название поставщика обязательно' }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({
    data: {
      organizationId: user.organizationId,
      name: name.trim(),
      inn: inn?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      contactPerson: contactPerson?.trim() || null,
    },
  });

  return NextResponse.json(supplier, { status: 201 });
}
