export class OneCClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor() {
    const url = process.env.ONEC_ODATA_URL || 'https://1cstart.itsheff.cloud/okeyvizhenjb94v/odata/standard.odata';
    const user = process.env.ONEC_USER || 'Главный бухгалтер';
    const pass = process.env.ONEC_PASSWORD || '5555';

    if (!url) {
      throw new Error('ONEC_ODATA_URL is not configured');
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
      ИНН: data.inn || '',
      ЮрФизЛицо: data.type || 'ЮридическоеЛицо'
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
      Владелец_Key: counterpartyKey,
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
}

export const oneCClient = new OneCClient();
