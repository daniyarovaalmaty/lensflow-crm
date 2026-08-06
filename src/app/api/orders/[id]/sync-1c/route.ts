import { NextRequest, NextResponse } from 'next/server';
import { OrderSyncService } from '@/lib/onec/orderSync';
import { OneCClient } from '@/lib/onec/client';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const client = new OneCClient({
        baseUrl: onecConf.baseUrl,
        username: onecConf.username,
        password: onecConf.password
    });
    const orderSyncService = new OrderSyncService(client);

    const invoice = await orderSyncService.createInvoiceIn1C(params.id);

    return NextResponse.json({
      success: true,
      message: 'Заказ успешно отправлен в 1С',
      data: invoice
    });
  } catch (error: any) {
    console.error('[Sync 1C Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка синхронизации с 1С' },
      { status: 500 }
    );
  }
}
