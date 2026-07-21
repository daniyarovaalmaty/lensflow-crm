import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { prisma } from './src/lib/db/prisma';
import { createItigrisClient } from './src/lib/itigris/client';

async function main() {
    let org = await prisma.organization.findFirst({
        where: { name: { contains: "Народная", mode: "insensitive" } }
    });
    
    if (!org) {
        org = await prisma.organization.findFirst();
    }
    
    if (!org) {
        console.log("No organization found in DB.");
        return;
    }
    
    console.log("Using Organization:", org.name);
    
    const meta: any = org.metadata;
    if (!meta || !meta.itigris) {
        console.log("No itigris config found in organization metadata.");
        return;
    }
    
    const config = {
        company: meta.itigris.company,
        login: meta.itigris.login,
        password: meta.itigris.password,
        departmentId: meta.itigris.departmentId,
        organizationId: org.id
    };
    
    console.log("Itigris Config:", config.company, config.login);
    
    const client = createItigrisClient(config);
    
    try {
        const test = await client.testConnection();
        console.log("Connection Status:", test.message);
        
        if (test.ok) {
            const count = await client.countClients();
            console.log(`✅ Total patients found in Itigris: ${count}`);
            
            // Fetch a sample
            const sample = await client.searchClients("", "FULL_NAME", 0, 3);
            console.log("Sample patients:");
            sample.forEach((p, idx) => {
                console.log(`  ${idx + 1}. ${p.familyName} ${p.firstName} ${p.patronymicName || ''} (Phone: ${p.tel1 || p.tel2 || 'none'})`);
            });
        }
    } catch (e: any) {
        console.error("Error connecting to Itigris:", e.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
