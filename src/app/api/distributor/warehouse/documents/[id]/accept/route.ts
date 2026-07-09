import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const documentId = params.id;
        const organizationId = session.user.organizationId;
        const performedById = session.user.id;
        const performedByName = session.user.name || 'System';

        // Use a transaction
        const result = await prisma.$transaction(async (tx) => {
            const doc = await tx.stockDocument.findUnique({
                where: { id: documentId }
            });

            if (!doc || doc.type !== 'transfer_out' || doc.status !== 'draft') {
                throw new Error('Invalid document for acceptance');
            }
            if (doc.targetOrganizationId !== organizationId) {
                throw new Error('Not authorized to accept this transfer');
            }

            // 1. Mark the outgoing document as confirmed (if we follow a 2-step process, else we keep it as one doc)
            await tx.stockDocument.update({
                where: { id: doc.id },
                data: {
                    status: 'confirmed',
                    confirmedAt: new Date(),
                    performedById,
                    performedByName,
                }
            });

            const items: any = doc.items;
            
            // 2. Add products to the receiving organization (current session org)
            for (const item of items) {
                let product = await tx.opticProduct.findUnique({ 
                    where: { organizationId_sku: { organizationId, sku: item.sku || '' } } 
                });
                
                // If product doesn't exist in target org, we might need to create it (simplified here)
                // For a robust system, products should be synced across branches.
                if (!product) {
                    product = await tx.opticProduct.create({
                        data: {
                            organizationId,
                            name: item.name,
                            sku: item.sku || `SKU-${Date.now()}`,
                            category: 'product',
                            trackSerials: item.trackSerials,
                            purchasePrice: item.price,
                            currentStock: 0,
                        }
                    });
                }

                // Update total stock
                await tx.opticProduct.update({
                    where: { id: product.id },
                    data: { currentStock: product.currentStock + item.qty }
                });

                // Handle serial tracking if applicable
                if (item.trackSerials && item.serialNumbers?.length > 0) {
                    const stockItemsData = item.serialNumbers.map((sn: string) => ({
                        productId: product!.id,
                        organizationId,
                        barcode: sn,
                        serialNumber: item.batchSerialNumber || null,
                        status: 'in_stock',
                        purchasePrice: item.price,
                        receiptDocId: doc.id,
                    }));
                    await tx.stockItem.createMany({ data: stockItemsData });
                }

                // Create Movement Log (Receive in target)
                await tx.stockMovement.create({
                    data: {
                        organizationId,
                        productId: product.id,
                        type: 'receipt', // receive from transfer
                        quantity: item.qty,
                        serialNumbers: item.serialNumbers || [],
                        documentNumber: doc.documentNumber,
                        documentId: doc.id,
                        supplier: doc.organizationId,
                        performedById,
                        performedByName,
                    }
                });

                // 3. Deduct from the sending organization
                const senderProduct = await tx.opticProduct.findUnique({
                    where: { id: item.productId }
                });
                
                if (senderProduct) {
                    await tx.opticProduct.update({
                        where: { id: senderProduct.id },
                        data: { currentStock: Math.max(0, senderProduct.currentStock - item.qty) }
                    });

                    if (item.trackSerials && item.serialNumbers?.length > 0) {
                        await tx.stockItem.updateMany({
                            where: {
                                organizationId: doc.organizationId,
                                serialNumber: { in: item.serialNumbers },
                                status: 'in_stock'
                            },
                            data: { status: 'sold' } // or transferred
                        });
                    }

                    await tx.stockMovement.create({
                        data: {
                            organizationId: doc.organizationId,
                            productId: senderProduct.id,
                            type: 'transfer_out',
                            quantity: -item.qty,
                            serialNumbers: item.serialNumbers || [],
                            documentNumber: doc.documentNumber,
                            documentId: doc.id,
                            customerName: organizationId,
                        }
                    });
                }
            }

            return doc;
        });

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('Error accepting transfer:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
