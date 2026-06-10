import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
        if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

        const saleId = params.id;
        const orgId = user.organizationId;

        // Fetch the sale
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: { items: true },
        });

        if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
        if (sale.organizationId !== orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // Check if already refunded
        if (sale.paymentStatus === 'refunded') {
            return NextResponse.json({ error: 'Sale is already refunded' }, { status: 400 });
        }

        // Process refund
        await prisma.$transaction(async (tx) => {
            // 1. Mark sale as refunded
            await tx.sale.update({
                where: { id: saleId },
                data: { paymentStatus: 'refunded' },
            });

            // 2. Return items to stock
            for (const item of sale.items) {
                // If the item has no productId, it's not a real stock item
                if (!item.productId) continue;

                const product = await tx.opticProduct.findUnique({
                    where: { id: item.productId }
                });

                if (!product) continue;

                // Only products are returned to stock (services are not)
                if (product.type === 'product') {
                    // Update StockItems
                    if (product.trackSerials && item.serialNumbers && Array.isArray(item.serialNumbers) && item.serialNumbers.length > 0) {
                        // Return specific serial numbers
                        await tx.stockItem.updateMany({
                            where: {
                                organizationId: orgId,
                                productId: product.id,
                                serialNumber: { in: item.serialNumbers as string[] },
                                status: 'sold'
                            },
                            data: {
                                status: 'in_stock',
                                soldAt: null
                            }
                        });
                    } else {
                        // Return bulk items (just grab the N most recently sold items of this product)
                        const soldItemsToReturn = await tx.stockItem.findMany({
                            where: {
                                organizationId: orgId,
                                productId: product.id,
                                status: 'sold'
                            },
                            orderBy: { soldAt: 'desc' },
                            take: item.quantity
                        });

                        for (const si of soldItemsToReturn) {
                            await tx.stockItem.update({
                                where: { id: si.id },
                                data: {
                                    status: 'in_stock',
                                    soldAt: null
                                }
                            });
                        }
                    }

                    // Increment product stock
                    await tx.opticProduct.update({
                        where: { id: product.id },
                        data: {
                            currentStock: { increment: item.quantity }
                        }
                    });

                    // Create stock movement record for the return
                    await tx.stockMovement.create({
                        data: {
                            organizationId: orgId,
                            productId: product.id,
                            type: 'return_in', // returning items to stock
                            quantity: item.quantity,
                            documentNumber: `Возврат по ${sale.saleNumber}`,
                            customerName: sale.customerName || null,
                            performedById: user.id,
                            performedByName: user.fullName || user.email,
                            serialNumbers: item.serialNumbers ? (item.serialNumbers as any) : undefined
                        }
                    });
                }
            }

            // 3. Handle Lead revenue if attributed
            if (sale.leadId) {
                await tx.lead.update({
                    where: { id: sale.leadId },
                    data: {
                        revenue: { decrement: sale.total }
                        // We intentionally don't revert the 'converted' stage because a lead could have multiple sales.
                        // Or if it was the only sale, keeping it converted is safer than guessing.
                    }
                });

                await tx.leadActivity.create({
                    data: {
                        leadId: sale.leadId,
                        action: 'note',
                        details: `Возврат по чеку ${sale.saleNumber}. Выручка уменьшена на ${sale.total} ₸.`,
                        userId: user.id
                    }
                });
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Sale Refund] error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
