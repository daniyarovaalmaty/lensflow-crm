import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ==================== GET — List inventories ====================
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const inventories = await prisma.inventory.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return NextResponse.json(inventories);
}

// ==================== POST — Inventory actions ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await req.json();
    const action = body.action;

    if (action === 'create') {
        return handleCreate(user, body);
    } else if (action === 'update_item') {
        return handleUpdateItem(body, user);
    } else if (action === 'complete') {
        return handleComplete(body, user);
    } else if (action === 'cancel') {
        return handleCancel(body, user);
    } else {
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}

// ==================== CREATE — New inventory session ====================
async function handleCreate(user: any, body: any) {
    const reqOrgId = body?.orgId;
    const orgId = (reqOrgId && reqOrgId !== 'all') ? reqOrgId : user.organizationId;

    // Check for existing in-progress inventory
    const existing = await prisma.inventory.findFirst({
        where: { organizationId: orgId, status: 'in_progress' }
    });
    if (existing) {
        return NextResponse.json({
            error: 'У вас уже есть незавершённая инвентаризация',
            existingId: existing.id
        }, { status: 409 });
    }

    // Get all active products (only goods, not services)
    const products = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, isActive: true, type: 'product' },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Generate inventory number
    const count = await prisma.inventory.count({ where: { organizationId: orgId } });
    const inventoryNumber = `ИНВ-${String(count + 1).padStart(4, '0')}`;

    // Snapshot current stock for each product
    const items = products.map(p => ({
        productId: p.id,
        name: p.name,
        sku: p.sku || '',
        barcode: p.barcode || '',
        category: p.category,
        unit: p.unit,
        systemQty: p.currentStock,
        actualQty: null as number | null, // not yet counted
        diff: 0,
        note: '',
    }));

    const inventory = await prisma.inventory.create({
        data: {
            organizationId: orgId,
            inventoryNumber,
            status: 'in_progress',
            items: items as any,
            totalProducts: products.length,
            checkedProducts: 0,
            performedById: user.id,
            performedByName: user.fullName || user.email,
        },
    });

    return NextResponse.json(inventory, { status: 201 });
}

// ==================== UPDATE_ITEM — Set actual quantity for a product ====================
async function handleUpdateItem(body: any, user: any) {
    const { inventoryId, productId, actualQty, note, orgId: reqOrgId } = body;
    if (!inventoryId || !productId) {
        return NextResponse.json({ error: 'Missing inventoryId or productId' }, { status: 400 });
    }

    const orgId = (reqOrgId && reqOrgId !== 'all') ? reqOrgId : user.organizationId;
    const inventory = await prisma.inventory.findFirst({
        where: { id: inventoryId, organizationId: orgId, status: 'in_progress' }
    });
    if (!inventory) {
        return NextResponse.json({ error: 'Inventory not found or already completed' }, { status: 404 });
    }

    const items = inventory.items as any[];
    const idx = items.findIndex((i: any) => i.productId === productId);
    if (idx === -1) {
        return NextResponse.json({ error: 'Product not in this inventory' }, { status: 404 });
    }

    const qty = actualQty !== null && actualQty !== undefined && actualQty !== '' ? Number(actualQty) : null;
    items[idx].actualQty = qty;
    items[idx].diff = qty !== null ? qty - items[idx].systemQty : 0;
    if (note !== undefined) items[idx].note = note;

    // Count checked and discrepancies
    const checkedProducts = items.filter((i: any) => i.actualQty !== null).length;
    const surplusCount = items.filter((i: any) => i.actualQty !== null && i.diff > 0).length;
    const shortageCount = items.filter((i: any) => i.actualQty !== null && i.diff < 0).length;

    const updated = await prisma.inventory.update({
        where: { id: inventoryId },
        data: {
            items: items as any,
            checkedProducts,
            surplusCount,
            shortageCount,
        },
    });

    return NextResponse.json(updated);
}

// ==================== COMPLETE — Finalize inventory and apply corrections ====================
async function handleComplete(body: any, user: any) {
    const { inventoryId, orgId: reqOrgId } = body;
    if (!inventoryId) return NextResponse.json({ error: 'Missing inventoryId' }, { status: 400 });

    const orgId = (reqOrgId && reqOrgId !== 'all') ? reqOrgId : user.organizationId;
    const inventory = await prisma.inventory.findFirst({
        where: { id: inventoryId, organizationId: orgId, status: 'in_progress' }
    });
    if (!inventory) {
        return NextResponse.json({ error: 'Inventory not found or already completed' }, { status: 404 });
    }

    const items = inventory.items as any[];
    const discrepancies = items.filter((i: any) => i.actualQty !== null && i.diff !== 0);

    await prisma.$transaction(async (tx) => {
        // Apply corrections for each discrepancy
        for (const item of discrepancies) {
            const diff = item.diff as number;

            // Update currentStock to the actual counted value
            await tx.opticProduct.update({
                where: { id: item.productId },
                data: { currentStock: Math.max(0, item.actualQty) }
            });

            // Create stock movement for adjustment
            await tx.stockMovement.create({
                data: {
                    organizationId: orgId,
                    productId: item.productId,
                    type: 'adjustment',
                    quantity: diff,
                    documentNumber: inventory.inventoryNumber,
                    reason: diff > 0 ? 'Излишек при инвентаризации' : 'Недостача при инвентаризации',
                    performedById: user.id,
                    performedByName: user.fullName || user.email,
                }
            });
        }

        // Create adjustment document if there are discrepancies
        if (discrepancies.length > 0) {
            const docItems = discrepancies.map((d: any) => ({
                productId: d.productId,
                name: d.name,
                qty: Math.abs(d.diff),
                systemQty: d.systemQty,
                actualQty: d.actualQty,
                diff: d.diff,
            }));

            await tx.stockDocument.create({
                data: {
                    documentNumber: inventory.inventoryNumber,
                    organizationId: orgId,
                    type: 'adjustment',
                    status: 'confirmed',
                    items: docItems as any,
                    notes: `Инвентаризация ${inventory.inventoryNumber}. Расхождений: ${discrepancies.length}`,
                    performedById: user.id,
                    performedByName: user.fullName || user.email,
                    confirmedAt: new Date(),
                }
            });
        }

        // Mark inventory as completed
        await tx.inventory.update({
            where: { id: inventoryId },
            data: {
                status: 'completed',
                completedAt: new Date(),
            }
        });
    });

    return NextResponse.json({
        ok: true,
        message: `Инвентаризация ${inventory.inventoryNumber} завершена. Корректировок: ${discrepancies.length}`,
        discrepancies: discrepancies.length,
    });
}

// ==================== CANCEL — Cancel inventory ====================
async function handleCancel(body: any, user: any) {
    const { inventoryId, orgId: reqOrgId } = body;
    if (!inventoryId) return NextResponse.json({ error: 'Missing inventoryId' }, { status: 400 });

    const orgId = (reqOrgId && reqOrgId !== 'all') ? reqOrgId : user.organizationId;
    const inventory = await prisma.inventory.findFirst({
        where: { id: inventoryId, organizationId: orgId, status: 'in_progress' }
    });
    if (!inventory) {
        return NextResponse.json({ error: 'Inventory not found or already completed' }, { status: 404 });
    }

    await prisma.inventory.update({
        where: { id: inventoryId },
        data: { status: 'cancelled' }
    });

    return NextResponse.json({ ok: true, message: 'Инвентаризация отменена' });
}
