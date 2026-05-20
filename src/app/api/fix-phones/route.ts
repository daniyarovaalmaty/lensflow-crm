import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

function normalizePhone(phone: string): string {
    if (!phone) return phone;
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8') && digits.length === 11) digits = '7' + digits.slice(1);
    if (digits.length === 10) digits = '7' + digits;
    return '+' + digits;
}

export async function GET() {
    const users = await prisma.user.findMany();
    let updated = 0;
    const results = [];
    for (const user of users) {
        if (user.phone) {
            const norm = normalizePhone(user.phone);
            if (user.phone !== norm) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { phone: norm }
                });
                updated++;
                results.push(`Updated ${user.email} from ${user.phone} to ${norm}`);
            }
        }
    }
    return NextResponse.json({ updated, results });
}
