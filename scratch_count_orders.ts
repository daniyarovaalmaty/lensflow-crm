import { PrismaClient } from '@prisma/client';
import { createItigrisClient } from './src/lib/itigris/client';
import dotenv from 'dotenv';
dotenv.config();

process.env.DATABASE_URL = process.env.DIRECT_URL;
const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organization.findMany();
    let config = null;
    let orgId = null;
    for (const org of orgs) {
        const meta = (org as any).metadata?.itigris;
        if (meta?.company && meta?.login && meta?.password) {
            config = meta;
            orgId = org.id;
            break;
        }
    }
    if (!config) {
        console.log("No Itigris config found");
        return;
    }

    const client = createItigrisClient({
        company: config.company,
        login: config.login,
        password: config.password,
        departmentId: config.departmentId,
        organizationId: orgId
    });

    const departments = await client.getDepartments();
    const storeDepts = departments.filter(d => d.type === 'STORE' || d.type === 'OFFICE');
    console.log(`Найдено ${storeDepts.length} филиалов:`);

    let total = 0;
    for (const dept of storeDepts) {
        const ok = await client.signInToDepartment(dept.id);
        if (!ok) {
            console.log(`- ${dept.name}: нет доступа`);
            continue;
        }
        try {
            const { totalElements } = await client.getDepartmentOrders(0, 1);
            console.log(`- ${dept.name}: ${totalElements} заказов`);
            total += totalElements;
        } catch (e) {
            console.log(`- ${dept.name}: ошибка при получении заказов`);
        }
    }
    console.log(`Итого заказов по всем доступным филиалам: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
