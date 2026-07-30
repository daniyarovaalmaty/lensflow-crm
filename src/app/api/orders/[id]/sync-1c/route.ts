import { NextRequest, NextResponse } from 'next/server';
import { orderSyncService } from '@/lib/onec/orderSync';
import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth'; // Adjust import based on the actual auth path

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // В реальной системе нужно проверить права доступа (isAdmin / isManager)
    // const session = await getServerSession(authOptions);
    // if (!session || !['admin', 'manager'].includes(session.user?.role)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

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
