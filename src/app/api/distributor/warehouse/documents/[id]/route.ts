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
        const { status, documentNumber, counterpartyName, items, totalAmount, targetOrganizationId, notes: bodyNotes, documentDate, declarationNumber, declarationDate } = body;

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
        const isReconfirmingNow = existingDoc.status === 'confirmed' && status === 'confirmed';

        let finalNotes = bodyNotes;
        if (documentDate !== undefined || declarationNumber !== undefined || declarationDate !== undefined) {
            let existingNotesObj: any = {};
            try {
                if (existingDoc.notes) {
                    existingNotesObj = JSON.parse(existingDoc.notes);
                }
            } catch (e) {}
            
            finalNotes = JSON.stringify({
                ...existingNotesObj,
                declarationNumber: declarationNumber !== undefined ? declarationNumber : existingNotesObj.declarationNumber || '',
                declarationDate: declarationDate !== undefined ? declarationDate : existingNotesObj.declarationDate || '',
                documentDate: documentDate !== undefined ? documentDate : existingNotesObj.documentDate || '',
                userNotes: bodyNotes !== undefined ? bodyNotes : existingNotesObj.userNotes || ''
            });
        }

        const document = await prisma.$transaction(async (tx) => {
            // For confirmed documents, we shouldn't allow changing items, totalAmount or targetOrganizationId
            // We only allow updating notes and counterpartyName
            const dataToUpdate: any = {
                counterpartyName,
                notes: finalNotes,
                documentNumber,
            };

            if (existingDoc.status === 'draft') {
                dataToUpdate.targetOrganizationId = targetOrganizationId;
                dataToUpdate.status = status;
                dataToUpdate.totalAmount = totalAmount;
                dataToUpdate.items = items;
                dataToUpdate.confirmedAt = status === 'confirmed' ? new Date() : null;
            } else if (isReconfirmingNow) {
                // Allows updating items and totalAmount of confirmed document
                dataToUpdate.totalAmount = totalAmount;
                dataToUpdate.items = items;
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
            } else if (isReconfirmingNow && doc.type === 'receipt') {
                const oldItems = existingDoc.items as any[] || [];
                const newItems = items as any[] || [];
                
                // Diff by batchBarcode
                const diffMap = new Map<string, { product: any, diffQty: number, price: number, oldItem?: any, newItem?: any }>();
                
                for (const oldItem of oldItems) {
                    if (!oldItem.batchBarcode) continue; 
                    diffMap.set(oldItem.batchBarcode, { 
                        product: oldItem.productId, 
                        diffQty: -oldItem.qty, 
                        price: oldItem.price,
                        oldItem: oldItem
                    });
                }
                
                for (const newItem of newItems) {
                    const barcode = newItem.batchBarcode;
                    if (!barcode) continue;
                    if (diffMap.has(barcode)) {
                        const existing = diffMap.get(barcode)!;
                        existing.diffQty += newItem.qty;
                        existing.newItem = newItem;
                        existing.price = newItem.price;
                    } else {
                        diffMap.set(barcode, {
                            product: newItem.productId,
                            diffQty: newItem.qty,
                            price: newItem.price,
                            newItem: newItem
                        });
                    }
                }

                // Apply diffs
                for (const [barcode, data] of diffMap.entries()) {
                    if (data.diffQty === 0 && (!data.newItem || data.newItem.price === data.oldItem?.price)) {
                        // Same qty and price, just update metadata if needed
                        if (data.newItem) {
                            await tx.stockItem.updateMany({
                                where: { organizationId, serialNumber: barcode },
                                data: {
                                    purchasePrice: data.newItem.price,
                                    expiryDate: data.newItem.batchExpiration ? new Date(data.newItem.batchExpiration) : null,
                                    diopters: data.newItem.batchDiopters || null,
                                    size: data.newItem.batchSize || null,
                                }
                            });
                        }
                        continue;
                    }

                    const product = await tx.opticProduct.findUnique({ where: { id: data.product } });
                    if (!product) continue;

                    const batch = await tx.stockItem.findUnique({
                        where: { organizationId_serialNumber: { organizationId, serialNumber: barcode } }
                    });

                    if (data.diffQty < 0) {
                        const reduceBy = Math.abs(data.diffQty);
                        if (batch && batch.quantity < reduceBy) {
                            throw new Error(`Партия ${barcode} уже продана/списана (остаток ${batch.quantity}, попытка уменьшить на ${reduceBy}).`);
                        }
                        if (product.currentStock < reduceBy) {
                            throw new Error(`Общий остаток товара "${product.name}" недостаточен для уменьшения партии.`);
                        }
                    }

                    if (data.diffQty !== 0) {
                        await tx.opticProduct.update({
                            where: { id: product.id },
                            data: { 
                                currentStock: product.currentStock + data.diffQty,
                                ...(data.newItem && data.newItem.price > 0 ? { purchasePrice: data.newItem.price } : {})
                            }
                        });
                    }

                    if (batch) {
                        const newQty = batch.quantity + data.diffQty;
                        await tx.stockItem.update({
                            where: { id: batch.id },
                            data: { 
                                quantity: newQty,
                                ...(data.newItem ? {
                                    purchasePrice: data.newItem.price,
                                    expiryDate: data.newItem.batchExpiration ? new Date(data.newItem.batchExpiration) : null,
                                    diopters: data.newItem.batchDiopters || null,
                                    size: data.newItem.batchSize || null,
                                } : {})
                            }
                        });
                    } else if (data.diffQty > 0 && data.newItem) {
                        await tx.stockItem.create({
                            data: {
                                productId: product.id,
                                organizationId,
                                serialNumber: barcode,
                                quantity: data.diffQty,
                                purchasePrice: data.newItem.price,
                                expiryDate: data.newItem.batchExpiration ? new Date(data.newItem.batchExpiration) : null,
                                productionDate: data.newItem.batchProduction ? new Date(data.newItem.batchProduction) : null,
                                diopters: data.newItem.batchDiopters || null,
                                size: data.newItem.batchSize || null,
                                receiptDocId: doc.id
                            }
                        });
                    }
                }

                await tx.stockMovement.deleteMany({
                    where: { documentId: doc.id, organizationId }
                });

                for (const newItem of newItems) {
                    if (!newItem.batchBarcode) continue;
                    await tx.stockMovement.create({
                        data: {
                            organizationId,
                            productId: newItem.productId,
                            type: 'receipt',
                            quantity: newItem.qty,
                            serialNumbers: [newItem.batchBarcode],
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
        }, {
            maxWait: 10000,
            timeout: 30000
        });

        return NextResponse.json({ success: true, document });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'Один или несколько из введенных серийных номеров (штрихкодов) уже числятся на складе.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Internal server error', details: String(error) }, { status: 500 });
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
