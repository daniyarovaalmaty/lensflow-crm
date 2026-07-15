import { prisma } from './src/lib/db/prisma';

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      name: {
        contains: 'medinnovation',
        mode: 'insensitive',
      }
    }
  });
  console.log('Orgs matching Medinnovation:', orgs.map(o => ({ id: o.id, name: o.name })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
