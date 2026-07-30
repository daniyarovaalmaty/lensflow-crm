import { NextRequest, NextResponse } from 'next/server';
import { OneCClient } from '@/lib/onec/client';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['lab_head', 'lab_admin', 'superadmin'].includes(session.user?.subRole || session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = (session.user as any).organizationId;
    if (!orgId) return NextResponse.json({ error: 'Организация не найдена' }, { status: 403 });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const onecConf = (org?.metadata as any)?.onec;
    
    if (!onecConf || !onecConf.baseUrl || !onecConf.username || !onecConf.password) {
      return NextResponse.json({ error: 'Сначала настройте интеграцию с 1С (Настройки -> Интеграция 1С)' }, { status: 400 });
    }

    const oneCClient = new OneCClient({
        baseUrl: onecConf.baseUrl,
        username: onecConf.username,
        password: onecConf.password
    });

    // Получаем 1000 товаров из 1С (в реальном приложении нужна пагинация через skip/top)
    const productsFrom1C = await oneCClient.request<any>('Catalog_Номенклатура?$top=1000');
    const items = productsFrom1C.value || [];

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      // Игнорируем папки (группы номенклатуры)
      if (item.IsFolder) continue;

      const onecId = item.Ref_Key;
      const name = item.Description;
      const code = item.Code;
      // В 1С артикул может называться "Артикул"
      const sku = item.Артикул || null;

      // Ищем товар по onecId или по точному совпадению name1c
      const existingProduct = await prisma.opticProduct.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            { onecId },
            { name1c: name }
          ]
        }
      });

      if (existingProduct) {
        // Обновляем
        await prisma.opticProduct.update({
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
        await prisma.opticProduct.create({
          data: {
            onecId,
            name,
            name1c: name,
            code,
            sku,
            category: 'lens', // Дефолтная категория, потом можно мапить из ВидНоменклатуры
            type: 'product',
            organizationId: orgId,
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
