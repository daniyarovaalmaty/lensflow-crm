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
        const category = searchParams.get('category');

        const templates = await prisma.medicalTemplate.findMany({
            where: {
                organizationId: session.user.organizationId,
                authorId: session.user.id,
                ...(category ? { category } : {})
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
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
        const { category, title, text } = body;

        if (!category || !title || !text) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const template = await prisma.medicalTemplate.create({
            data: {
                organizationId: session.user.organizationId,
                authorId: session.user.id,
                category,
                title,
                text
            }
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error('Error creating template:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
