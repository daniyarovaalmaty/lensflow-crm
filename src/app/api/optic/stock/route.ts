import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { getAvailableStock, getAvailableStockBatch } from '@/lib/stock/getAvailableStock';

export const dynamic = 'force-dynamic';

// ==================== GET ====================
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view');

  if (view === 'items') {
    const where: any = { organizationId: user.organizationId };
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');
    if (productId) where.productId = productId;
    if (status) where.status = status;
    const items = await prisma.stockItem.findMany({
      where,
      include: { product: { select: { name: true, category: true, sku: true } } },
      orderBy: { receivedAt: 'desc' },
      take: 500,
    });
    return NextResponse.json(items);
  }

  if (view === 'movements') {
    const movements = await prisma.stockMovement.findMany({
      where: { organizationId: user.organizationId },
      include: { product: { select: { name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(movements);
  }

  if (view === 'documents') {
    const docs = await prisma.stockDocument.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        supplier: { select: { id: true, name: true, inn: true } },
        lines: {
          include: { product: { select: { id: true, name: true, sku: true, category: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return NextResponse.json(docs);
  }

  // Default: product summary — реальный остаток из StockItem
  const products = await prisma.opticProduct.findMany({
    where: { organizationId: user.organizationId, isActive: true, type: 'product' },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  const stockMap = await getAvailableStockBatch(products.map(p => p.id), user.organizationId);

  return NextResponse.json(products.map(p => ({
    ...p,
    availableStock: stockMap[p.id] ?? 0,
    currentStock:   stockMap[p.id] ?? 0, // обратная совместимость
  })));
}

// ==================== POST ====================
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const body = await req.json();
  if (body.action === 'receive')         return handleReceive(body, user);
  if (body.action === 'write_off')       return handleWriteOff(body, user);
  if (body.action === 'recalculate')     return handleRecalculate(user);
  if (body.action === 'delete_document') return handleDeleteDocument(body, user);
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// ==================== RECEIVE ====================
async function handleReceive(body: any, user: any) {
  const { items, supplier, supplierId, documentNumber, notes } = body;
  if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 });

  const orgId = user.organizationId;

  // Валидация количеств ДО транзакции
  for (const item of items) {
    if ((Number(item.quantity) || 1) <= 0)
      return NextResponse.json({ error: 'Количество должно быть больше нуля' }, { status: 400 });
  }

  // Resolve supplier name for backward compat counterpartyName
  // Always validate supplierId belongs to this org to prevent data leakage
  let resolvedSupplierName = supplier || null;
  let validatedSupplierId: string | null = null;
  if (supplierId) {
    const sup = await prisma.supplier.findFirst({
      where: { id: supplierId, organizationId: orgId, isActive: true },
      select: { name: true },
    });
    if (!sup) {
      return NextResponse.json({ error: 'Поставщик не найден' }, { status: 400 });
    }
    validatedSupplierId = supplierId;
    resolvedSupplierName = sup.name; // always use DB name, not client-supplied string
  }

  const docCount = await prisma.stockDocument.count({ where: { organizationId: orgId, type: 'receipt' } });
  const docNum = documentNumber || `ПН-${String(docCount + 1).padStart(4, '0')}`;

  const lastItem = await prisma.stockItem.findFirst({
    where: { organizationId: orgId, serialNumber: { not: null } },
    orderBy: { receivedAt: 'desc' },
  });
  let serialCounter = 1;
  if (lastItem?.serialNumber) {
    const m = lastItem.serialNumber.match(/(\d+)$/);
    if (m) serialCounter = parseInt(m[1]) + 1;
  }

  // Все продукты одним запросом (не N+1)
  const productIds = items.map((i: any) => i.productId);
  const products = await prisma.opticProduct.findMany({ where: { id: { in: productIds }, organizationId: orgId } });
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  // Вся операция в одной транзакции — либо всё, либо ничего
  const result = await prisma.$transaction(async (tx) => {
    const allSerials: string[] = [];
    const docItems: any[] = [];
    const docLines: any[] = [];

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) continue;
      const qty = Number(item.quantity) || 1;
      const unitPrice = item.purchasePrice ? Number(item.purchasePrice) : product.purchasePrice;
      const createdSerials: string[] = [];

      if (product.trackSerials) {
        for (let i = 0; i < qty; i++) {
          const sn = item.serialNumbers?.[i] ||
            `${product.category.substring(0, 2).toUpperCase()}-${String(serialCounter++).padStart(5, '0')}`;
          await tx.stockItem.create({
            data: {
              productId: product.id, organizationId: orgId,
              serialNumber: sn, status: 'in_stock', quantity: 1,
              purchasePrice: unitPrice,
              color: item.color || null, size: item.size || null,
              batchNumber: item.batchNumber || null,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              receiptDocId: docNum,
            },
          });
          createdSerials.push(sn);
        }
      } else {
        // quantity в отдельном поле — не в notes
        await tx.stockItem.create({
          data: {
            productId: product.id, organizationId: orgId,
            status: 'in_stock', quantity: qty,
            purchasePrice: unitPrice,
            batchNumber: item.batchNumber || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            receiptDocId: docNum,
          },
        });
      }

      await tx.opticProduct.update({ where: { id: product.id }, data: { currentStock: { increment: qty } } });
      await tx.stockMovement.create({
        data: {
          organizationId: orgId, productId: product.id, type: 'receipt', quantity: qty,
          serialNumbers: createdSerials.length ? createdSerials : undefined,
          documentNumber: docNum, supplier: resolvedSupplierName,
          performedById: user.id, performedByName: user.fullName || user.email,
        },
      });

      allSerials.push(...createdSerials);
      docItems.push({ productId: product.id, name: product.name, qty, price: unitPrice, serialNumbers: createdSerials });
      docLines.push({
        productId: product.id,
        quantity: qty,
        unitPrice,
        totalPrice: unitPrice * qty,
        serialNumbers: createdSerials.length ? createdSerials : null,
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      });
    }

    const doc = await tx.stockDocument.create({
      data: {
        documentNumber: docNum, organizationId: orgId, type: 'receipt', status: 'confirmed',
        counterpartyName: resolvedSupplierName,
        supplierId: validatedSupplierId,
        totalAmount: docItems.reduce((s: number, i: any) => s + i.price * i.qty, 0),
        items: docItems, notes: notes || null,
        performedById: user.id, performedByName: user.fullName || user.email,
        confirmedAt: new Date(),
        lines: {
          create: docLines,
        },
      },
    });
    return { doc, allSerials };
  });

  return NextResponse.json({ ok: true, document: result.doc, serialNumbers: result.allSerials }, { status: 201 });
}

// ==================== WRITE OFF ====================
async function handleWriteOff(body: any, user: any) {
  const { items, reason, notes } = body;
  if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 });

  const orgId = user.organizationId;

  // Guard: проверяем остаток ДО транзакции
  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const available = await getAvailableStock(item.productId, orgId);
    if (available < qty) {
      const product = await prisma.opticProduct.findFirst({ where: { id: item.productId }, select: { name: true } });
      return NextResponse.json({
        error: `Недостаточно товара: "${product?.name}". Доступно: ${available}, запрошено: ${qty}.`,
      }, { status: 400 });
    }
  }

  const docCount = await prisma.stockDocument.count({ where: { organizationId: orgId, type: 'write_off' } });
  const docNum = `АС-${String(docCount + 1).padStart(4, '0')}`;

  const productIds = items.map((i: any) => i.productId);
  const products = await prisma.opticProduct.findMany({ where: { id: { in: productIds }, organizationId: orgId } });
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  const doc = await prisma.$transaction(async (tx) => {
    const docItems: any[] = [];
    const docLines: any[] = [];

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) continue;
      const qty = Number(item.quantity) || 1;

      if (product.trackSerials && item.serialNumbers?.length) {
        for (const sn of item.serialNumbers) {
          await tx.stockItem.updateMany({
            where: { organizationId: orgId, serialNumber: sn, status: 'in_stock' },
            data: { status: 'written_off' },
          });
        }
      } else {
        // FIFO списание по quantity
        const stockItems = await tx.stockItem.findMany({
          where: { organizationId: orgId, productId: item.productId, status: 'in_stock' },
          orderBy: { receivedAt: 'asc' },
        });
        let remaining = qty;
        for (const si of stockItems) {
          if (remaining <= 0) break;
          if (si.quantity <= remaining) {
            await tx.stockItem.update({ where: { id: si.id }, data: { status: 'written_off' } });
            remaining -= si.quantity;
          } else {
            await tx.stockItem.update({ where: { id: si.id }, data: { quantity: si.quantity - remaining } });
            remaining = 0;
          }
        }
      }

      await tx.opticProduct.update({ where: { id: product.id }, data: { currentStock: { decrement: qty } } });
      await tx.stockMovement.create({
        data: {
          organizationId: orgId, productId: product.id, type: 'write_off', quantity: -qty,
          serialNumbers: item.serialNumbers || undefined,
          documentNumber: docNum, reason: reason || null,
          performedById: user.id, performedByName: user.fullName || user.email,
        },
      });
      docItems.push({ productId: product.id, name: product.name, qty, serialNumbers: item.serialNumbers || [] });
      docLines.push({
        productId: product.id,
        quantity: qty,
        unitPrice: 0,
        totalPrice: 0,
        serialNumbers: item.serialNumbers?.length ? item.serialNumbers : null,
      });
    }

    return tx.stockDocument.create({
      data: {
        documentNumber: docNum, organizationId: orgId, type: 'write_off', status: 'confirmed',
        totalAmount: 0, items: docItems, notes: reason || notes || null,
        performedById: user.id, performedByName: user.fullName || user.email,
        confirmedAt: new Date(),
        lines: {
          create: docLines,
        },
      },
    });
  });

  return NextResponse.json({ ok: true, document: doc }, { status: 201 });
}

// ==================== DELETE DOCUMENT ====================
async function handleDeleteDocument(body: any, user: any) {
  const { documentNumber } = body;
  if (!documentNumber) return NextResponse.json({ error: 'Missing documentNumber' }, { status: 400 });
  const orgId = user.organizationId;

  const doc = await prisma.stockDocument.findFirst({ where: { organizationId: orgId, documentNumber } });
  if (!doc) return NextResponse.json({ error: `Document ${documentNumber} not found` }, { status: 404 });

  const docItems = doc.items as any[];

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.deleteMany({ where: { organizationId: orgId, documentNumber } });
    await tx.stockItem.deleteMany({ where: { organizationId: orgId, receiptDocId: documentNumber } });
    await tx.stockDocument.delete({ where: { id: doc.id } });

    const affectedIds = [...new Set(docItems.map((i: any) => i.productId).filter(Boolean))] as string[];
    for (const prodId of affectedIds) {
      const p = await tx.opticProduct.findFirst({ where: { id: prodId }, select: { trackSerials: true } });
      let stock = 0;
      if (p?.trackSerials) {
        stock = await tx.stockItem.count({ where: { productId: prodId, organizationId: orgId, status: 'in_stock' } });
      } else {
        const agg = await tx.stockItem.aggregate({ where: { productId: prodId, organizationId: orgId, status: 'in_stock' }, _sum: { quantity: true } });
        stock = agg._sum.quantity ?? 0;
      }
      await tx.opticProduct.update({ where: { id: prodId }, data: { currentStock: Math.max(0, stock) } });
    }
  });

  return NextResponse.json({ ok: true, message: `Документ ${documentNumber} удалён` });
}

// ==================== RECALCULATE ====================
async function handleRecalculate(user: any) {
  const orgId = user.organizationId;
  const products = await prisma.opticProduct.findMany({
    where: { organizationId: orgId, type: 'product' },
    select: { id: true, name: true, currentStock: true },
  });

  const stockMap = await getAvailableStockBatch(products.map(p => p.id), orgId);
  const toUpdate = products.filter(p => (stockMap[p.id] ?? 0) !== p.currentStock);

  if (toUpdate.length) {
    await prisma.$transaction(
      toUpdate.map(p => prisma.opticProduct.update({ where: { id: p.id }, data: { currentStock: stockMap[p.id] ?? 0 } }))
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Пересчитано ${toUpdate.length} товаров`,
    corrections: toUpdate.map(p => ({ name: p.name, было: p.currentStock, стало: stockMap[p.id] ?? 0 })),
  });
}

// ==================== PUT (редактирование документа) ====================
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  const body = await req.json();
  const { id, documentNumber, counterpartyName, notes, items } = body;
  if (!id) return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });

  const doc = await prisma.stockDocument.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

  const orgId = user.organizationId;
  const oldItems = doc.items as any[];
  const oldDocNum = doc.documentNumber;

  await prisma.$transaction(async (tx) => {
    const totalAmount = items.reduce((s: number, i: any) => s + Number(i.price) * (Number(i.qty) || 1), 0);
    await tx.stockDocument.update({ where: { id }, data: { documentNumber: documentNumber || oldDocNum, counterpartyName: counterpartyName || null, notes: notes || null, totalAmount, items } });

    const activeDocNum = documentNumber || oldDocNum;
    if (documentNumber && documentNumber !== oldDocNum) {
      await tx.stockItem.updateMany({ where: { organizationId: orgId, receiptDocId: oldDocNum }, data: { receiptDocId: documentNumber } });
      await tx.stockMovement.updateMany({ where: { organizationId: orgId, documentNumber: oldDocNum }, data: { documentNumber } });
    }

    const allProductIds = [...new Set([...oldItems.map(i => i.productId), ...items.map((i: any) => i.productId)])];

    for (const prodId of allProductIds) {
      const oldItem = oldItems.find(i => i.productId === prodId);
      const newItem = items.find((i: any) => i.productId === prodId);
      const diff = (newItem ? Number(newItem.qty) : 0) - (oldItem ? Number(oldItem.qty) : 0);
      const product = await tx.opticProduct.findFirst({ where: { id: prodId, organizationId: orgId } });
      if (!product) continue;

      if (diff > 0) {
        await tx.stockItem.create({ data: { productId: prodId, organizationId: orgId, status: 'in_stock', quantity: diff, purchasePrice: newItem ? Number(newItem.price) : product.purchasePrice, receiptDocId: activeDocNum } });
      } else if (diff < 0) {
        const toDelete = await tx.stockItem.findMany({ where: { organizationId: orgId, productId: prodId, receiptDocId: activeDocNum, status: 'in_stock' }, take: Math.abs(diff) });
        for (const si of toDelete) await tx.stockItem.delete({ where: { id: si.id } });
      }

      // Пересчёт из реальных StockItem
      let correctStock = 0;
      if (product.trackSerials) {
        correctStock = await tx.stockItem.count({ where: { productId: prodId, organizationId: orgId, status: 'in_stock' } });
      } else {
        const agg = await tx.stockItem.aggregate({ where: { productId: prodId, organizationId: orgId, status: 'in_stock' }, _sum: { quantity: true } });
        correctStock = agg._sum.quantity ?? 0;
      }
      await tx.opticProduct.update({ where: { id: prodId }, data: { currentStock: Math.max(0, correctStock) } });
    }
  });

  return NextResponse.json({ ok: true });
}
