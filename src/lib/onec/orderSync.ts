import prisma from '@/lib/db/prisma';
import { OneCClient } from './client';

export class OrderSyncService {
  constructor(private oneCClient: OneCClient) {}
  /**
   * Отправляет Заказ (Order) в 1С
   * 1. Находит или создает контрагента
   * 2. Находит или создает договор
   * 3. Формирует список товаров (пытается найти их по имени в 1С, если нет локального маппинга)
   * 4. Создает документ реализации
   */
  async syncOrderTo1C(orderId: string) {
    // 1. Получаем заказ из базы
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        organization: true, // Клиника-заказчик
      }
    });

    if (!order) throw new Error('Order not found');
    if (!order.organization) throw new Error('Order has no organization attached');

    const org = order.organization;

    // 2. Получаем ключи самой лаборатории из .env (Организация-продавец и Склад)
    // В реальной интеграции они могут лежать в настройках или ENV
    const labOrgKey = process.env.ONEC_LAB_ORG_ID;
    const labWarehouseKey = process.env.ONEC_LAB_WAREHOUSE_ID;

    if (!labOrgKey || !labWarehouseKey) {
      throw new Error('ONEC_LAB_ORG_ID and ONEC_LAB_WAREHOUSE_ID must be set in ENV');
    }

    // 3. Обработка контрагента (клиники)
    let counterpartyKey = org.onecOrgId;
    
    if (!counterpartyKey) {
      // Ищем контрагента в 1С по ИНН или Названию
      let searchFilter = `Description eq '${org.name}'`;
      if (org.inn) {
          searchFilter = `ИНН eq '${org.inn}'`;
      }
      
      const searchRes = await this.oneCClient.request<any>(`Catalog_Контрагенты?$filter=${searchFilter}`);
      
      if (searchRes.value && searchRes.value.length > 0) {
          counterpartyKey = searchRes.value[0].Ref_Key;
      } else {
          // Пытаемся создать контрагента в 1С
          const newCp = await this.oneCClient.createCounterparty({
            name: org.name,
            inn: org.inn || '',
            type: 'ЮридическоеЛицо'
          });
          counterpartyKey = newCp.Ref_Key;
      }
      
      // Сохраняем полученный ключ в базу
      if (counterpartyKey) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { onecOrgId: counterpartyKey }
        });
      }
    }

    if (!counterpartyKey) throw new Error('Failed to create or get Counterparty from 1C');

    // 4. Договор контрагента
    // Для простоты пока создаем новый договор, если его нет (или можно добавить onecContractId в Organization)
    // Здесь предполагаем, что у нас есть базовая валюта KZT.
    // В полноценном варианте нужно хранить onecContractId в Organization.
    const currencyKey = process.env.ONEC_CURRENCY_ID || '00000000-0000-0000-0000-000000000000'; // Заглушка, нужно будет брать реальный GUID тенге
    
    // Пока пропускаем договор, если он опциональный, либо создаем заглушку.
    // Реализация требует Договор, поэтому придется его создавать или искать.
    // Допустим, мы создаем его на лету и не сохраняем (для тестов), либо берем из ENV дефолтный
    const contractKey = process.env.ONEC_DEFAULT_CONTRACT_ID || '00000000-0000-0000-0000-000000000000';

    // 5. Формируем список товаров
    const items = [];
    
    // Вспомогательная функция для поиска номенклатуры в 1С по имени (если нет локального ID)
    const findProductKey = async (name: string) => {
      // В идеале мы должны искать в локальной БД (Product.onecId),
      // но если таблица еще не синхронизирована, ищем напрямую в 1С по OData фильтру:
      const res = await this.oneCClient.request<any>(`Catalog_Номенклатура?$filter=Description eq '${name}'`);
      if (res.value && res.value.length > 0) {
        return res.value[0].Ref_Key;
      }
      throw new Error(`Номенклатура '${name}' не найдена в 1С`);
    };

    if (order.documentNameOd) {
      const pKey = await findProductKey(order.documentNameOd);
      items.push({
        productKey: pKey,
        quantity: 1,
        price: order.priceOd || 0
      });
    }

    if (order.documentNameOs) {
      const pKey = await findProductKey(order.documentNameOs);
      items.push({
        productKey: pKey,
        quantity: 1,
        price: order.priceOs || 0
      });
    }

    if (items.length === 0) {
      throw new Error('В заказе нет товаров для отправки (пустые documentNameOd/Os)');
    }

    // 6. Создаем Счет на оплату
    try {
      await this.oneCClient.createPaymentBill({
        date: new Date().toISOString().split('.')[0], // Формат OData без миллисекунд
        organizationKey: labOrgKey,
        warehouseKey: labWarehouseKey,
        counterpartyKey,
        contractKey,
        items
      });
      console.log(`[1C Sync] Created Payment Bill for order ${order.id}`);
    } catch (billError: any) {
      console.error(`[1C Sync] Failed to create Payment Bill for order ${order.id}:`, billError.message);
      // Мы не прерываем создание реализации, если счет не создался (или можно прерывать, на усмотрение)
    }

    // 7. Создаем Реализацию
    const invoice = await this.oneCClient.createSalesInvoice({
      date: new Date().toISOString().split('.')[0], // Формат OData без миллисекунд
      organizationKey: labOrgKey,
      warehouseKey: labWarehouseKey,
      counterpartyKey,
      contractKey,
      items
    });

    // Можно добавить в Order поле onecInvoiceId, если нужно сохранять статус
    return invoice;
  }
}
