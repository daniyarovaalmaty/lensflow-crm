import { ItigrisApiClient } from '../src/lib/itigris/client';
import { ItigrisSyncService } from '../src/lib/itigris/sync';

// Use project's prisma instance (reads from .env)
import prisma from '../src/lib/db/prisma';

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, metadata: true }
  });
  
  let found = 0;
  for (const org of orgs) {
    const meta = (org.metadata as any) || {};
    if (!meta?.itigris?.company) continue;
    found++;

    const cfg = meta.itigris;
    console.log(`\n=== Org: ${org.name} (${org.id}) ===`);
    console.log(`ITIGRIS: ${cfg.company} / dept=${cfg.departmentId}`);

    const count = await prisma.order.count({
      where: { organizationId: org.id, source: 'itigris' }
    });
    console.log(`Current ITIGRIS orders in DB: ${count}`);

    console.log('\nRunning order sync...');
    const client = new ItigrisApiClient({
      company: cfg.company,
      login: cfg.login,
      password: cfg.password,
      departmentId: Number(cfg.departmentId) || 0,
      organizationId: org.id,
    });
    const service = new ItigrisSyncService(client, prisma as any, org.id);
    const result = await service.syncOrders();
    console.log(`Result: created=${result.created}, updated=${result.updated}, errors=${result.errors}`);
    result.details.slice(0, 20).forEach(d => console.log(' ', d));
  }
  if (found === 0) console.log('No orgs with ITIGRIS config found');
}

main().catch(console.error).finally(() => prisma.$disconnect());
