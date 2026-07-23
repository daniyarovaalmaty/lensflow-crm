import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ItigrisApiClient, ItigrisSyncService } from '@/lib/itigris';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const orgs = await prisma.organization.findMany();
        let config = null;
        let orgId = null;

        for (const org of orgs) {
            const itigris = (org.metadata as any)?.itigris;
            if (itigris?.company === 'optika_narodnaya' && itigris?.login && itigris?.password) {
                config = itigris;
                orgId = org.id;
                break;
            }
        }

        if (!config || !orgId) {
            return NextResponse.json({ error: 'No Itigris config found' }, { status: 400 });
        }

        const client = new ItigrisApiClient({
            company: config.company,
            login: config.login,
            password: config.password,
            departmentId: Number(config.departmentId) || 0,
            organizationId: orgId
        });

        const departments = await client.getDepartments();
        const kostanayDept = departments.find(d => 
            d.name.toLowerCase().includes('костанай') || 
            d.name.toLowerCase().includes('kostanay')
        );

        if (!kostanayDept) {
            return NextResponse.json({ 
                error: 'Kostanay department not found', 
                available: departments.map(d => d.name) 
            });
        }

        const svc = new ItigrisSyncService(client, prisma as any, orgId);
        
        // This process could take a while. We will trigger it without await and return immediately,
        // or await it. Since Vercel has timeouts, we should probably run it in the background if we 
        // were in prod. Locally we can await it or return the stream. Let's just await it.
        const result = await svc.syncOrders({ departmentId: kostanayDept.id, skipExisting: true });

        return NextResponse.json({
            department: kostanayDept,
            result
        });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || String(e) }, { status: 200 });
    }
}
