import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, brand, model, barcode, sku, specs } = body;

        const product = await prisma.opticProduct.findUnique({
            where: { id: params.id, organizationId: session.user.organizationId }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const updatedProduct = await prisma.opticProduct.update({
            where: { id: params.id },
            data: {
                name,
                brand,
                model,
                barcode,
                sku,
                specs: specs || {}
            }
        });

        return NextResponse.json({ success: true, product: updatedProduct });
    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const product = await prisma.opticProduct.findUnique({
            where: { id: params.id, organizationId: session.user.organizationId }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Force delete associated stock movements, items, and sales items
        await prisma.stockMovement.deleteMany({
            where: { 
                productId: params.id,
                organizationId: session.user.organizationId 
            }
        });

        await prisma.stockItem.deleteMany({
            where: { 
                productId: params.id,
                organizationId: session.user.organizationId 
            }
        });

        const saleItemsToDelete = await prisma.saleItem.findMany({
            where: { 
                productId: params.id,
                sale: {
                    organizationId: session.user.organizationId
                }
            },
            select: { id: true }
        });

        if (saleItemsToDelete.length > 0) {
            await prisma.saleItem.deleteMany({
                where: { 
                    id: { in: saleItemsToDelete.map(si => si.id) }
                }
            });
        }

        await prisma.opticProduct.delete({
            where: { 
                id: params.id,
                organizationId: session.user.organizationId 
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
