import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { getAvailableStock } from '@/lib/stock/getAvailableStock';

export const dynamic = 'force-dynamic';

// ==================== GET ====================
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const sales = await prisma.sale.findMany({
        where: { organizationId: user.organizationId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });

    return NextResponse.json(sales);
}

// ==================== POST ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await req.json();
    const { items, customerName, customerPhone, discountPercent, paymentMethod, notes } = body;
    if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 });

    const orgId = user.organizationId;

    // Загружаем все продукты одним запросом (не N+1)
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.opticProduct.findMany({
        where: { id: { in: productIds }, organizationId: orgId },
    });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // ✅ Guard: проверяем остатки ДО транзакции
    for (const item of items) {
        const product = productMap[item.productId];
        if (!product) return NextResponse.json({ error: `Товар не найден` }, { status: 400 });

        if (product.type === 'product') {
            const qty = Number(item.quantity) || 1;
            const available = await getAvailableStock(item.productId, orgId);
            if (available < qty) {
                return NextResponse.json({
                    error: `Недостаточно товара: "${product.name}". Доступно: ${available}, запрошено: ${qty}.`,
                }, { status: 400 });
            }
        }
    }

    const saleCount = await prisma.sale.count({ where: { organizationId: orgId } });
    const saleNumber = `S-${String(saleCount + 1).padStart(4, '0')}`;

    // ✅ Вся продажа в одной транзакции
    const sale = await prisma.$transaction(async (tx) => {
        let subtotal = 0;
        const saleItems: any[] = [];

        for (const item of items) {
            const product = productMap[item.productId];
            if (!product) continue;

            const qty = Number(item.quantity) || 1;
            const unitPrice = Number(item.unitPrice) || product.retailPrice;
            const total = qty * unitPrice;
            subtotal += total;

            if (product.type === 'product') {
                if (product.trackSerials) {
                    const stockItems = await tx.stockItem.findMany({
                        where: { organizationId: orgId, productId: product.id, status: 'in_stock' },
                        take: qty,
                    });
                    const soldSerials: string[] = [];
                    for (const si of stockItems) {
                        await tx.stockItem.update({
                            where: { id: si.id },
                            data: { status: 'sold', soldAt: new Date() },
                        });
                        if (si.serialNumber) soldSerials.push(si.serialNumber);
                    }
                    saleItems.push({
                        productId: product.id, name: product.name, category: product.category,
                        quantity: qty, unitPrice, total, serialNumbers: soldSerials,
                    });
                } else {
                    // ✅ FIFO списание по quantity — не меняем статус пока quantity > 0
                    const stockItems = await tx.stockItem.findMany({
                        where: { organizationId: orgId, productId: product.id, status: 'in_stock' },
                        orderBy: { receivedAt: 'asc' },
                    });
                    let remaining = qty;
                    for (const si of stockItems) {
                        if (remaining <= 0) break;
                        if (si.quantity <= remaining) {
                            // Полностью продаём этот batch
                            await tx.stockItem.update({
                                where: { id: si.id },
                                data: { status: 'sold', soldAt: new Date() },
                            });
                            remaining -= si.quantity;
                        } else {
                            // Частично — уменьшаем quantity
                            await tx.stockItem.update({
                                where: { id: si.id },
                                data: { quantity: si.quantity - remaining },
                            });
                            remaining = 0;
                        }
                    }
                    saleItems.push({
                        productId: product.id, name: product.name, category: product.category,
                        quantity: qty, unitPrice, total,
                    });
                }

                // Синхронизируем currentStock
                await tx.opticProduct.update({
                    where: { id: product.id },
                    data: { currentStock: { decrement: qty } },
                });

                await tx.stockMovement.create({
                    data: {
                        organizationId: orgId, productId: product.id,
                        type: 'sale', quantity: -qty,
                        documentNumber: saleNumber,
                        customerName: customerName || null,
                        performedById: user.id,
                        performedByName: user.fullName || user.email,
                    },
                });
            } else {
                saleItems.push({
                    productId: product.id, name: product.name, category: product.category,
                    quantity: qty, unitPrice, total,
                });
            }
        }

        const discount = Number(discountPercent) || 0;
        const discountAmount = Math.round(subtotal * discount / 100);
        const totalAmount = subtotal - discountAmount;

        return tx.sale.create({
            data: {
                saleNumber,
                organizationId: orgId,
                customerName: customerName || null,
                customerPhone: customerPhone || null,
                subtotal,
                discountPercent: discount,
                discountAmount,
                total: totalAmount,
                paidAmount: totalAmount,
                paymentMethod: paymentMethod || 'cash',
                paymentStatus: 'paid',
                performedById: user.id,
                performedByName: user.fullName || user.email,
                notes: notes || null,
                items: {
                    create: saleItems.map(si => ({
                        productId: si.productId,
                        name: si.name,
                        category: si.category,
                        quantity: si.quantity,
                        unitPrice: si.unitPrice,
                        total: si.total,
                        serialNumbers: si.serialNumbers || undefined,
                    })),
                },
            },
            include: { items: true },
        });
    });

    return NextResponse.json(sale, { status: 201 });
}
