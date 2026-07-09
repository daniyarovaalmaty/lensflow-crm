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
        const { type, status, documentNumber, counterpartyName, items, totalAmount, targetOrganizationId, notes } = body;

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
                    notes,
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

                    // Update total stock
                    await tx.opticProduct.update({
                        where: { id: product.id },
                        data: { currentStock: product.currentStock + item.qty }
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
            } else if (status === 'confirmed' && (type === 'transfer_out' || type === 'write_off')) {
                for (const item of items) {
                    const product = await tx.opticProduct.findUnique({ where: { id: item.productId } });
                    if (!product) continue;

                    // Update total stock
                    await tx.opticProduct.update({
                        where: { id: product.id },
                        data: { currentStock: Math.max(0, product.currentStock - item.qty) }
                    });

                    // Handle serial tracking if applicable
                    if (item.trackSerials && item.serialNumbers?.length > 0) {
                        await tx.stockItem.updateMany({
                            where: {
                                organizationId,
                                serialNumber: { in: item.serialNumbers },
                                status: 'in_stock'
                            },
                            data: { status: type === 'write_off' ? 'written_off' : 'sold' }
                        });
                    }

                    // Create Movement Log
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
