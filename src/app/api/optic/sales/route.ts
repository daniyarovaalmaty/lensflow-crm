import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// ==================== GET — List sales ====================
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

// ==================== POST — Create sale ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (!['optic_manager', 'lab_head', 'lab_admin'].includes(user.subRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { items, customerName, customerPhone, discountPercent, paymentMethod, notes } = body;
    // items: [{ productId, quantity, unitPrice }]

    if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 });

    const orgId = user.organizationId;

    // Generate sale number
    const saleCount = await prisma.sale.count({ where: { organizationId: orgId } });
    const saleNumber = `S-${String(saleCount + 1).padStart(4, '0')}`;

    // Calculate totals
    let subtotal = 0;
    const saleItems: any[] = [];

    for (const item of items) {
        const product = await prisma.opticProduct.findFirst({
            where: { id: item.productId, organizationId: orgId },
        });
        if (!product) continue;

        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || product.retailPrice;
        const total = qty * unitPrice;
        subtotal += total;

        // For products (not services), deduct from stock
        if (product.type === 'product') {
            if (product.trackSerials) {
                // Mark N stock items as sold
                const stockItems = await prisma.stockItem.findMany({
                    where: { organizationId: orgId, productId: product.id, status: 'in_stock' },
                    take: qty,
                });
                const soldSerials: string[] = [];
                for (const si of stockItems) {
                    await prisma.stockItem.update({
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
                // Bulk — mark items as sold
                const stockItems = await prisma.stockItem.findMany({
                    where: { organizationId: orgId, productId: product.id, status: 'in_stock' },
                    take: qty,
                });
                for (const si of stockItems) {
                    await prisma.stockItem.update({
                        where: { id: si.id },
                        data: { status: 'sold', soldAt: new Date() },
                    });
                }
                saleItems.push({
                    productId: product.id, name: product.name, category: product.category,
                    quantity: qty, unitPrice, total,
                });
            }

            // Decrement currentStock
            await prisma.opticProduct.update({
                where: { id: product.id },
                data: { currentStock: { decrement: qty } },
            });

            // Record movement
            await prisma.stockMovement.create({
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
            // Service — no stock change
            saleItems.push({
                productId: product.id, name: product.name, category: product.category,
                quantity: qty, unitPrice, total,
            });
        }
    }

    const discount = Number(discountPercent) || 0;
    const discountAmount = Math.round(subtotal * discount / 100);
    const totalAmount = subtotal - discountAmount;

    // Create sale with items
    const sale = await prisma.sale.create({
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

    return NextResponse.json(sale, { status: 201 });
}
