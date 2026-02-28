import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    console.log('🌱 Seeding LensFlow CRM database...');

    // ==================== 1. Create Laboratory Organization ====================
    const lab = await prisma.organization.upsert({
        where: { id: 'org-lab-medinvision' },
        update: {},
        create: {
            id: 'org-lab-medinvision',
            name: 'MedInvision',
            status: 'active',
            phone: '+77001001000',
            email: 'info@medinvision.kz',
            city: 'Алматы',
        },
    });
    console.log('✅ Laboratory:', lab.name);

    // ==================== 2. Create Lab Users ====================
    const labUsers = [
        { email: 'engineer@medinvision.kz', subRole: 'lab_engineer' as const, fullName: 'Инженер' },
        { email: 'quality@medinvision.kz', subRole: 'lab_quality' as const, fullName: 'Контролёр' },
        { email: 'logistics@medinvision.kz', subRole: 'lab_logistics' as const, fullName: 'Логист' },
        { email: 'head@medinvision.kz', subRole: 'lab_head' as const, fullName: 'Руководитель' },
        { email: 'admin@medinvision.kz', subRole: 'lab_admin' as const, fullName: 'Администратор' },
        { email: 'accountant@medinvision.kz', subRole: 'lab_accountant' as const, fullName: 'Бухгалтер' },
    ];

    for (const u of labUsers) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                email: u.email,
                password: await bcrypt.hash('MedInvision2026!', 10),
                fullName: u.fullName,
                role: 'laboratory',
                subRole: u.subRole,
                status: 'active',
                organizationId: lab.id,
            },
        });
    }
    console.log('✅ Lab users created:', labUsers.length);

    // ==================== 3. Create Demo Clinic ====================
    const clinic = await prisma.organization.upsert({
        where: { id: 'org-demo-neweye' },
        update: {},
        create: {
            id: 'org-demo-neweye',
            name: 'New Eye',
            status: 'active',
            phone: '+77009876543',
            email: 'info@neweye.kz',
            city: 'Алматы',
        },
    });
    console.log('✅ Demo clinic:', clinic.name);

    const clinicUsers = [
        { email: 'manager@neweye.kz', subRole: 'optic_manager' as const, fullName: 'Руководитель New Eye' },
        { email: 'doctor@neweye.kz', subRole: 'optic_doctor' as const, fullName: 'Доктор New Eye' },
        { email: 'accountant@neweye.kz', subRole: 'optic_accountant' as const, fullName: 'Бухгалтер New Eye' },
    ];

    for (const u of clinicUsers) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                email: u.email,
                password: await bcrypt.hash('NewEye2026!', 10),
                fullName: u.fullName,
                role: 'optic',
                subRole: u.subRole,
                status: 'active',
                organizationId: clinic.id,
            },
        });
    }
    console.log('✅ Clinic users created:', clinicUsers.length);

    // ==================== 4. Create Demo Independent Doctor ====================
    await prisma.user.upsert({
        where: { email: 'Azamat.ivdh@gmail.com' },
        update: {},
        create: {
            email: 'Azamat.ivdh@gmail.com',
            password: await bcrypt.hash('CKK2026!', 10),
            fullName: 'Азамат (ЦКК)',
            role: 'doctor',
            subRole: 'doctor',
            status: 'active',
        },
    });
    console.log('✅ Independent doctor created');

    // ==================== 5. Demo Users (for /demo page) ====================
    const demoLab = await prisma.organization.upsert({
        where: { id: 'org-demo-lab' },
        update: {},
        create: {
            id: 'org-demo-lab',
            name: 'Демо Лаборатория',
            status: 'active',
        },
    });

    const demoClinic = await prisma.organization.upsert({
        where: { id: 'org-demo-clinic' },
        update: {},
        create: {
            id: 'org-demo-clinic',
            name: 'Демо Оптика',
            status: 'active',
        },
    });

    const demoUsers = [
        { email: 'engineer@lensflow.ru', subRole: 'lab_engineer' as const, fullName: 'Инженер Петров', role: 'laboratory' as const, orgId: demoLab.id },
        { email: 'quality@lensflow.ru', subRole: 'lab_quality' as const, fullName: 'Контролёр Сидорова', role: 'laboratory' as const, orgId: demoLab.id },
        { email: 'lab@lensflow.ru', subRole: 'lab_admin' as const, fullName: 'Админ Козлов', role: 'laboratory' as const, orgId: demoLab.id },
        { email: 'lab-buh@lensflow.ru', subRole: 'lab_accountant' as const, fullName: 'Бухгалтер Иванова', role: 'laboratory' as const, orgId: demoLab.id },
        { email: 'logistics@lensflow.ru', subRole: 'lab_logistics' as const, fullName: 'Логист Курьеров', role: 'laboratory' as const, orgId: demoLab.id },
        { email: 'head@lensflow.ru', subRole: 'lab_head' as const, fullName: 'Руководитель Нургазиев', role: 'laboratory' as const, orgId: demoLab.id },
        { email: 'optic@lensflow.ru', subRole: 'optic_manager' as const, fullName: 'Руководитель Оптика', role: 'optic' as const, orgId: demoClinic.id },
        { email: 'optic-doc@lensflow.ru', subRole: 'optic_doctor' as const, fullName: 'Доктор Иванов', role: 'optic' as const, orgId: demoClinic.id },
        { email: 'optic-buh@lensflow.ru', subRole: 'optic_accountant' as const, fullName: 'Бухгалтер Смирнова', role: 'optic' as const, orgId: demoClinic.id },
        { email: 'doctor@lensflow.ru', subRole: 'doctor' as const, fullName: 'Доктор Сидоров', role: 'doctor' as const, orgId: null },
    ];

    for (const u of demoUsers) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                email: u.email,
                password: await bcrypt.hash('password123', 10),
                fullName: u.fullName,
                role: u.role,
                subRole: u.subRole,
                status: 'active',
                organizationId: u.orgId,
            },
        });
    }
    console.log('✅ Demo users created:', demoUsers.length);

    console.log('\n🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
