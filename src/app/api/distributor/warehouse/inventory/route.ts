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
                
                // When completing an inventory, we might generate adjustments. 
                // For simplicity in this iteration, we just mark it complete. 
                // A full implementation would adjust stock via StockMovement.
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
