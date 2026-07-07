import prisma from './src/lib/db/prisma';

async function run() {
  const prods = await prisma.opticProduct.findMany({ 
    where: { 
      OR: [
        { name: { contains: 'Ribofast' } },
        { name: { contains: 'OCULFIT' } },
        { name: { contains: 'LLASHP' } },
        { name: { contains: 'Ring' } },
        { name: { contains: 'VIVOSTAT' } },
        { name: { contains: 'Gemetrix' } },
        { name: { contains: 'CW' } },
        { name: { contains: 'AFR' } }
      ]
    } 
  });
  console.log('Specific products found in DB:');
  for (let p of prods) {
    console.log(`${p.currentStock.toString().padStart(4, ' ')} | ${p.name}`);
  }
}
run();
