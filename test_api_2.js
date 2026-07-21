const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function run() {
    const org = await prisma.organization.findFirst({ where: { name: { contains: "Народная" } } });
    if (!org) return console.log("Org not found");
    const meta = org.metadata || {};
    const r = meta.itigrisRemote;
    if (!r) return console.log("No remote config");
    
    console.log("Client:", r.client, "Key length:", r.key?.length);
    
    try {
        const res = await axios.get(`https://${r.client}.itigris.ru/api/remoteRemains/list`, {
            params: { key: r.key, product: 'glasses' }
        });
        console.log("Status:", res.status, "Rows:", res.data?.length || res.data?.content?.length);
    } catch(e) {
        console.error("Error Status:", e.response?.status);
        console.error("Error Data:", e.response?.data);
    } finally {
        prisma.$disconnect();
    }
}
run();
