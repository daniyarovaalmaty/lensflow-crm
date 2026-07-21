import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { prisma } from './src/lib/db/prisma';

async function run() {
    const org = await prisma.organization.findFirst({ where: { name: 'Оптика Народная' }});
    const cfg = typeof org.metadata === 'string' ? JSON.parse(org.metadata).itigris : org.metadata.itigris;
    const authRes = await fetch('https://optima.itigris.ru/' + cfg.company + '/api/v2/sign/in', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
    const auth = await authRes.json();
    const res = await fetch('https://optima.itigris.ru/' + cfg.company + '/api/v2/clients?clientSearchType=FULL_NAME&searchQuery=%D0%90&size=1', { headers: { 'Authorization': 'Bearer ' + auth.accessToken }});
    const data = await res.json();
    console.log(JSON.stringify(data.content[0], null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
