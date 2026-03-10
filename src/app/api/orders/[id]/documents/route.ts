export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

interface ClosingDocument {
    name: string;
    data: string; // base64
    mimeType: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
}

/**
 * GET /api/orders/[id]/documents - List closing documents for an order
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const order = await prisma.order.findUnique({
            where: { orderNumber: params.id },
            select: { closingDocuments: true },
        });
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const docs = (order.closingDocuments as ClosingDocument[] | null) || [];

        // If ?download=INDEX, return the actual file
        const downloadIdx = request.nextUrl.searchParams.get('download');
        if (downloadIdx !== null) {
            const idx = parseInt(downloadIdx, 10);
            if (idx < 0 || idx >= docs.length) {
                return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
            }
            const doc = docs[idx];
            const buffer = Buffer.from(doc.data, 'base64');
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': doc.mimeType || 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.name)}"`,
                    'Content-Length': buffer.length.toString(),
                },
            });
        }

        // Return metadata only (without base64 data) for listing
        const meta = docs.map((d, i) => ({
            index: i,
            name: d.name,
            mimeType: d.mimeType,
            size: d.size,
            uploadedAt: d.uploadedAt,
            uploadedBy: d.uploadedBy,
        }));

        return NextResponse.json(meta);
    } catch (error) {
        console.error('GET /api/orders/[id]/documents error:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

/**
 * POST /api/orders/[id]/documents - Upload a closing document
 * Expects: { name, data (base64), mimeType, size }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const body = await request.json();
        const { name, data, mimeType, size } = body;

        if (!name || !data || !mimeType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { orderNumber: params.id },
            select: { id: true, closingDocuments: true },
        });
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const existing = (order.closingDocuments as ClosingDocument[] | null) || [];
        const newDoc: ClosingDocument = {
            name,
            data,
            mimeType,
            size: size || 0,
            uploadedAt: new Date().toISOString(),
            uploadedBy: session.user.name || session.user.email || 'unknown',
        };

        await prisma.order.update({
            where: { id: order.id },
            data: { closingDocuments: [...existing, newDoc] as any },
        });

        return NextResponse.json({ success: true, count: existing.length + 1 });
    } catch (error) {
        console.error('POST /api/orders/[id]/documents error:', error);
        return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }
}

/**
 * DELETE /api/orders/[id]/documents - Delete a closing document by index
 * Expects: { index: number }
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const body = await request.json();
        const { index } = body;

        const order = await prisma.order.findUnique({
            where: { orderNumber: params.id },
            select: { id: true, closingDocuments: true },
        });
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const existing = (order.closingDocuments as ClosingDocument[] | null) || [];
        if (index < 0 || index >= existing.length) {
            return NextResponse.json({ error: 'Invalid document index' }, { status: 400 });
        }

        existing.splice(index, 1);
        await prisma.order.update({
            where: { id: order.id },
            data: { closingDocuments: existing as any },
        });

        return NextResponse.json({ success: true, count: existing.length });
    } catch (error) {
        console.error('DELETE /api/orders/[id]/documents error:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}
