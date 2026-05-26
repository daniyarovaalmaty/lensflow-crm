import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

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

// ==================== PUT — Edit Stock Document (invoice adjustments) ====================
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (!['optic_manager', 'lab_head', 'lab_admin'].includes(user.subRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, documentNumber, counterpartyName, notes, items } = body;
    // items: [{ productId, name, qty, price }]

    if (!id) return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });

    const doc = await prisma.stockDocument.findFirst({
        where: { id, organizationId: user.organizationId }
    });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const orgId = user.organizationId;
    const oldItems = doc.items as any[]; // [{ productId, name, qty, price, serialNumbers }]
    const oldDocNum = doc.documentNumber;

    // Use Prisma transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
        // 1. Update the document basic info
        const totalAmount = items.reduce((s: number, i: any) => s + (Number(i.price) * (Number(i.qty) || 1)), 0);

        await tx.stockDocument.update({
            where: { id },
            data: {
                documentNumber: documentNumber || oldDocNum,
                counterpartyName: counterpartyName || null,
                notes: notes || null,
                totalAmount,
                items: items, // Save new items JSON
            }
        });

        // If the document number changed, update all related StockItems and StockMovements references
        if (documentNumber && documentNumber !== oldDocNum) {
            await tx.stockItem.updateMany({
                where: { organizationId: orgId, receiptDocId: oldDocNum },
                data: { receiptDocId: documentNumber }
            });
            await tx.stockMovement.updateMany({
                where: { organizationId: orgId, documentNumber: oldDocNum },
                data: { documentNumber }
            });
        }

        const activeDocNum = documentNumber || oldDocNum;

        // 2. Align stock levels, StockItems, and StockMovements for each product
        // Combine all product IDs from both old and new items
        const allProductIds = Array.from(new Set([
            ...oldItems.map(i => i.productId),
            ...items.map((i: any) => i.productId)
        ]));

        for (const prodId of allProductIds) {
            const oldItem = oldItems.find(i => i.productId === prodId);
            const newItem = items.find((i: any) => i.productId === prodId);

            const oldQty = oldItem ? Number(oldItem.qty) : 0;
            const newQty = newItem ? Number(newItem.qty) : 0;
            const diff = newQty - oldQty;

            const product = await tx.opticProduct.findFirst({
                where: { id: prodId, organizationId: orgId }
            });
            if (!product) continue;

            const itemPrice = newItem ? Number(newItem.price) : (oldItem ? Number(oldItem.price) : product.purchasePrice);

            // Update product stock level
            if (diff !== 0) {
                await tx.opticProduct.update({
                    where: { id: prodId },
                    data: { currentStock: { increment: diff } }
                });
            }

            // Adjust StockItems
            if (diff > 0) {
                // We received more items. Create (diff) new StockItems.
                if (product.trackSerials) {
                    // Generate new serials
                    const lastItem = await tx.stockItem.findFirst({
                        where: { organizationId: orgId, serialNumber: { not: null } },
                        orderBy: { receivedAt: 'desc' },
                    });

                    let serialCounter = 1;
                    if (lastItem?.serialNumber) {
                        const match = lastItem.serialNumber.match(/(\d+)$/);
                        if (match) serialCounter = parseInt(match[1]) + 1;
                    }

                    for (let i = 0; i < diff; i++) {
                        const catPrefix = product.category.substring(0, 2).toUpperCase();
                        const sn = `${catPrefix}-${String(serialCounter).padStart(5, '0')}`;
                        serialCounter++;

                        await tx.stockItem.create({
                            data: {
                                productId: prodId,
                                organizationId: orgId,
                                serialNumber: sn,
                                status: 'in_stock',
                                purchasePrice: itemPrice,
                                receiptDocId: activeDocNum,
                            }
                        });
                    }
                } else {
                    // Non-serial items
                    await tx.stockItem.create({
                        data: {
                            productId: prodId,
                            organizationId: orgId,
                            status: 'in_stock',
                            purchasePrice: itemPrice,
                            notes: `Кол-во: ${diff} (правка док.)`,
                            receiptDocId: activeDocNum,
                        }
                    });
                }
            } else if (diff < 0) {
                // We received fewer items. Delete N items that are in_stock.
                const removeCount = Math.abs(diff);
                const itemsToDelete = await tx.stockItem.findMany({
                    where: {
                        organizationId: orgId,
                        productId: prodId,
                        receiptDocId: activeDocNum,
                        status: 'in_stock'
                    },
                    take: removeCount
                });

                for (const si of itemsToDelete) {
                    await tx.stockItem.delete({ where: { id: si.id } });
                }
            }

            // Always update purchasePrice of existing items from this doc if it has changed
            if (newItem && oldItem && Number(newItem.price) !== Number(oldItem.price)) {
                await tx.stockItem.updateMany({
                    where: {
                        organizationId: orgId,
                        productId: prodId,
                        receiptDocId: activeDocNum
                    },
                    data: {
                        purchasePrice: Number(newItem.price)
                    }
                });
            }

            // 3. Adjust StockMovements record for this receipt
            const existingMovement = await tx.stockMovement.findFirst({
                where: {
                    organizationId: orgId,
                    productId: prodId,
                    documentNumber: activeDocNum,
                    type: 'receipt'
                }
            });

            if (newQty === 0) {
                // If quantity is now 0, delete the movement record completely
                if (existingMovement) {
                    await tx.stockMovement.delete({ where: { id: existingMovement.id } });
                }
            } else {
                if (existingMovement) {
                    await tx.stockMovement.update({
                        where: { id: existingMovement.id },
                        data: {
                            quantity: newQty,
                            supplier: counterpartyName || null,
                        }
                    });
                } else {
                    // Create movement record if it didn't exist
                    await tx.stockMovement.create({
                        data: {
                            organizationId: orgId,
                            productId: prodId,
                            type: 'receipt',
                            quantity: newQty,
                            documentNumber: activeDocNum,
                            supplier: counterpartyName || null,
                            performedById: user.id,
                            performedByName: user.fullName || user.email,
                        }
                    });
                }
            }
        }
    });

    return NextResponse.json({ ok: true });
}
