import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ==================== PATCH — редактировать поставщика ====================
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
  });
  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  const body = await req.json();
  const { name, inn, phone, email, contactPerson } = body;

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: 'Название поставщика не может быть пустым' }, { status: 400 });
  }

  const updated = await prisma.supplier.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(inn !== undefined && { inn: inn?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(contactPerson !== undefined && { contactPerson: contactPerson?.trim() || null }),
    },
  });

  return NextResponse.json(updated);
}

// ==================== DELETE — мягкое удаление (isActive = false) ====================
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
  });
  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  await prisma.supplier.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
