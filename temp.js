const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.organization.findFirst({}).then(org => console.log(JSON.stringify(org.metadata, null, 2))).catch(console.error).finally(() => prisma.$disconnect());
