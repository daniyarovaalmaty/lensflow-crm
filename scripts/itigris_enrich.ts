/**
 * Enrich ITIGRIS orders with full parameters (prescription, lens, frame).
 * Strategy: sign in to each dept ONCE → fetch all dept orders → update in DB.
 * This minimizes API calls: 1 sign-in per dept, not 1 per order.
 */
import axios from 'axios';
import prisma from '../src/lib/db/prisma';

const BASE = 'https://optima.itigris.ru';

async function signIn(company: string, login: string, password: string, departmentId: number) {
    try {
        const res = await axios.post(`${BASE}/${company}/api/v2/sign/in`, {
            company, login, password, departmentId,
        }, { timeout: 15000 });
        return res.data?.accessToken as string | null;
    } catch {
        return null;
    }
}

async function getDepartments(company: string, token: string) {
    try {
        const res = await axios.get(`${BASE}/${company}/api/v2/departments`, {
            params: { page: 0, size: 100 },
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
        });
        return (res.data?.content || []) as any[];
    } catch { return []; }
}

async function getDeptOrders(company: string, token: string, page = 0, size = 50) {
    try {
        const res = await axios.get(`${BASE}/${company}/api/v2/orders`, {
            params: { page, size },
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
        });
        return { content: res.data?.content || [], total: res.data?.totalElements || 0 };
    } catch { return { content: [], total: 0 }; }
}

async function getOrderFull(company: string, token: string, orderId: number) {
    try {
        const res = await axios.get(`${BASE}/${company}/api/v2/orders/${orderId}/full`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
        });
        return res.data;
    } catch (err: any) {
        if (err.response?.status === 409) return null; // wrong dept
        return null;
    }
}

function buildLensConfig(full: any): object {
    if (!full) return {};
    const rx = full.medicalData?.prescriptions?.[0];
    const goods: any[] = full.goods || [];
    const od = goods.find(g => g.isRight === true);
    const os = goods.find(g => g.isRight === false);
    const lensInfo = (g: any) => g?.goodParams ? {
        manufacturer: g.goodParams.manufacturer, brand: g.goodParams.brand,
        cover: g.goodParams.cover, index: g.goodParams.refractionIndex,
        diameter: g.goodParams.diameter, material: g.goodParams.material,
        dioptre: g.goodParams.dioptre, add: g.goodParams.add, price: g.totalSoldPrice,
    } : null;
    return {
        source: 'itigris', orderType: full.type,
        prescription: rx ? {
            od: { sph: rx.sphOd, cyl: rx.cylOd, ax: rx.axOd, add: rx.addOd, pd: rx.dppOd, visus: rx.visusOd },
            os: { sph: rx.sphOs, cyl: rx.cylOs, ax: rx.axOs, add: rx.addOs, pd: rx.dppOs, visus: rx.visusOs },
            totalPd: rx.dpp, purpose: rx.purpose, recommendedLenses: rx.recommendedLenses,
            notes: rx.comments, date: rx.date, doctor: rx.doctor?.fullName || null,
        } : null,
        lens: { od: lensInfo(od), os: lensInfo(os) },
        frame: full.clientGoods?.frame ? { type: full.clientGoods.frame.type, material: full.clientGoods.frame.material } : null,
        department: full.department?.name || null, seller: full.user?.fullName || null,
    };
}

async function processOrg(orgId: string, cfg: any) {
    const { company, login, password, departmentId } = cfg;
    if (!company || !login || !password) {
        console.log('  ⚠️  Incomplete config (missing password?), skipping');
        return;
    }

    // Sign in with default dept
    const defaultToken = await signIn(company, login, password, Number(departmentId) || 0);
    if (!defaultToken) { console.log('  ❌ Sign-in failed'); return; }

    // Get all departments
    const depts = await getDepartments(company, defaultToken);
    const storeDepts = depts.filter(d => d.type === 'STORE');
    console.log(`  Departments: ${storeDepts.map((d: any) => d.name).join(', ')}`);

    let totalUpdated = 0, totalSkipped = 0;

    for (const dept of storeDepts) {
        // Sign in to this specific department
        const token = await signIn(company, login, password, dept.id);
        if (!token) {
            console.log(`  ⚠️  No access to ${dept.name} (${dept.id}), skipping`);
            continue;
        }
        console.log(`  → ${dept.name}: fetching orders...`);

        // Fetch all pages
        let page = 0, hasMore = true;
        while (hasMore) {
            const { content, total } = await getDeptOrders(company, token, page, 30);
            if (content.length === 0) break;

            for (const order of content) {
                // Check if this order exists in our DB
                const dbOrder = await prisma.order.findFirst({
                    where: { organizationId: orgId, externalId: `itigris:${order.id}` },
                    select: { id: true },
                });
                if (!dbOrder) { totalSkipped++; continue; }

                // Get full details
                const full = await getOrderFull(company, token, order.id);
                if (!full) { totalSkipped++; continue; }

                const lensConfig = buildLensConfig(full);
                await prisma.order.update({
                    where: { id: dbOrder.id },
                    data: { lensConfig, totalPrice: Math.round(full.sum || 0) },
                });
                totalUpdated++;
            }

            page++;
            hasMore = (page * 30) < total;
            // Small pause to avoid rate limiting
            await new Promise(r => setTimeout(r, 200));
        }
        console.log(`    Done: ${dept.name}`);
    }

    console.log(`  ✅ Updated: ${totalUpdated}, Skipped: ${totalSkipped}`);
}

async function main() {
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true, metadata: true } });
    for (const org of orgs) {
        const meta = (org.metadata as any) || {};
        if (!meta?.itigris?.company) continue;
        console.log(`\n=== ${org.name} (${org.id}) ===`);
        await processOrg(org.id, meta.itigris);
    }
    console.log('\nDone!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
