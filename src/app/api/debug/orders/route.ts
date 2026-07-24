import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { 
                orderNumber: true, 
                status: true, 
                organizationId: true, 
                createdById: true,
                createdAt: true,
                opticName: true,
            }
        });
        
        const orgs = await prisma.organization.findMany({
            where: { name: { contains: 'Коновалов' } }
        });
        
        const users = await prisma.user.findMany({
            where: { organizationId: { in: orgs.map(o => o.id) } },
            select: { id: true, email: true, role: true, subRole: true, fullName: true, organizationId: true }
        });

        return NextResponse.json({ orders, orgs, users });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
