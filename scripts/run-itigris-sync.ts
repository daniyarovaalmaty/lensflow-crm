// Run ITIGRIS sync — LIGHT version (page by page)
import prisma from '../src/lib/db/prisma';
import { ItigrisApiClient } from '../src/lib/itigris';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const orgId = 'org-demo-neweye';
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const meta = (org as any)?.metadata?.itigris;

    const api = new ItigrisApiClient({
        company: meta.company, login: meta.login,
        password: meta.password, departmentId: meta.departmentId,
        organizationId: orgId,
    });

    const test = await api.testConnection();
    console.log(`✅ ${test.message}`);
    if (!test.ok) return;

    // Get clients page by page (10 per page) using single search
    let created = 0, updated = 0;
    const seenIds = new Set<number>();

    // Do 5 pages of 10 = up to 50 clients
    for (let page = 0; page < 5; page++) {
        const clients = await api.searchClients('', 'FULL_NAME', page, 10);
        if (clients.length === 0) break;
        console.log(`\nPage ${page}: ${clients.length} clients`);

        for (const c of clients) {
            if (seenIds.has(c.id)) continue;
            seenIds.add(c.id);

            // Get full details (with phone)
            let full;
            try {
                full = await api.getClient(c.id);
                await sleep(150);
            } catch (err: any) {
                console.log(`  ✗ ${c.id}: ${err.message?.slice(0, 60)}`);
                continue;
            }

            if (full.deleted) continue;

            const fullName = [full.familyName, full.firstName, full.patronymicName]
                .filter(Boolean).join(' ').trim();
            if (!fullName) continue;

            let phone = full.tel1 || '';
            const digits = phone.replace(/\D/g, '');
            if (digits.length === 11 && digits.startsWith('8')) phone = '+7' + digits.slice(1);
            else if (digits.length === 11 && digits.startsWith('7')) phone = '+' + digits;
            else if (digits.length === 10) phone = '+7' + digits;

            let birthDate: Date | undefined;
            if (full.birthdayYear && full.birthdayMonth && full.birthdayDay) {
                birthDate = new Date(full.birthdayYear, full.birthdayMonth - 1, full.birthdayDay);
            }

            const existing = await (prisma as any).patient.findFirst({
                where: {
                    organizationId: orgId,
                    OR: [
                        { externalId: `itigris:${full.id}` },
                        ...(phone ? [{ phone }] : []),
                    ],
                },
            });

            const data: any = {
                name: fullName,
                phone: phone || full.tel1 || '',
                externalId: `itigris:${full.id}`,
                externalSource: 'itigris',
                organizationId: orgId,
            };
            if (full.email) data.email = full.email;
            if (birthDate) data.birthDate = birthDate;
            if (full.gender !== null && full.gender !== undefined) {
                data.gender = full.gender ? 'male' : 'female';
            }
            if (full.comment) data.notes = full.comment;

            if (existing) {
                await (prisma as any).patient.update({ where: { id: existing.id }, data });
                updated++;
                console.log(`  ↻ ${fullName} | ${phone}`);
            } else {
                await (prisma as any).patient.create({ data });
                created++;
                console.log(`  + ${fullName} | ${phone}`);
            }
        }

        await sleep(300);
    }

    console.log(`\n📊 +${created} создано, ↻ ${updated} обновлено`);
    const total = await (prisma as any).patient.count({ where: { organizationId: orgId } });
    console.log(`Всего пациентов: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
