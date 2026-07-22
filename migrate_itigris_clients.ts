import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const ALPHABET = [
    'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К',
    'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф',
    'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Э', 'Ю', 'Я'
];

function normalizePhone(raw: any) {
    if (!raw) return '';
    let p = raw.replace(/\D/g, '');
    if (p.startsWith('8')) p = '7' + p.slice(1);
    return p;
}

async function migrate() {
    console.log('Starting Itigris fast migration script...');
    
    // 1. Get organizations with Itigris configured
    const orgs = await prisma.organization.findMany({
        where: { status: 'active' }
    });

    const configured = orgs.filter(o => {
        const i: any = typeof o.metadata === 'string' ? JSON.parse(o.metadata)?.itigris : (o.metadata as any)?.itigris;
        return i?.company && i?.login && i?.password;
    });

    if (configured.length === 0) {
        console.log('No organizations with Itigris config found.');
        process.exit(0);
    }

    for (const org of configured) {
        console.log(`\n--- Syncing org: ${org.name} ---`);
        const cfg = typeof org.metadata === 'string' ? JSON.parse(org.metadata).itigris : org.metadata.itigris;
        
        // Auth
        const authRes = await fetch(`https://optima.itigris.ru/${cfg.company}/api/v2/sign/in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company: cfg.company, login: cfg.login, password: cfg.password, departmentId: cfg.departmentId })
        });
        
        if (!authRes.ok) {
            console.log('Auth failed:', await authRes.text());
            continue;
        }
        
        const auth = await authRes.json();
        let token = auth.accessToken;
        console.log(`Auth successful. Fetching clients across alphabet...`);

        let totalUpserted = 0;
        
        // We will keep track of seen IDs to avoid duplicates since some searches might overlap
        const seenIds = new Set();

        for (const letter of ALPHABET) {
            console.log(`Searching letter: ${letter}...`);
            let page = 0;
            let hasMore = true;

            while (hasMore) {
                let res;
                let retries = 3;
                const url = `https://optima.itigris.ru/${cfg.company}/api/v2/clients?clientSearchType=FULL_NAME&searchQuery=${encodeURIComponent(letter)}&deleted=false&page=${page}&size=500`;
                
                while (retries > 0) {
                    try {
                        res = await fetch(url, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    if (res.ok) break;
                    
                    if (res.status === 401) {
                        console.log('Token expired, re-authenticating...');
                        const authRes = await fetch(`https://optima.itigris.ru/${cfg.company}/api/v2/sign/in`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ company: cfg.company, login: cfg.login, password: cfg.password, departmentId: cfg.departmentId })
                        });
                        if (authRes.ok) {
                            const auth = await authRes.json();
                            token = auth.accessToken;
                            continue; // Retry the request with new token
                        }
                    }
                    } catch (e: any) {
                        if (e.code === 'ECONNRESET' || e.message?.includes('fetch failed')) {
                            retries--;
                            if (retries === 0) throw e;
                            console.log(`   -> Network error, retrying (${retries} retries left)...`);
                            await new Promise(r => setTimeout(r, 2000));
                            continue;
                        } else {
                            throw e;
                        }
                    }
                    retries--;
                }

                if (!res || !res.ok) {
                    console.error(`Failed to fetch letter ${letter} page ${page}:`, res.statusText);
                    break;
                }

                const data = await res.json();
                const clients = data.content || [];

                if (clients.length === 0) {
                    hasMore = false;
                    break;
                }

                const ops = [];
                for (const c of clients) {
                    if (seenIds.has(c.id)) continue;
                    seenIds.add(c.id);

                    const fullName = [c.familyName, c.firstName, c.patronymicName].filter(Boolean).join(' ').trim();
                    if (!fullName) continue;

                    let birthDate = null;
                    if (c.birthdayYear && c.birthdayMonth && c.birthdayDay) {
                        birthDate = new Date(c.birthdayYear, c.birthdayMonth - 1, c.birthdayDay);
                    }

                    const phone = normalizePhone(c.phoneNumber || c.tel1 || c.tel2 || (c.clientCard ? c.clientCard.phone : ''));

                    const patientData = {
                        name: fullName,
                        phone: phone,
                        email: c.email || null,
                        birthDate: birthDate,
                        gender: c.gender === true ? 'male' : c.gender === false ? 'female' : null,
                        externalId: `itigris:${c.id}`,
                        externalSource: 'itigris',
                        organizationId: org.id
                    };

                    ops.push((async () => {
                        const existing = await prisma.patient.findFirst({
                            where: { organizationId: org.id, externalId: `itigris:${c.id}` }
                        });
                        if (existing) {
                            return prisma.patient.update({ where: { id: existing.id }, data: patientData });
                        } else {
                            return prisma.patient.create({ data: patientData });
                        }
                    })());
                }

                // Wait for chunk to finish
                const results = await Promise.allSettled(ops);
                let errors = 0;
                for (const r of results) {
                    if (r.status === 'rejected') {
                        errors++;
                        if (errors === 1) console.error("Sample error:", r.reason);
                    }
                }
                totalUpserted += (ops.length - errors);
                
                console.log(` -> Processed ${ops.length} clients (${errors} errors). (Total so far: ${totalUpserted})`);
                
                page++;
                if (page >= data.totalPages) {
                    hasMore = false;
                }
            }
        }
        
        console.log(`\nFinished ${org.name}. Total unique clients upserted: ${totalUpserted}`);
    }

    console.log('\nMigration complete.');
    process.exit(0);
}

migrate().catch(e => {
    console.error(e);
    process.exit(1);
});
