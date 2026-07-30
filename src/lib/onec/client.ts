export interface OneCClientConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export class OneCClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: OneCClientConfig) {
    let url = config.baseUrl;
    const user = config.username;
    const pass = config.password;

    if (!url) {
      throw new Error('Укажите URL сервера 1С в настройках');
    }

    // Если URL не заканчивается на odata/standard.odata, добавим его (как fallback для тех, кто ввел просто корень)
    if (!url.includes('odata/standard.odata')) {
        url = url.endsWith('/') ? `${url}odata/standard.odata` : `${url}/odata/standard.odata`;
    }

    this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    this.authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`, 'utf8').toString('base64');
  }

  /**
   * Базовый метод для отправки запросов в 1С
   */
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    // По умолчанию 1С OData отдает XML, если не передать $format=json
    const hasQuery = url.includes('?');
    const finalUrl = url + (hasQuery ? '&$format=json' : '?$format=json');

    const headers = {
      'Authorization': this.authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    try {
      const response = await fetch(finalUrl, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[1C OData Error]', response.status, text);
        throw new Error(`1C API Error: ${response.status} ${response.statusText} - ${text}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[1C OData Request Failed] ${finalUrl}`, error);
      throw error;
    }
  }

  /**
   * Получить список номенклатуры (товаров)
   */
  async getProducts(limit = 100, skip = 0) {
    const res = await this.request<any>(`Catalog_Номенклатура?$top=${limit}&$skip=${skip}`);
    return res.value || [];
  }

  /**
   * Получить список контрагентов (клиентов)
   */
  async getCounterparties(limit = 100, skip = 0) {
    const res = await this.request<any>(`Catalog_Контрагенты?$top=${limit}&$skip=${skip}`);
    return res.value || [];
  }

  /**
   * Создать нового контрагента в 1С
   */
  async createCounterparty(data: { name: string; inn?: string; type?: 'ЮридическоеЛицо' | 'ФизическоеЛицо' }) {
    const payload = {
      Description: data.name,
      НаименованиеПолное: data.name,
      ЮрФизЛицо: data.type === 'ЮридическоеЛицо' ? 'ЮрЛицо' : 'ФизЛицо',
      ИдентификационныйКодЛичности: data.inn || '',
    };

    const res = await this.request<any>('Catalog_Контрагенты', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res;
  }

  /**
   * Создать основной договор для контрагента
   */
  async createContract(counterpartyKey: string, orgKey: string, currencyKey: string) {
    const payload = {
      Description: 'Основной договор',
      Owner_Key: counterpartyKey,
      Организация_Key: orgKey,
      ВидДоговора: 'СПокупателем',
      ВалютаВзаиморасчетов_Key: currencyKey
    };

    const res = await this.request<any>('Catalog_ДоговорыКонтрагентов', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return res;
  }

  /**
   * Создать Реализацию (документ продажи) в 1С
   */
  async createSalesInvoice(data: {
    date: string;
    organizationKey: string;
    warehouseKey: string;
    counterpartyKey: string;
    contractKey: string;
    items: Array<{
      productKey: string;
      quantity: number;
      price: number;
    }>;
  }) {
    const payload = {
      Date: data.date, // Format: YYYY-MM-DDTHH:mm:ss
      Организация_Key: data.organizationKey,
      Склад_Key: data.warehouseKey,
      Контрагент_Key: data.counterpartyKey,
      ДоговорКонтрагента_Key: data.contractKey,
      Товары: data.items.map((item, index) => ({
        LineNumber: (index + 1).toString(),
        Номенклатура_Key: item.productKey,
        Количество: item.quantity,
        Цена: item.price,
        Сумма: item.quantity * item.price
      }))
    };

    const res = await this.request<any>('Document_РеализацияТоваровУслуг', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res;
  }

  /**
   * Создать Счет на оплату в 1С
   */
  async createPaymentBill(data: {
    date: string;
    organizationKey: string;
    warehouseKey: string;
    counterpartyKey: string;
    contractKey: string;
    items: Array<{
      productKey: string;
      quantity: number;
      price: number;
    }>;
  }) {
    const payload = {
      Date: data.date,
      Организация_Key: data.organizationKey,
      Контрагент_Key: data.counterpartyKey,
      ДоговорКонтрагента_Key: data.contractKey,
      Товары: data.items.map((item, index) => ({
        LineNumber: (index + 1).toString(),
        Номенклатура_Key: item.productKey,
        Количество: item.quantity,
        Цена: item.price,
        Сумма: item.quantity * item.price
      }))
    };

    const res = await this.request<any>('Document_СчетНаОплатуПокупателю', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res;
  }

  /**
   * Получить цены (Прайсы) из 1С
   * Возвращает словарь: { 'onecId': retailPrice }
   */
  async getPrices(): Promise<Record<string, number>> {
    try {
      // 1. Пытаемся найти Розничную цену
      const priceTypes = await this.request<any>('Catalog_ТипыЦенНоменклатуры');
      let targetPriceTypeKey = null;
      if (priceTypes && priceTypes.value) {
        const retailType = priceTypes.value.find((pt: any) => pt.Description.toLowerCase().includes('розничная'));
        if (retailType) {
          targetPriceTypeKey = retailType.Ref_Key;
        } else {
          // Fallback to first available
          targetPriceTypeKey = priceTypes.value[0]?.Ref_Key;
        }
      }

      // 2. Скачиваем регистр цен
      // Если есть определенный тип цен, можно отфильтровать (но OData фильтр по вложенным массивам сложен)
      // Проще скачать весь регистр (или $top=1000)
      const res = await this.request<any>('InformationRegister_ЦеныНоменклатуры');
      const records = res.value || [];
      
      const priceMap: Record<string, number> = {};

      for (const recorder of records) {
        if (recorder.RecordSet && Array.isArray(recorder.RecordSet)) {
          for (const record of recorder.RecordSet) {
            // Если мы определили желаемый тип цен и он не совпадает — пропускаем (если это не единственный)
            if (targetPriceTypeKey && record.ТипЦен_Key !== targetPriceTypeKey) {
              // Если в priceMap еще нет цены для этой номенклатуры, сохраняем хотя бы эту
              if (!priceMap[record.Номенклатура_Key]) {
                priceMap[record.Номенклатура_Key] = record.Цена;
              }
              continue;
            }
            
            // Сохраняем/перезаписываем приоритетной ценой
            priceMap[record.Номенклатура_Key] = record.Цена;
          }
        }
      }

      return priceMap;
    } catch (error) {
      console.error('[1C OData getPrices Error]', error);
      return {}; // Возвращаем пустой объект при ошибке, чтобы не ломать синхронизацию каталога
    }
  }
}
