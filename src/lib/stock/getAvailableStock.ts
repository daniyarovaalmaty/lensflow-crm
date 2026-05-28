import prisma from '@/lib/db/prisma';

/**
 * Единый источник правды для остатков.
 * Серийные (trackSerials=true) → count записей со статусом in_stock
 * Не-серийные (trackSerials=false) → sum(quantity) записей со статусом in_stock
 */
export async function getAvailableStock(productId: string, orgId: string): Promise<number> {
  const product = await prisma.opticProduct.findFirst({
    where: { id: productId, organizationId: orgId },
    select: { trackSerials: true },
  });
  if (!product) return 0;

  if (product.trackSerials) {
    return prisma.stockItem.count({
      where: { productId, organizationId: orgId, status: 'in_stock' },
    });
  }
  const agg = await prisma.stockItem.aggregate({
    where: { productId, organizationId: orgId, status: 'in_stock' },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

/**
 * Batch-версия — один запрос для N продуктов вместо N запросов
 */
export async function getAvailableStockBatch(
  productIds: string[],
  orgId: string
): Promise<Record<string, number>> {
  if (!productIds.length) return {};

  const products = await prisma.opticProduct.findMany({
    where: { id: { in: productIds }, organizationId: orgId },
    select: { id: true, trackSerials: true },
  });

  const serialIds = products.filter(p => p.trackSerials).map(p => p.id);
  const bulkIds   = products.filter(p => !p.trackSerials).map(p => p.id);
  const result: Record<string, number> = {};
  productIds.forEach(id => (result[id] = 0));

  if (serialIds.length) {
    const counts = await prisma.stockItem.groupBy({
      by: ['productId'],
      where: { organizationId: orgId, productId: { in: serialIds }, status: 'in_stock' },
      _count: { id: true },
    });
    counts.forEach(r => (result[r.productId] = r._count.id));
  }

  if (bulkIds.length) {
    const sums = await prisma.stockItem.groupBy({
      by: ['productId'],
      where: { organizationId: orgId, productId: { in: bulkIds }, status: 'in_stock' },
      _sum: { quantity: true },
    });
    sums.forEach(r => (result[r.productId] = r._sum.quantity ?? 0));
  }

  return result;
}
