import { NextRequest, NextResponse } from 'next/server';
import { orderSyncService } from '@/lib/onec/orderSync';
import { auth } from '@/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['lab_head', 'lab_admin', 'superadmin'].includes(session.user?.subRole || session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoice = await orderSyncService.syncOrderTo1C(params.id);

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
