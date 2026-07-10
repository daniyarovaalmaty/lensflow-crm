import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Find the main organization "New Eye"
        const mainOrg = await prisma.organization.findFirst({ where: { name: 'New Eye' } });
        
        if (!mainOrg) {
            return NextResponse.json({ error: 'Main organization "New Eye" not found' });
        }

        // Find all users named Aigerim
        const allAigerims = await prisma.user.findMany({
            where: {
                fullName: { contains: 'Айгерим' }
            },
            include: { organization: true }
        });

        const movedUsers = [];
        const logs = [];

        for (const user of allAigerims) {
            if (user.organizationId !== mainOrg.id) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        organizationId: mainOrg.id,
                        role: 'optic',
                        subRole: 'optic_manager'
                    }
                });
                movedUsers.push({ id: user.id, name: user.fullName, phone: user.phone, fromOrg: user.organization?.name });
                logs.push(`Moved user ${user.fullName} from ${user.organization?.name}`);
                
                // Try to delete the old organization if it's now empty
                if (user.organizationId) {
                    try {
                        const remainingUsers = await prisma.user.count({ where: { organizationId: user.organizationId } });
                        if (remainingUsers === 0) {
                            await prisma.organization.delete({ where: { id: user.organizationId } });
                            logs.push(`Deleted empty org: ${user.organization?.name}`);
                        }
                    } catch (e) {
                        logs.push(`Could not delete org: ${user.organization?.name}`);
                    }
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Accounts merged successfully',
            mainOrg: mainOrg.name,
            movedUsers,
            logs,
            foundAigerims: allAigerims.map(u => u.fullName + ' in ' + u.organization?.name)
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
