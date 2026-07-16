import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = params.id;
        const body = await req.json();
        const { status, documentNumber, counterpartyName, items, totalAmount, targetOrganizationId, notes } = body;

        const organizationId = session.user.organizationId;
        const performedById = session.user.id;
        const performedByName = session.user.name || 'System';

        // Find existing doc
        const existingDoc = await prisma.stockDocument.findUnique({ where: { id } });
        if (!existingDoc || existingDoc.organizationId !== organizationId) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        if (existingDoc.status !== 'draft' && existingDoc.status !== 'confirmed') {
            return NextResponse.json({ error: 'Only drafts or confirmed documents can be edited' }, { status: 400 });
        }

        const isConfirmingNow = existingDoc.status === 'draft' && status === 'confirmed';

        const document = await prisma.$transaction(async (tx) => {
            // For confirmed documents, we shouldn't allow changing items, totalAmount or targetOrganizationId
            // We only allow updating notes and counterpartyName
            const dataToUpdate: any = {
                counterpartyName,
                notes,
                documentNumber,
            };

            if (existingDoc.status === 'draft') {
                dataToUpdate.targetOrganizationId = targetOrganizationId;
                dataToUpdate.status = status;
                dataToUpdate.totalAmount = totalAmount;
                dataToUpdate.items = items;
                dataToUpdate.confirmedAt = status === 'confirmed' ? new Date() : null;
            }

            const doc = await tx.stockDocument.update({
                where: { id },
                data: dataToUpdate
            });

            // Only update stock if we are confirming a draft right now
            if (isConfirmingNow && doc.type === 'receipt') {
                for (const item of items) {
                    const product = await tx.opticProduct.findUnique({ where: { id: item.productId } });
                    if (!product) continue;

                    // Update total stock
                    const newSpecs = { ...(product.specs as any || {}), receiptDocument: documentNumber };
                    await tx.opticProduct.update({
                        where: { id: product.id },
                        data: { 
                            currentStock: product.currentStock + item.qty,
                            purchasePrice: item.price,
                            ...(product.retailPrice === 0 ? { retailPrice: item.price } : {}),
                            specs: newSpecs
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
                            data: { quantity: existingBatch.quantity + item.qty, purchasePrice: item.price }
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
            } else if (isConfirmingNow && (doc.type === 'transfer_out' || doc.type === 'write_off')) {
                for (const item of items) {
                    const product = await tx.opticProduct.findUnique({ where: { id: item.productId } });
                    if (!product) continue;

                    // Deduct stock
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
                            type: doc.type,
                            quantity: -item.qty,
                            serialNumbers: item.serialNumbers || [],
                            documentNumber,
                            documentId: doc.id,
                            reason: notes,
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
        return NextResponse.json({ error: error.message || 'Internal server error', details: error }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = params.id;
        const organizationId = session.user.organizationId;

        const existingDoc = await prisma.stockDocument.findUnique({ where: { id } });
        if (!existingDoc || existingDoc.organizationId !== organizationId) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        if (existingDoc.status !== 'draft') {
            return NextResponse.json({ error: 'Only drafts can be deleted' }, { status: 400 });
        }

        await prisma.stockDocument.delete({ where: { id } });
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error', details: error }, { status: 500 });
    }
}
