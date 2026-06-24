export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { ItigrisApiClient } from '@/lib/itigris';

/**
 * GET /api/itigris/browse — read-only live window into ITIGRIS (Optima) data.
 * Lets the cabinet show everything ITIGRIS exposes without syncing it all in.
 *
 *   ?entity=departments
 *   ?entity=clients&q=иван&page=0
 *   ?entity=orders&page=0&departmentId=...
 *   ?entity=registry&dateFrom=ISO&dateTo=ISO&departmentId=...
 *   ?entity=remains&departmentId=...
 */
async function buildClient(orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const itg = (org as any)?.metadata?.itigris;
    if (!itg?.company || !itg?.login || !itg?.password) return null;
    return new ItigrisApiClient({
        company: itg.company,
        login: itg.login,
        password: itg.password,
        departmentId: Number(itg.departmentId) || 0,
        organizationId: orgId,
    });
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = (session.user as any).organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const client = await buildClient(orgId);
    if (!client) return NextResponse.json({ error: 'ITIGRIS не подключён' }, { status: 400 });

    const sp = new URL(req.url).searchParams;
    const entity = sp.get('entity') || 'departments';
    const departmentId = sp.get('departmentId');

    try {
        // Orders/registry/remains are department-scoped — switch if asked.
        if (departmentId && entity !== 'departments' && entity !== 'clients') {
            await client.signInToDepartment(Number(departmentId));
        }

        switch (entity) {
            case 'departments':
                return NextResponse.json({ entity, items: await client.getDepartments() });

            case 'clients': {
                const q = sp.get('q') || 'а';
                const page = Number(sp.get('page')) || 0;
                return NextResponse.json({ entity, items: await client.searchClients(q, 'FULL_NAME', page, 50) });
            }

            case 'orders': {
                const page = Number(sp.get('page')) || 0;
                const { content, totalElements } = await client.getDepartmentOrders(page, 50);
                return NextResponse.json({ entity, items: content, total: totalElements, page });
            }

            case 'registry': {
                // Appointment journal — requires a LocalDate window (YYYY-MM-DD; default ±30 days).
                const now = Date.now();
                const appointmentFrom = (sp.get('dateFrom') || new Date(now - 30 * 864e5).toISOString()).slice(0, 10);
                const appointmentTo = (sp.get('dateTo') || new Date(now + 30 * 864e5).toISOString()).slice(0, 10);
                const items = await client.getRegistryRecords({
                    appointmentFrom, appointmentTo,
                    departmentId: departmentId ? Number(departmentId) : undefined,
                });
                return NextResponse.json({ entity, items });
            }

            default:
                return NextResponse.json({ error: `Неизвестная сущность: ${entity}` }, { status: 400 });
        }
    } catch (e: any) {
        const msg = e.response?.data?.errors?.[0]?.message || e.response?.status || e.message;
        return NextResponse.json({ error: `ITIGRIS: ${msg}`, status: e.response?.status }, { status: 502 });
    }
}
