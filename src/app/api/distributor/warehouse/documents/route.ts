import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'receipt';

        const whereClause: any = {
            organizationId: session.user.organizationId,
        };
        
        if (type !== 'all') {
            whereClause.type = type;
        }

        const documentNumber = searchParams.get('documentNumber');
        if (documentNumber) {
            whereClause.documentNumber = documentNumber;
        }

        const documents = await prisma.stockDocument.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ documents });
    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { type, status, documentNumber, documentDate, counterpartyName, declarationNumber, declarationDate, items, totalAmount, targetOrganizationId, notes } = body;

        const organizationId = session.user.organizationId;
        const performedById = session.user.id;
        const performedByName = session.user.name || 'System';

        // Use a transaction if we are confirming, to ensure data consistency
        const document = await prisma.$transaction(async (tx) => {
            const doc = await tx.stockDocument.create({
                data: {
                    documentNumber,
                    organizationId,
                    targetOrganizationId,
                    type,
                    status,
                    counterpartyName,
                    notes: JSON.stringify({ declarationNumber: declarationNumber || '', declarationDate: declarationDate || '', documentDate: documentDate || '', userNotes: notes || '' }),
                    totalAmount,
                    items,
                    performedById,
                    performedByName,
                    confirmedAt: status === 'confirmed' ? new Date() : null,
                }
            });

            if (status === 'confirmed' && type === 'receipt') {
                for (const item of items) {
                    const product = await tx.opticProduct.findUnique({ where: { id: item.productId } });
                    if (!product) continue;

                    // Update total stock and purchase price on Product
                    await tx.opticProduct.update({
                        where: { id: product.id },
                        data: { 
                            currentStock: product.currentStock + item.qty,
                            purchasePrice: item.price,
                            ...(product.retailPrice === 0 ? { retailPrice: item.price } : {})
                        }
                    });

                    // Upsert Batch (StockItem)
                    const batchBarcode = item.batchBarcode || `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    
                    const existingBatch = await tx.stockItem.findUnique({
                        where: {
                            organizationId_serialNumber: {
                                organizationId,
                                serialNumber: batchBarcode
                            }
                        }
                    });

                    let stockItemId = '';
                    if (existingBatch) {
                        await tx.stockItem.update({
                            where: { id: existingBatch.id },
                            data: {
                                quantity: existingBatch.quantity + item.qty,
                                purchasePrice: item.price,
                                expiryDate: item.batchExpiration ? new Date(item.batchExpiration) : existingBatch.expiryDate,
                                productionDate: item.batchProduction ? new Date(item.batchProduction) : existingBatch.productionDate,
                                diopters: item.batchDiopters || existingBatch.diopters,
                                size: item.batchSize || existingBatch.size
                            }
                        });
                        stockItemId = existingBatch.id;
                    } else {
                        const newBatch = await tx.stockItem.create({
                            data: {
                                productId: product.id,
                                organizationId,
                                serialNumber: batchBarcode,
                                quantity: item.qty,
                                purchasePrice: item.price,
                                expiryDate: item.batchExpiration ? new Date(item.batchExpiration) : null,
                                productionDate: item.batchProduction ? new Date(item.batchProduction) : null,
                                diopters: item.batchDiopters || null,
                                size: item.batchSize || null,
                                receiptDocId: doc.id
                            }
                        });
                        stockItemId = newBatch.id;
                    }

                    // Create Movement Log (serial numbers stored as metadata)
                    await tx.stockMovement.create({
                        data: {
                            organizationId,
                            productId: product.id,
                            type: 'receipt',
                            quantity: item.qty,
                            serialNumbers: [batchBarcode],
                            documentNumber,
                            documentId: doc.id,
                            supplier: counterpartyName,
                            performedById,
                            performedByName,
                        }
                    });
                }
            } else if (status === 'confirmed' && (type === 'transfer_out' || type === 'write_off')) {
                for (const item of items) {
                    const product = await tx.opticProduct.findUnique({ where: { id: item.productId } });
                    if (!product) continue;

                    // Update total stock
                    await tx.opticProduct.update({
                        where: { id: product.id },
                        data: { currentStock: Math.max(0, product.currentStock - item.qty) }
                    });

                    // Deduct from Batches (StockItems)
                    if (item.batchBarcode) {
                        const batch = await tx.stockItem.findUnique({
                            where: { organizationId_serialNumber: { organizationId, serialNumber: item.batchBarcode } }
                        });
                        if (batch) {
                            await tx.stockItem.update({
                                where: { id: batch.id },
                                data: { quantity: Math.max(0, batch.quantity - item.qty) }
                            });
                        }
                    } else if (item.serialNumbers && item.serialNumbers.length > 0) {
                        for (const serial of item.serialNumbers) {
                            const batch = await tx.stockItem.findUnique({
                                where: { organizationId_serialNumber: { organizationId, serialNumber: serial } }
                            });
                            if (batch) {
                                // if it's a batch, how much do we deduct? if serialNumbers length matches qty, then 1 per serial
                                // if there is only 1 serialNumber but qty is larger, we deduct full qty from it.
                                const deductQty = item.serialNumbers.length === 1 ? item.qty : 1;
                                await tx.stockItem.update({
                                    where: { id: batch.id },
                                    data: { quantity: Math.max(0, batch.quantity - deductQty) }
                                });
                            }
                        }
                    }

                    // Create Movement Log (serial numbers stored as metadata)
                    await tx.stockMovement.create({
                        data: {
                            organizationId,
                            productId: product.id,
                            type: type,
                            quantity: -item.qty,
                            serialNumbers: item.serialNumbers || [],
                            documentNumber,
                            documentId: doc.id,
                            reason: body.notes,
                            performedById,
                            performedByName,
                        }
                    });
                }
            }

            return doc;
        });

        return NextResponse.json({ success: true, document });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'Один или несколько из введенных серийных номеров (штрихкодов) уже числятся на складе.' }, { status: 400 });
        }
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error', details: error }, { status: 500 });
    }
}
