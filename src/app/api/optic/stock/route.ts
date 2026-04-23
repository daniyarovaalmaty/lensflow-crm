import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// ==================== GET — Stock overview (quantities per product) ====================
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view'); // 'items' | 'movements' | 'documents' | default: summary

    // ---- Stock Items (serial-tracked units) ----
    if (view === 'items') {
        const productId = searchParams.get('productId');
        const status = searchParams.get('status');
        const where: any = { organizationId: user.organizationId };
        if (productId) where.productId = productId;
        if (status) where.status = status;

        const items = await prisma.stockItem.findMany({
            where,
            include: { product: { select: { name: true, category: true, sku: true } } },
            orderBy: { receivedAt: 'desc' },
            take: 500,
        });
        return NextResponse.json(items);
    }

    // ---- Movements history ----
    if (view === 'movements') {
        const movements = await prisma.stockMovement.findMany({
            where: { organizationId: user.organizationId },
            include: { product: { select: { name: true, category: true } } },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return NextResponse.json(movements);
    }

    // ---- Stock documents ----
    if (view === 'documents') {
        const docs = await prisma.stockDocument.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return NextResponse.json(docs);
    }

    // ---- Default: product summary with stock counts ----
    const products = await prisma.opticProduct.findMany({
        where: { organizationId: user.organizationId, isActive: true, type: 'product' },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
            _count: { select: { stockItems: { where: { status: 'in_stock' } } } },
        },
    });

    return NextResponse.json(products);
}

// ==================== POST — Stock operations ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (!['optic_manager', 'lab_head', 'lab_admin'].includes(user.subRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action; // 'receive' | 'write_off' | 'return_out'

    if (action === 'receive') {
        return handleReceive(body, user);
    } else if (action === 'write_off') {
        return handleWriteOff(body, user);
    } else {
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}

// ==================== RECEIVE — Приход товара ====================
async function handleReceive(body: any, user: any) {
    const { items, supplier, documentNumber, notes } = body;
    // items: [{ productId, quantity, serialNumbers?: string[], purchasePrice?, color?, size?, batchNumber?, expiryDate? }]

    if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 });

    const orgId = user.organizationId;

    // Generate document number if not provided
    const docCount = await prisma.stockDocument.count({ where: { organizationId: orgId, type: 'receipt' } });
    const docNum = documentNumber || `ПН-${String(docCount + 1).padStart(4, '0')}`;

    // Get the last serial number for auto-generation
    const lastItem = await prisma.stockItem.findFirst({
        where: { organizationId: orgId, serialNumber: { not: null } },
        orderBy: { receivedAt: 'desc' },
    });

    let serialCounter = 1;
    if (lastItem?.serialNumber) {
        const match = lastItem.serialNumber.match(/(\d+)$/);
        if (match) serialCounter = parseInt(match[1]) + 1;
    }

    const allSerialNumbers: string[] = [];
    const docItems: any[] = [];

    for (const item of items) {
        const product = await prisma.opticProduct.findFirst({
            where: { id: item.productId, organizationId: orgId },
        });
        if (!product) continue;

        const qty = Number(item.quantity) || 1;
        const createdSerials: string[] = [];

        if (product.trackSerials) {
            // Create individual StockItems with serial numbers
            for (let i = 0; i < qty; i++) {
                let sn: string;
                if (item.serialNumbers?.[i]) {
                    sn = item.serialNumbers[i]; // manual serial
                } else {
                    // Auto-generate: ORG-CAT-00001
                    const catPrefix = product.category.substring(0, 2).toUpperCase();
                    sn = `${catPrefix}-${String(serialCounter).padStart(5, '0')}`;
                    serialCounter++;
                }

                await prisma.stockItem.create({
                    data: {
                        productId: product.id,
                        organizationId: orgId,
                        serialNumber: sn,
                        status: 'in_stock',
                        purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : product.purchasePrice,
                        color: item.color || null,
                        size: item.size || null,
                        batchNumber: item.batchNumber || null,
                        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                        receiptDocId: docNum,
                    },
                });
                createdSerials.push(sn);
            }
        } else {
            // Bulk stock item (no serial tracking) — just create one record
            await prisma.stockItem.create({
                data: {
                    productId: product.id,
                    organizationId: orgId,
                    status: 'in_stock',
                    purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : product.purchasePrice,
                    batchNumber: item.batchNumber || null,
                    expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                    notes: `Кол-во: ${qty}`,
                    receiptDocId: docNum,
                },
            });
        }

        // Update currentStock on product
        await prisma.opticProduct.update({
            where: { id: product.id },
            data: { currentStock: { increment: qty } },
        });

        // Record movement
        await prisma.stockMovement.create({
            data: {
                organizationId: orgId,
                productId: product.id,
                type: 'receipt',
                quantity: qty,
                serialNumbers: createdSerials.length > 0 ? createdSerials : undefined,
                documentNumber: docNum,
                supplier: supplier || null,
                performedById: user.id,
                performedByName: user.fullName || user.email,
            },
        });

        allSerialNumbers.push(...createdSerials);
        docItems.push({
            productId: product.id,
            name: product.name,
            qty,
            price: item.purchasePrice || product.purchasePrice,
            serialNumbers: createdSerials,
        });
    }

    // Create stock document
    const totalAmount = docItems.reduce((s: number, i: any) => s + (i.price * i.qty), 0);
    const doc = await prisma.stockDocument.create({
        data: {
            documentNumber: docNum,
            organizationId: orgId,
            type: 'receipt',
            status: 'confirmed',
            counterpartyName: supplier || null,
            totalAmount,
            items: docItems,
            performedById: user.id,
            performedByName: user.fullName || user.email,
            confirmedAt: new Date(),
        },
    });

    return NextResponse.json({ ok: true, document: doc, serialNumbers: allSerialNumbers }, { status: 201 });
}

// ==================== WRITE OFF — Списание ====================
async function handleWriteOff(body: any, user: any) {
    const { items, reason, notes } = body;
    // items: [{ productId, quantity, serialNumbers?: string[] }]

    if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 });

    const orgId = user.organizationId;
    const docCount = await prisma.stockDocument.count({ where: { organizationId: orgId, type: 'write_off' } });
    const docNum = `АС-${String(docCount + 1).padStart(4, '0')}`;

    const docItems: any[] = [];

    for (const item of items) {
        const product = await prisma.opticProduct.findFirst({
            where: { id: item.productId, organizationId: orgId },
        });
        if (!product) continue;

        const qty = Number(item.quantity) || 1;

        if (product.trackSerials && item.serialNumbers?.length) {
            // Mark specific serial items as written off
            for (const sn of item.serialNumbers) {
                await prisma.stockItem.updateMany({
                    where: { organizationId: orgId, serialNumber: sn, status: 'in_stock' },
                    data: { status: 'written_off' },
                });
            }
        } else {
            // Mark N items as written off
            const stockItems = await prisma.stockItem.findMany({
                where: { organizationId: orgId, productId: item.productId, status: 'in_stock' },
                take: qty,
            });
            for (const si of stockItems) {
                await prisma.stockItem.update({
                    where: { id: si.id },
                    data: { status: 'written_off' },
                });
            }
        }

        // Decrement currentStock
        await prisma.opticProduct.update({
            where: { id: product.id },
            data: { currentStock: { decrement: qty } },
        });

        // Record movement
        await prisma.stockMovement.create({
            data: {
                organizationId: orgId,
                productId: product.id,
                type: 'write_off',
                quantity: -qty,
                serialNumbers: item.serialNumbers || undefined,
                documentNumber: docNum,
                reason: reason || null,
                performedById: user.id,
                performedByName: user.fullName || user.email,
            },
        });

        docItems.push({ productId: product.id, name: product.name, qty, serialNumbers: item.serialNumbers || [] });
    }

    const doc = await prisma.stockDocument.create({
        data: {
            documentNumber: docNum,
            organizationId: orgId,
            type: 'write_off',
            status: 'confirmed',
            totalAmount: 0,
            items: docItems,
            notes: reason || notes || null,
            performedById: user.id,
            performedByName: user.fullName || user.email,
            confirmedAt: new Date(),
        },
    });

    return NextResponse.json({ ok: true, document: doc }, { status: 201 });
}
