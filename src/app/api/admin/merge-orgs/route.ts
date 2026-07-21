export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
    const org1 = await prisma.organization.findFirst({ where: { name: 'New Eye' } });
    const org2 = await prisma.organization.findFirst({ where: { name: { contains: 'Офтальмологический центр' } } });

    if (!org1 || !org2 || org1.id === org2.id) {
        return NextResponse.json({ message: 'No orgs to merge or already merged' });
    }

    const usersInOrg2 = await prisma.user.findMany({ where: { organizationId: org2.id } });
    const movedUsers = [];
    
    for (const u of usersInOrg2) {
        await prisma.user.update({
            where: { id: u.id },
            data: { 
                organizationId: org1.id,
                role: 'optic',
                subRole: 'optic_manager'
            }
        });
        movedUsers.push(u.fullName);
    }
    
    // Check if org2 has any other data before deleting
    // In this case, we just leave it empty or try to delete
    try {
        await prisma.organization.delete({ where: { id: org2.id } });
    } catch (e) {
        console.log("Could not delete org2, might have relations", e);
    }

    return NextResponse.json({ message: 'Merged', movedUsers });
}
