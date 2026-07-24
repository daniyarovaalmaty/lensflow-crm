import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
    try {
        const patients = await prisma.patient.findMany({
            where: {
                name: {
                    contains: 'Ахмет Инкар',
                    mode: 'insensitive'
                }
            },
            include: {
                orders: true,
                sales: {
                    include: {
                        items: true
                    }
                }
            }
        });

        return NextResponse.json({ patients });
    } catch (e: any) {
        return NextResponse.json({ message: 'Error', error: e.message });
    }
}
