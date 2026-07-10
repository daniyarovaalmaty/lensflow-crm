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

        // Find any users in other organizations whose name contains 'Айгерим'
        // or phone matches, etc. We can just move all users from "Офтальмологический центр «New Eye»"
        const secondaryOrg = await prisma.organization.findFirst({
            where: {
                name: {
                    contains: 'Офтальмологический',
                }
            }
        });

        // Let's find organizations that might be duplicates
        const allOrgs = await prisma.organization.findMany({
            where: {
                name: { contains: 'New Eye' }
            }
        });

        const movedUsers = [];
        const logs = [];

        for (const org of allOrgs) {
            if (org.id !== mainOrg.id) {
                const users = await prisma.user.findMany({ where: { organizationId: org.id } });
                for (const u of users) {
                    await prisma.user.update({
                        where: { id: u.id },
                        data: {
                            organizationId: mainOrg.id,
                            role: 'optic',
                            subRole: 'optic_manager'
                        }
                    });
                    movedUsers.push({ id: u.id, name: u.fullName, phone: u.phone });
                }
                logs.push(`Processed org: ${org.name}`);
                
                // Safely delete empty orgs if possible
                try {
                    await prisma.organization.delete({ where: { id: org.id } });
                    logs.push(`Deleted empty org: ${org.name}`);
                } catch (e) {
                    logs.push(`Could not delete org: ${org.name} (might have relations)`);
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Accounts merged successfully',
            mainOrg: mainOrg.name,
            movedUsers,
            logs,
            allOrgsFound: allOrgs.map(o => o.name)
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
