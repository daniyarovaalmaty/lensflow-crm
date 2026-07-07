import prisma from './src/lib/db/prisma';

async function run() {
  const medInnovation = await prisma.user.findUnique({
      where: { email: 'medinnovation.kaz2021@gmail.com' }
  });
  const orgId = medInnovation?.organizationId;
  if (!orgId) return;
  const prods = await prisma.opticProduct.findMany({ where: { organizationId: orgId } });
  
  const search = ['VS 302', 'VS', '14', '16', '19', '21', '22', '23'];
  for (let p of prods) {
    let name = p.name.toUpperCase();
    for(let s of search) {
        if(name.includes(s.toUpperCase())) console.log(s, ':', p.name);
    }
  }
}
run();
