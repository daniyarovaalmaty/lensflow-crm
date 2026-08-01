// @ts-nocheck
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const sale = await prisma.sale.findFirst({
    where: { customerName: 'Ухмет Сабина' },
    include: { items: { include: { product: true } } }
  });
  console.log('Sale:', sale.customerName);
  sale.items.forEach(item => {
    const name = typeof item.name === 'string' ? item.name.toLowerCase() : '';
    console.log('Item Name:', name);
    const cat = item.category || item.product?.category || '';
    const isService = item.product?.type === 'service' || cat.includes('service') || name.includes('консультация') || name.includes('подбор') || name.includes('диагностика');
    console.log('isService:', isService);
    let itemCost = 0;
    if (name.includes('ночн') || name.includes('ок-линз') || name.includes('ok-линз') || name.includes('ортокератолог')) {
        console.log('MATCHED NIGHT LENS LOGIC!');
        let isToric = name.includes('торич') || name.includes('торик') || name.includes('toric') || name.includes('tor');
        let isHalf = name.includes('1 глаз') || name.includes('один глаз') || name.includes('одна линза') || name.includes('1 линза') || name.includes('поломан');
        let baseCost = isToric ? 60000 : 50000;
        if (isHalf) baseCost /= 2;
        itemCost = baseCost * (item.quantity || 1);
        console.log('itemCost from Night Lenses:', itemCost);
    } else if (!isService && item.product?.purchasePrice) {
        itemCost = item.product.purchasePrice * (item.quantity || 1);
        console.log('itemCost from Product purchasePrice:', itemCost);
    }
    console.log('Final Item Cost:', itemCost);
  });
}
run();
