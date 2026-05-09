import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// POST /api/patients/dedup — merge duplicate patients by phone number
export async function POST() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Normalize phone number: strip +, spaces, dashes
    const normalize = (p: string) => p.replace(/[\s\-\+\(\)]/g, '');

    // Get all patients for this org/doctor
    const all = await prisma.patient.findMany({
        where: {
            OR: [
                { organizationId: session.user.organizationId || 'none' },
                { doctorId: session.user.id },
            ],
        },
        include: {
            prescriptions: true,
            _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    // Group by normalized phone
    const groups = new Map<string, typeof all>();
    for (const p of all) {
        if (!p.phone) continue;
        const key = normalize(p.phone);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(p);
    }

    let merged = 0;
    let deleted = 0;

    for (const [phone, group] of groups) {
        if (group.length <= 1) continue;

        // Pick the "best" record as master:
        // Prefer the one with orders, then the one with most data, then oldest
        const master = group.reduce((best, cur) => {
            const bestScore = (best._count.orders > 0 ? 100 : 0) +
                (best.medmundusId ? 50 : 0) +
                (best.name.includes(' ') ? 10 : 0) +
                (best.birthDate ? 5 : 0) +
                (best.email ? 3 : 0);
            const curScore = (cur._count.orders > 0 ? 100 : 0) +
                (cur.medmundusId ? 50 : 0) +
                (cur.name.includes(' ') ? 10 : 0) +
                (cur.birthDate ? 5 : 0) +
                (cur.email ? 3 : 0);
            return curScore > bestScore ? cur : best;
        });

        const duplicates = group.filter(p => p.id !== master.id);

        // Fill in missing fields from duplicates
        const updates: any = {};
        if (!master.email) {
            const withEmail = duplicates.find(d => d.email);
            if (withEmail) updates.email = withEmail.email;
        }
        if (!master.birthDate) {
            const withBirth = duplicates.find(d => d.birthDate);
            if (withBirth) updates.birthDate = withBirth.birthDate;
        }
        if (!master.gender) {
            const withGender = duplicates.find(d => d.gender);
            if (withGender) updates.gender = withGender.gender;
        }
        if (!master.medmundusId) {
            const withMM = duplicates.find(d => d.medmundusId);
            if (withMM) updates.medmundusId = withMM.medmundusId;
        }
        if (!master.notes) {
            const withNotes = duplicates.find(d => d.notes);
            if (withNotes) updates.notes = withNotes.notes;
        }

        // Update master with merged data
        if (Object.keys(updates).length > 0) {
            await prisma.patient.update({ where: { id: master.id }, data: updates });
        }

        // Re-link orders and prescriptions from duplicates to master
        for (const dup of duplicates) {
            await prisma.order.updateMany({
                where: { patientId: dup.id },
                data: { patientId: master.id },
            });
            await prisma.prescription.updateMany({
                where: { patientId: dup.id },
                data: { patientId: master.id },
            });
        }

        // Delete duplicates
        await prisma.patient.deleteMany({
            where: { id: { in: duplicates.map(d => d.id) } },
        });

        merged++;
        deleted += duplicates.length;
    }

    return NextResponse.json({ merged, deleted, message: `Объединено: ${merged} групп, удалено ${deleted} дублей` });
}
