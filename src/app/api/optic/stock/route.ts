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
    } else if (action === 'recalculate') {
        return handleRecalculate(user);
    } else if (action === 'delete_document') {
        return handleDeleteDocument(body, user);
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

// ==================== DELETE DOCUMENT — Remove a stock document and reverse its effects ====================
async function handleDeleteDocument(body: any, user: any) {
    const { documentNumber } = body;
    if (!documentNumber) return NextResponse.json({ error: 'Missing documentNumber' }, { status: 400 });

    const orgId = user.organizationId;

    const doc = await prisma.stockDocument.findFirst({
        where: { organizationId: orgId, documentNumber }
    });
    if (!doc) return NextResponse.json({ error: `Document ${documentNumber} not found` }, { status: 404 });

    const docItems = doc.items as any[];

    await prisma.$transaction(async (tx) => {
        // 1. Delete stock movements linked to this document
        await tx.stockMovement.deleteMany({
            where: { organizationId: orgId, documentNumber }
        });

        // 2. Delete stock items linked to this document
        await tx.stockItem.deleteMany({
            where: { organizationId: orgId, receiptDocId: documentNumber }
        });

        // 3. Delete the document itself
        await tx.stockDocument.delete({ where: { id: doc.id } });

        // 4. Recalculate currentStock for affected products from remaining documents
        const affectedProductIds = Array.isArray(docItems)
            ? [...new Set(docItems.map((i: any) => i.productId).filter(Boolean))]
            : [];

        const remainingDocs = await tx.stockDocument.findMany({
            where: { organizationId: orgId, status: { not: 'cancelled' } }
        });

        for (const prodId of affectedProductIds) {
            let correctStock = 0;
            for (const rd of remainingDocs) {
                const rdItems = rd.items as any[];
                if (!Array.isArray(rdItems)) continue;
                for (const ri of rdItems) {
                    if (ri.productId === prodId) {
                        const q = Number(ri.qty) || 0;
                        if (rd.type === 'receipt') correctStock += q;
                        else if (rd.type === 'write_off') correctStock -= q;
                    }
                }
            }
            await tx.opticProduct.update({
                where: { id: prodId },
                data: { currentStock: Math.max(0, correctStock) }
            });
        }
    });

    return NextResponse.json({
        ok: true,
        message: `Документ ${documentNumber} удалён, остатки пересчитаны`
    });
}

// ==================== RECALCULATE — Fix all stock counters from document history ====================
async function handleRecalculate(user: any) {
    const orgId = user.organizationId;

    // Get all confirmed documents (receipts and write-offs)
    const documents = await prisma.stockDocument.findMany({
        where: { organizationId: orgId, status: { not: 'cancelled' } },
    });

    // Build a map: productId → total quantity from all documents
    const stockMap: Record<string, number> = {};

    for (const doc of documents) {
        const docItems = doc.items as any[];
        if (!Array.isArray(docItems)) continue;

        for (const item of docItems) {
            const pid = item.productId;
            if (!pid) continue;
            const qty = Number(item.qty) || 0;

            if (!stockMap[pid]) stockMap[pid] = 0;

            if (doc.type === 'receipt') {
                stockMap[pid] += qty;
            } else if (doc.type === 'write_off') {
                stockMap[pid] -= qty;
            }
        }
    }

    // Get all products and update their currentStock
    const products = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, isActive: true, type: 'product' },
    });

    // Build diagnostic info: for each product show which docs contribute
    const diagnostics: Array<{
        productName: string; productId: string; retailPrice: number;
        oldStock: number; newStock: number;
        sources: Array<{ docNumber: string; qty: number; price: number; docType: string }>;
    }> = [];

    for (const product of products) {
        const correctStock = Math.max(0, stockMap[product.id] || 0);
        const sources: Array<{ docNumber: string; qty: number; price: number; docType: string }> = [];

        for (const doc of documents) {
            const docItems = doc.items as any[];
            if (!Array.isArray(docItems)) continue;
            for (const item of docItems) {
                if (item.productId === product.id) {
                    sources.push({
                        docNumber: doc.documentNumber,
                        qty: Number(item.qty) || 0,
                        price: Number(item.price) || 0,
                        docType: doc.type,
                    });
                }
            }
        }

        if (product.currentStock !== correctStock) {
            await prisma.opticProduct.update({
                where: { id: product.id },
                data: { currentStock: correctStock }
            });
            results.push({ name: product.name, oldStock: product.currentStock, newStock: correctStock });
        }

        if (sources.length > 0 || correctStock > 0) {
            diagnostics.push({
                productName: product.name,
                productId: product.id,
                retailPrice: product.retailPrice,
                oldStock: product.currentStock,
                newStock: correctStock,
                sources,
            });
        }

        // Also fix StockMovement records to match documents
        const productDocs = documents.filter(d =>
            d.type === 'receipt' && (d.items as any[]).some((i: any) => i.productId === product.id)
        );

        for (const pd of productDocs) {
            const pdItem = (pd.items as any[]).find((i: any) => i.productId === product.id);
            if (!pdItem) continue;
            const docQty = Number(pdItem.qty) || 0;

            const existingMovement = await prisma.stockMovement.findFirst({
                where: {
                    organizationId: orgId,
                    productId: product.id,
                    documentNumber: pd.documentNumber,
                    type: 'receipt'
                }
            });

            if (existingMovement) {
                if (existingMovement.quantity !== docQty) {
                    await prisma.stockMovement.update({
                        where: { id: existingMovement.id },
                        data: { quantity: docQty }
                    });
                }
            } else {
                await prisma.stockMovement.create({
                    data: {
                        organizationId: orgId,
                        productId: product.id,
                        type: 'receipt',
                        quantity: docQty,
                        documentNumber: pd.documentNumber,
                        supplier: pd.counterpartyName || null,
                        performedById: pd.performedById || null,
                        performedByName: pd.performedByName || null,
                    }
                });
            }
        }
    }

    return NextResponse.json({
        ok: true,
        message: `Пересчитано ${results.length} товаров`,
        corrections: results,
        diagnostics,
    });
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

            // Adjust StockItems
            if (diff > 0) {
                if (product.trackSerials) {
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

            // 3. Update StockMovement record for this receipt
            const existingMovement = await tx.stockMovement.findFirst({
                where: {
                    organizationId: orgId,
                    productId: prodId,
                    documentNumber: activeDocNum,
                    type: 'receipt'
                }
            });

            if (newQty === 0) {
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

            // 4. RECALCULATE currentStock from all documents (absolute truth)
            const allDocs = await tx.stockDocument.findMany({
                where: { organizationId: orgId, status: { not: 'cancelled' } }
            });
            let correctStock = 0;
            for (const d of allDocs) {
                const dItems = d.items as any[];
                if (!Array.isArray(dItems)) continue;
                const found = dItems.find((di: any) => di.productId === prodId);
                if (!found) continue;
                const q = Number(found.qty) || 0;
                if (d.type === 'receipt') correctStock += q;
                else if (d.type === 'write_off') correctStock -= q;
            }

            await tx.opticProduct.update({
                where: { id: prodId },
                data: { currentStock: Math.max(0, correctStock) }
            });
        }
    });

    return NextResponse.json({ ok: true });
}

