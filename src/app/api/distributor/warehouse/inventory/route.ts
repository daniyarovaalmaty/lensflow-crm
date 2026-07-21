import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const inventories = await prisma.inventory.findMany({
            where: { organizationId: session.user.organizationId },
            orderBy: { id: 'desc' },
        });

        return NextResponse.json({ inventories });
    } catch (error) {
        console.error('Error fetching inventories:', error);
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
        const { action, inventoryId, items, notes } = body;

        // action: 'start' | 'save' | 'complete'

        if (action === 'start') {
            // Fetch all products in stock to start an inventory
            const products = await prisma.opticProduct.findMany({
                where: { organizationId: session.user.organizationId },
                include: {
                    stockItems: {
                        where: { status: 'in_stock' },
                        select: { barcode: true }
                    }
                }
            });

            const initialItems = products.map(p => ({
                productId: p.id,
                name: p.name,
                sku: p.sku || '',
                barcode: p.barcode || '',
                trackSerials: p.trackSerials,
                systemQty: p.currentStock,
                actualQty: p.currentStock, // default to system qty
                diff: 0,
                note: '',
                stockItemBarcodes: p.stockItems
                    ?.map((si: any) => si.barcode)
                    .filter(Boolean) || [],
            }));

            const inventoryNumber = `ИНВ-${Date.now().toString().slice(-6)}`;

            const inventory = await prisma.inventory.create({
                data: {
                    organizationId: session.user.organizationId,
                    inventoryNumber,
                    status: 'in_progress',
                    items: initialItems,
                    totalProducts: initialItems.length,
                    performedById: session.user.id,
                    performedByName: session.user.name,
                }
            });

            return NextResponse.json({ success: true, inventory });
        }

        if (action === 'save' || action === 'complete') {
            if (!inventoryId) {
                return NextResponse.json({ error: 'inventoryId is required' }, { status: 400 });
            }

            let surplusCount = 0;
            let shortageCount = 0;
            let checkedProducts = 0;

            if (items && Array.isArray(items)) {
                items.forEach((item: any) => {
                    item.diff = item.actualQty - item.systemQty;
                    if (item.diff > 0) surplusCount++;
                    if (item.diff < 0) shortageCount++;
                    if (item.actualQty !== item.systemQty) checkedProducts++; // simplistic
                });
            }

            const updateData: any = {
                items,
                notes,
                surplusCount,
                shortageCount,
                checkedProducts: items?.length || 0,
            };

            if (action === 'complete') {
                updateData.status = 'completed';
                updateData.completedAt = new Date();
                
                // Adjust stock based on inventory results
                if (items && Array.isArray(items)) {
                    const adjustments = items.filter((item: any) => item.diff !== 0);
                    
                    for (const item of adjustments) {
                        // Update product stock to match actual count
                        await prisma.opticProduct.update({
                            where: { id: item.productId },
                            data: { currentStock: item.actualQty }
                        });
                        
                        if (item.trackSerials) {
                            const expected = item.stockItemBarcodes || [];
                            const scanned = item.scannedSerials || [];
                            const shortages = expected.filter((b: string) => !scanned.includes(b));
                            const surpluses = scanned.filter((b: string) => !expected.includes(b));
                            
                            if (shortages.length > 0) {
                                await prisma.stockItem.updateMany({
                                    where: { 
                                        productId: item.productId,
                                        barcode: { in: shortages },
                                        status: 'in_stock'
                                    },
                                    data: { status: 'written_off' }
                                });
                            }
                            
                            if (surpluses.length > 0) {
                                const productData = await prisma.opticProduct.findUnique({ where: { id: item.productId }, select: { purchasePrice: true } });
                                const price = productData?.purchasePrice || 0;
                                
                                for (const barcode of surpluses) {
                                    await prisma.stockItem.create({
                                        data: {
                                            organizationId: session.user.organizationId,
                                            productId: item.productId,
                                            barcode: barcode,
                                            status: 'in_stock',
                                            purchasePrice: price
                                        }
                                    });
                                }
                            }
                        }
                        
                        // Create stock movement record for the adjustment
                        await prisma.stockMovement.create({
                            data: {
                                productId: item.productId,
                                organizationId: session.user.organizationId,
                                type: 'adjustment',
                                quantity: Math.abs(item.diff),
                                reason: item.diff > 0 
                                    ? `Ревизия: излишек +${item.diff}` 
                                    : `Ревизия: недостача ${item.diff}`,
                                documentNumber: inventoryId,
                                performedById: session.user.id,
                                performedByName: session.user.name || 'Система',
                            }
                        });
                    }
                }
            }

            const inventory = await prisma.inventory.update({
                where: { id: inventoryId, organizationId: session.user.organizationId },
                data: updateData
            });

            return NextResponse.json({ success: true, inventory });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Error handling inventory:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
