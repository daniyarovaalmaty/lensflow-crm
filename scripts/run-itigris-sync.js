// Ultra-light ITIGRIS sync — using correct table names
const axios = require('axios');
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    console.log('🔑 Signing in to ITIGRIS...');
    const signIn = await axios.post(
        'https://optima.itigris.ru/optima_demo/api/v2/sign/in',
        { company: 'optima_demo', login: 'optima_demo', password: 'optima_demo', departmentId: 1000000007 }
    );
    const token = signIn.data.accessToken;
    console.log('✅ Connected!');

    const headers = { Authorization: `Bearer ${token}` };
    const orgId = 'org-demo-neweye';
    let totalCreated = 0, totalUpdated = 0;
    const seen = new Set();
    let page = 0;

    while (true) {
        const resp = await axios.get(
            `https://optima.itigris.ru/optima_demo/api/v2/clients?clientSearchType=FULL_NAME&searchQuery=&deleted=false&page=${page}&size=10`,
            { headers }
        );
        const clients = resp.data.content || [];
        const total = resp.data.totalElements || 0;
        if (clients.length === 0) break;

        console.log(`\nPage ${page} (${clients.length} / ${total}):`);

        for (const c of clients) {
            if (seen.has(c.id)) continue;
            seen.add(c.id);

            let full;
            try {
                const r = await axios.get(
                    `https://optima.itigris.ru/optima_demo/api/v2/clients/${c.id}`,
                    { headers }
                );
                full = r.data;
            } catch { continue; }

            if (full.deleted) continue;

            const name = [full.familyName, full.firstName, full.patronymicName].filter(Boolean).join(' ').trim();
            if (!name) continue;

            let phone = full.tel1 || '';
            const digits = phone.replace(/\D/g, '');
            if (digits.length === 11 && digits[0] === '8') phone = '+7' + digits.slice(1);
            else if (digits.length === 11 && digits[0] === '7') phone = '+' + digits;
            else if (digits.length === 10) phone = '+7' + digits;

            let birthDate = null;
            if (full.birthdayYear && full.birthdayMonth && full.birthdayDay) {
                birthDate = new Date(full.birthdayYear, full.birthdayMonth - 1, full.birthdayDay);
            }

            const extId = `itigris:${full.id}`;
            const gender = full.gender === true ? 'male' : full.gender === false ? 'female' : null;

            // Check if exists (use lowercase table name 'patients')
            const existing = await pool.query(
                `SELECT id FROM patients WHERE "organizationId" = $1 AND ("externalId" = $2 ${phone ? 'OR phone = $3' : ''})`,
                phone ? [orgId, extId, phone] : [orgId, extId]
            );

            if (existing.rows.length > 0) {
                await pool.query(
                    `UPDATE patients SET name = $1, phone = $2, email = $3, "birthDate" = $4, gender = $5, "externalId" = $6, "externalSource" = 'itigris', "updatedAt" = NOW() WHERE id = $7`,
                    [name, phone, full.email || null, birthDate, gender, extId, existing.rows[0].id]
                );
                totalUpdated++;
                console.log(`  ↻ ${name} | ${phone}`);
            } else {
                const id = randomUUID();
                await pool.query(
                    `INSERT INTO patients (id, name, phone, email, "birthDate", gender, "externalId", "externalSource", "organizationId", "createdAt", "updatedAt")
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'itigris', $8, NOW(), NOW())`,
                    [id, name, phone, full.email || null, birthDate, gender, extId, orgId]
                );
                totalCreated++;
                console.log(`  + ${name} | ${phone}`);
            }

            await new Promise(r => setTimeout(r, 100));
        }

        page++;
        if (page >= 10) break;
    }

    console.log(`\n📊 +${totalCreated} создано, ↻ ${totalUpdated} обновлено`);

    const countResult = await pool.query(
        `SELECT COUNT(*) FROM patients WHERE "organizationId" = $1`, [orgId]
    );
    console.log(`Всего пациентов в New Eye: ${countResult.rows[0].count}`);

    await pool.end();
}

main().catch(console.error);
