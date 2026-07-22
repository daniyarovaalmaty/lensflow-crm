import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { ItigrisSyncService } from './src/lib/itigris/sync';
import { ItigrisApiClient } from './src/lib/itigris/client';
import { prisma } from './src/lib/db/prisma';

async function main() {
    console.log('Loading org configs from DB...');
    const organizations = await prisma.organization.findMany();
    const org = organizations.find(o => {
        if (!o.metadata) return false;
        const meta = typeof o.metadata === 'string' ? JSON.parse(o.metadata) : o.metadata;
        return !!meta?.itigris?.company;
    });

    if (!org) throw new Error('No Itigris configs found in DB');

    const meta = typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata;
    const config = meta.itigris;
    
    const api = new ItigrisApiClient({
        company: config.company,
        login: config.login,
        password: config.password,
        departmentId: config.departmentId,
        organizationId: org.id
    });

    const service = new ItigrisSyncService(api, prisma as any, org.id);
    
    console.log(`Fetching order 1000502164 for org ${org.name}...`);
    const result = await service.api.getOrder(1000502164);
    
    if (result) {
        console.log('Order found! Patient ID in Itigris:', result.client?.id);
        
        const patient = await prisma.patient.findFirst({
            where: { externalId: `itigris:${result.client?.id}` }
        });

        if (patient) {
            console.log('Found LensFlow patient:', patient.name, patient.id);
            await (service as any).upsertPrescriptionFromOrder(patient.id, result, result);
            console.log('Prescription upserted!');
            
            const px = await prisma.prescription.findFirst({ where: { patientId: patient.id }});
            console.log('Saved prescription:', px);
        } else {
            console.log('Patient not found in LensFlow DB');
        }
    } else {
        console.log('Order not found!');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
