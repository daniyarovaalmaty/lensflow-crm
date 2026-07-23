import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// PATCH — transfer lifecycle: send (deduct source) | receive (add to destination) | cancel.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const actionBody = await req.json().catch(() => ({}));
    const reqOrgId = actionBody.orgId;
    let orgId = user.organizationId;
    
    if (reqOrgId && reqOrgId !== 'all' && reqOrgId !== orgId) {
        const myOrg = await prisma.organization.findUnique({ where: { id: orgId }, select: { type: true } });
        if (myOrg?.type === 'headquarters') {
            orgId = reqOrgId;
        }
    }

    const t = await prisma.stockTransfer.findFirst({ where: { id: params.id, OR: [{ fromOrgId: orgId }, { toOrgId: orgId }] } });
    if (!t) return NextResponse.json({ error: 'Трансфер не найден' }, { status: 404 });

    const action = actionBody.action as string;
    const items = (t.items as any[]) || [];

    if (action === 'send') {
        if (orgId !== t.fromOrgId) return NextResponse.json({ error: 'Отправить может только филиал-источник' }, { status: 403 });
        if (t.status !== 'draft') return NextResponse.json({ error: 'Отправить можно только черновик' }, { status: 400 });
        for (const it of items) {
            const qty = Number(it.qty) || 0;
            if (qty <= 0 || !it.productId) continue;
            await prisma.opticProduct.update({ where: { id: it.productId }, data: { currentStock: { decrement: qty } } }).catch(() => {});
            await prisma.stockMovement.create({ data: { organizationId: t.fromOrgId, productId: it.productId, type: 'transfer_out', quantity: qty, documentNumber: t.number, reason: `Трансфер → ${t.toName || ''}`.trim(), performedById: user.id, performedByName: user.fullName || null } });
        }
        return NextResponse.json(await prisma.stockTransfer.update({ where: { id: t.id }, data: { status: 'sent', sentAt: new Date() } }));
    }

    if (action === 'receive') {
        if (t.status !== 'sent') return NextResponse.json({ error: 'Получить можно только отправленный трансфер' }, { status: 400 });
        for (const it of items) {
            const qty = Number(it.qty) || 0;
            if (qty <= 0) continue;
            // Match the destination product by sku, else create it (copying source attributes).
            let dest = it.sku ? await prisma.opticProduct.findFirst({ where: { organizationId: t.toOrgId, sku: it.sku } }) : null;
            if (!dest) {
                const src = it.productId ? await prisma.opticProduct.findUnique({ where: { id: it.productId } }) : null;
                dest = await prisma.opticProduct.create({
                    data: {
                        organizationId: t.toOrgId,
                        name: it.name || src?.name || 'Товар',
                        slug: String(it.sku || it.name || 'tr').toLowerCase().slice(0, 90),
                        category: src?.category || 'accessory',
                        type: 'product',
                        brand: src?.brand || null,
                        sku: it.sku || null,
                        retailPrice: src?.retailPrice || 0,
                        purchasePrice: src?.purchasePrice || 0,
                        currentStock: 0,
                        unit: 'шт',
                        isActive: true,
                    },
                });
            }
            await prisma.opticProduct.update({ where: { id: dest.id }, data: { currentStock: { increment: qty } } });
            await prisma.stockMovement.create({ data: { organizationId: t.toOrgId, productId: dest.id, type: 'transfer_in', quantity: qty, documentNumber: t.number, reason: `Трансфер ← ${t.fromName || ''}`.trim(), performedById: user.id, performedByName: user.fullName || null } });
        }
        return NextResponse.json(await prisma.stockTransfer.update({ where: { id: t.id }, data: { status: 'received', receivedAt: new Date() } }));
    }

    if (action === 'cancel') {
        if (orgId !== t.fromOrgId) return NextResponse.json({ error: 'Отменить может только источник' }, { status: 403 });
        if (t.status !== 'draft') return NextResponse.json({ error: 'Отменить можно только черновик' }, { status: 400 });
        return NextResponse.json(await prisma.stockTransfer.update({ where: { id: t.id }, data: { status: 'cancelled' } }));
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}
