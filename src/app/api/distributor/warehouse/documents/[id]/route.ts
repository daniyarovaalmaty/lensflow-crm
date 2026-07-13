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

        if (existingDoc.status !== 'draft') {
            return NextResponse.json({ error: 'Only drafts can be edited' }, { status: 400 });
        }

        const document = await prisma.$transaction(async (tx) => {
            const doc = await tx.stockDocument.update({
                where: { id },
                data: {
                    documentNumber,
                    targetOrganizationId,
                    status,
                    counterpartyName,
                    notes,
                    totalAmount,
                    items,
                    confirmedAt: status === 'confirmed' ? new Date() : null,
                }
            });

            if (status === 'confirmed' && doc.type === 'receipt') {
                for (const item of items) {
                    const product = await tx.opticProduct.findUnique({ where: { id: item.productId } });
                    if (!product) continue;

                    // Update total stock
                    const newSpecs = { ...(product.specs as any || {}), receiptDocument: documentNumber };
                    await tx.opticProduct.update({
                        where: { id: product.id },
                        data: { 
                            currentStock: product.currentStock + item.qty,
                            specs: newSpecs
                        }
                    });

                    // Handle serial tracking if applicable
                    if (item.trackSerials && item.serialNumbers?.length > 0) {
                        const stockItemsData = item.serialNumbers.map((sn: string) => ({
                            productId: product.id,
                            organizationId,
                            serialNumber: sn,
                            status: 'in_stock',
                            purchasePrice: item.price,
                            receiptDocId: doc.id,
                        }));
                        await tx.stockItem.createMany({ data: stockItemsData });
                    }

                    // Create Movement Log
                    await tx.stockMovement.create({
                        data: {
                            organizationId,
                            productId: product.id,
                            type: 'receipt',
                            quantity: item.qty,
                            serialNumbers: item.serialNumbers || [],
                            documentNumber,
                            documentId: doc.id,
                            supplier: counterpartyName,
                            performedById,
                            performedByName,
                        }
                    });
                }
            } else if (status === 'confirmed' && (doc.type === 'transfer_out' || doc.type === 'write_off')) {
                for (const item of items) {
                    const product = await tx.opticProduct.findUnique({ where: { id: item.productId } });
                    if (!product) continue;

                    // Deduct stock
                    await tx.opticProduct.update({
                        where: { id: product.id },
                        data: { currentStock: Math.max(0, product.currentStock - item.qty) }
                    });

                    // Update serial items status
                    if (item.trackSerials && item.serialNumbers?.length > 0) {
                        await tx.stockItem.updateMany({
                            where: {
                                organizationId,
                                barcode: { in: item.serialNumbers },
                                status: 'in_stock'
                            },
                            data: { status: doc.type === 'write_off' ? 'written_off' : 'sold' }
                        });
                    }

                    // Create Movement Log
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
