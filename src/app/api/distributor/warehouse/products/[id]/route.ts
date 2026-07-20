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
        const { name, brand, model, barcode, sku, purchasePrice, retailPrice, specs, trackSerials } = body;

        const product = await prisma.opticProduct.findFirst({
            where: { id: params.id, organizationId: session.user.organizationId }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const dataToUpdate: any = {
            name,
            brand,
            model,
            barcode,
            sku,
            purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : undefined,
            retailPrice: retailPrice !== undefined ? Number(retailPrice) : undefined,
        };

        if (specs !== undefined) dataToUpdate.specs = specs;
        if (trackSerials !== undefined) dataToUpdate.trackSerials = Boolean(trackSerials);

        const updatedProduct = await prisma.opticProduct.update({
            where: { id: params.id },
            data: dataToUpdate
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

        const product = await prisma.opticProduct.findFirst({
            where: { id: params.id, organizationId: session.user.organizationId }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        if (product.currentStock > 0) {
            return NextResponse.json({ error: 'Невозможно удалить товар с положительным остатком.' }, { status: 400 });
        }

        const hasStockMovements = await prisma.stockMovement.findFirst({
            where: { productId: params.id, organizationId: session.user.organizationId },
            select: { id: true }
        });

        const hasSaleItems = await prisma.saleItem.findFirst({
            where: { 
                productId: params.id,
                sale: {
                    organizationId: session.user.organizationId
                }
            },
            select: { id: true }
        });

        if (hasStockMovements || hasSaleItems) {
            return NextResponse.json({ error: 'Невозможно удалить товар, так как по нему есть движения на складе или он используется в заказах.' }, { status: 400 });
        }

        // Delete any orphaned stock items (with 0 quantity) since there are no movements
        await prisma.stockItem.deleteMany({
            where: { productId: params.id, organizationId: session.user.organizationId }
        });

        await prisma.opticProduct.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
