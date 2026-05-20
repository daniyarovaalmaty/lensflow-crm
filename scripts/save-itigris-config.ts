// Save ITIGRIS demo config to New Eye org
import prisma from '../src/lib/db/prisma';

async function main() {
    const orgId = 'org-demo-neweye';

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, metadata: true },
    });

    if (!org) {
        console.log('org-demo-neweye not found!');
        return;
    }

    console.log(`Org: ${org.name} (${org.id})`);

    const existingMeta = (org as any).metadata || {};
    await prisma.organization.update({
        where: { id: orgId },
        data: {
            metadata: {
                ...existingMeta,
                itigris: {
                    company: 'optima_demo',
                    login: 'optima_demo',
                    password: 'optima_demo',
                    departmentId: 1000000007,
                    connectedAt: new Date().toISOString(),
                },
            },
        } as any,
    });

    console.log('✅ ITIGRIS demo подключена к New Eye!');

    // Also clear MedInvision
    const medOrg = await prisma.organization.findUnique({
        where: { id: 'org-lab-medinvision' },
        select: { metadata: true },
    });
    if (medOrg) {
        const meta = (medOrg as any).metadata || {};
        delete meta.itigris;
        await prisma.organization.update({
            where: { id: 'org-lab-medinvision' },
            data: { metadata: Object.keys(meta).length ? meta : null } as any,
        });
        console.log('Cleared ITIGRIS from MedInvision');
    }

    // Count patients
    const patientCount = await (prisma as any).patient.count({
        where: { organizationId: orgId },
    });
    console.log(`Current patients in New Eye: ${patientCount}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
