import { NextResponse } from 'next/server';
import { oneCClient } from '@/lib/onec/client';
import prisma from '@/lib/db/prisma';

export async function POST() {
  try {
    // Получаем 1000 товаров из 1С (в реальном приложении нужна пагинация через skip/top)
    const productsFrom1C = await oneCClient.getProducts(1000, 0);

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of productsFrom1C) {
      // Игнорируем папки (группы номенклатуры)
      if (item.IsFolder) continue;

      const onecId = item.Ref_Key;
      const name = item.Description;
      const code = item.Code;
      // В 1С артикул может называться "Артикул"
      const sku = item.Артикул || null;

      // Ищем товар по onecId или по точному совпадению name1c
      const existingProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { onecId },
            { name1c: name }
          ]
        }
      });

      if (existingProduct) {
        // Обновляем
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            onecId,
            name1c: name,
            code: code || existingProduct.code,
            sku: sku || existingProduct.sku
          }
        });
        updatedCount++;
      } else {
        // Создаем новый товар (как сырье/материал для лаборатории)
        await prisma.product.create({
          data: {
            onecId,
            name,
            name1c: name,
            code,
            sku,
            category: 'lens', // Дефолтная категория, потом можно мапить из ВидНоменклатуры
            price: 0,
            unit: 'шт',
            isActive: true
          }
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Синхронизация завершена',
      stats: {
        totalFetched: productsFrom1C.length,
        created: createdCount,
        updated: updatedCount
      }
    });
  } catch (error: any) {
    console.error('[1C Sync Products Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка синхронизации' },
      { status: 500 }
    );
  }
}
