// Exhaustive 1C endpoint discovery
import https from 'https';

const BASE = 'https://1cstart.itsheff.cloud/okeyvizhenjb94v';
const USER = '\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0411\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440';
const PASS = '5555';
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

function req(url: string, method = 'GET', headers: Record<string,string> = {}, body?: string): Promise<{status: number; body: string; headers: Record<string,string>}> {
  return new Promise((resolve, reject) => {
    const r = https.request(url, {
      method,
      headers: { Authorization: AUTH, ...headers },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ 
        status: res.statusCode!, 
        body: d, 
        headers: res.headers as Record<string,string> 
      }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('  EXHAUSTIVE 1C ENDPOINT DISCOVERY');
  console.log('========================================\n');

  // ===== SECTION 1: Root paths =====
  console.log('--- 1. Root / base paths ---');
  const rootPaths = ['', '/', '/en', '/en/', '/ru', '/ru/'];
  for (const p of rootPaths) {
    const r = await req(`${BASE}${p}`);
    console.log(`  ${BASE}${p} => ${r.status} (${r.body.length} bytes)`);
  }

  // ===== SECTION 2: OData with different formats and encodings =====
  console.log('\n--- 2. OData entity attempts (Latin + Cyrillic + URL-encoded) ---');
  
  // Try Latin transliterations (some configs use English names)
  const odataLatinEntities = [
    'Catalog_Counterparties', 'Catalog_counterparties',
    'Catalog_Partners', 'Catalog_partners',
    'Catalog_Products', 'Catalog_products',
    'Catalog_Items', 'Catalog_items',
    'Catalog_Nomenclature', 'Catalog_nomenclature',
    'Catalog_Organizations', 'Catalog_organizations',
    'Catalog_Contracts', 'Catalog_contracts',
    'Catalog_Warehouses', 'Catalog_warehouses',
    'Catalog_UOM', 'Catalog_uom',
    'Catalog_Currencies', 'Catalog_currencies',
    'Document_Invoice', 'Document_invoice',
    'Document_SalesInvoice', 'Document_salesinvoice',
    'Document_GoodsIssue', 'Document_goodsissue',
    'Document_GoodsReceipt', 'Document_goodsreceipt',
    'InformationRegister_Prices', 'InformationRegister_prices',
    'AccumulationRegister_Stock', 'AccumulationRegister_stock',
    'AccumulationRegister_Inventory', 'AccumulationRegister_inventory',
  ];
  
  // Cyrillic names for Kazakh Accounting 3.0
  const odataCyrEntities = [
    // Справочники
    '\u041a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442\u044b',                     // Контрагенты
    '\u041d\u043e\u043c\u0435\u043d\u043a\u043b\u0430\u0442\u0443\u0440\u0430',                    // Номенклатура
    '\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438',                     // Организации
    '\u0414\u043e\u0433\u043e\u0432\u043e\u0440\u044b\u041a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442\u043e\u0432',            // ДоговорыКонтрагентов
    '\u0421\u043a\u043b\u0430\u0434\u044b',                           // Склады
    '\u0415\u0434\u0438\u043d\u0438\u0446\u044b\u0418\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f',                // ЕдиницыИзмерения
    '\u0412\u0430\u043b\u044e\u0442\u044b',                           // Валюты
    '\u0421\u0442\u0430\u0432\u043a\u0438\u041d\u0414\u0421',                        // СтавкиНДС
    '\u0411\u0430\u043d\u043a\u043e\u0432\u0441\u043a\u0438\u0435\u0421\u0447\u0435\u0442\u0430',                // БанковскиеСчета
    '\u041f\u0430\u0440\u0442\u043d\u0435\u0440\u044b',                         // Партнеры (1C:УТ)
    '\u0421\u043e\u0433\u043b\u0430\u0448\u0435\u043d\u0438\u044f',                       // Соглашения
    // Документы
    '\u0421\u0447\u0435\u0442\u041d\u0430\u041e\u043f\u043b\u0430\u0442\u0443\u041f\u043e\u043a\u0443\u043f\u0430\u0442\u0435\u043b\u044e',        // СчетНаОплатуПокупателю
    '\u0420\u0435\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f\u0422\u043e\u0432\u0430\u0440\u043e\u0432\u0423\u0441\u043b\u0443\u0433',       // РеализацияТоваровУслуг
    '\u041f\u043e\u0441\u0442\u0443\u043f\u043b\u0435\u043d\u0438\u0435\u0422\u043e\u0432\u0430\u0440\u043e\u0432\u0423\u0441\u043b\u0443\u0433',      // ПоступлениеТоваровУслуг
    '\u0422\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u0435\u041d\u0430\u043a\u043b\u0430\u0434\u043d\u0430\u044f',          // ТребованиеНакладная
    '\u041f\u0435\u0440\u0435\u043c\u0435\u0449\u0435\u043d\u0438\u0435\u0422\u043e\u0432\u0430\u0440\u043e\u0432',           // ПеремещениеТоваров
    '\u041a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430\u0420\u0435\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438',      // КорректировкаРеализации
    '\u0421\u043f\u0438\u0441\u0430\u043d\u0438\u0435\u0422\u043e\u0432\u0430\u0440\u043e\u0432',              // СписаниеТоваров
    '\u041f\u041a\u041e',                              // ПКО (приходный кассовый ордер)
    '\u0420\u041a\u041e',                              // РКО (расходный кассовый ордер)
    // Регистры
    '\u0426\u0435\u043d\u044b\u041d\u043e\u043c\u0435\u043d\u043a\u043b\u0430\u0442\u0443\u0440\u044b',             // ЦеныНоменклатуры
    '\u0422\u043e\u0432\u0430\u0440\u044b\u041d\u0430\u0421\u043a\u043b\u0430\u0434\u0430\u0445',              // ТоварыНаСкладах
    '\u0412\u0437\u0430\u0438\u043c\u043e\u0440\u0430\u0441\u0447\u0435\u0442\u044b\u0421\u041a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442\u0430\u043c\u0438',  // ВзаиморасчетыСКонтрагентами
  ];

  for (const name of odataLatinEntities) {
    const r = await req(`${BASE}/odata/standard.odata/${encodeURIComponent(name)}?$top=1&$format=json`);
    if (r.status !== 404) console.log(`  [LATIN] ${name} => ${r.status}`);
  }

  for (const name of odataCyrEntities) {
    // Try as Catalog_, Document_, InformationRegister_, AccumulationRegister_
    const prefixes = ['Catalog_', 'Document_', 'InformationRegister_', 'AccumulationRegister_'];
    for (const prefix of prefixes) {
      const full = `${prefix}${name}`;
      const r = await req(`${BASE}/odata/standard.odata/${encodeURIComponent(full)}?$top=1&$format=json`);
      if (r.status !== 404) {
        console.log(`  [CYR] ${full} => ${r.status}: ${r.body.substring(0, 200)}`);
      }
    }
  }

  // ===== SECTION 3: HS paths (more exhaustive) =====
  console.log('\n--- 3. HTTP Services (/hs/) - extended scan ---');
  // Generate all lowercase+uppercase alphabet combos 1-3 chars
  const hsExtended = [
    // Standard BSP HTTP services
    'EnterpriseDataExchange', 'EnterpriseDataUpload', 'EnterpriseData',
    'DataCompositionService', 'BusinessProcesses', 'PrintService',
    'StoredFiles', 'AttachedFiles', 'AdditionalReports',
    'SendSMSMessage', 'Taxes', 'DigitalSignature',
    'FileTransfer', 'FilesTransfer',
    'TaxReporting', 'ReportVariants',
    'CalendarSchedules', 'AccessManagement',
    // Common custom
    'getdata', 'getData', 'GetData',
    'catalog', 'Catalog', 'catalogs', 'Catalogs',
    'counterparty', 'Counterparty',
    'order', 'Order', 'orders', 'Orders',
    'invoice', 'Invoice', 'invoices', 'Invoices',
    'document', 'Document', 'documents', 'Documents',
    'stock', 'Stock', 'warehouse', 'Warehouse',
    'price', 'Price', 'prices', 'Prices',
    'sync', 'Sync', 'synchronization',
    // Kazakh-specific
    'esf', 'ESF', 'isesf',
    'edo', 'EDO', 'edi', 'EDI',
    'snt', 'SNT',
    'eavr', 'EAVR',
    // CRM integration patterns
    'api', 'API', 'v1', 'v2',
    'rest', 'REST', 'json', 'JSON',
    'external', 'External',
    'mobile', 'Mobile',
    'web', 'Web', 'webhook', 'Webhook',
    'integration', 'Integration',
    'connector', 'Connector',
    'exchange', 'exch',
    'bitrix', 'Bitrix', 'bitrix24',
    'iiko', 'IIKO',
    'moysklad', 'MoySklad',
    // Numbered
    '1', '2', '3',
    'hs1', 'hs2', 'service1',
    'test', 'Test', 'ping', 'Ping', 'health', 'Health', 'status', 'Status',
    'info', 'Info', 'version', 'Version',
    'help', 'Help',
  ];

  let hsFound = 0;
  for (const name of hsExtended) {
    const r = await req(`${BASE}/hs/${name}`);
    if (r.status !== 404) {
      console.log(`  ✅ /hs/${name} => ${r.status}: ${r.body.substring(0, 300)}`);
      hsFound++;
    }
  }
  if (hsFound === 0) console.log('  No HTTP services found');

  // ===== SECTION 4: Check all WS services for WSDL =====
  console.log('\n--- 4. WS services (full scan) ---');
  const wsNames = [
    'Exchange', 'Exchange_2_0_1_6', 'Exchange_3_0_1_1', 'Exchange_3_0_2_1',
    'InterfaceVersion',
    'EnterpriseDataUpload_1_0_1_1', 'EnterpriseDataUpload_1_0_6_1', 'EnterpriseDataUpload_1_0_6_2',
    'EnterpriseDataExchange_1_0_1_1', 'EnterpriseDataExchange_1_0_6_1',
    'RemoteAdministrationOfExchange', 'RemoteAdministrationOfExchange_2_0_1_6', 'RemoteAdministrationOfExchange_3_0_1_1',
    'MessageExchange', 'MessageExchange_2_0_1_6', 'MessageExchange_3_0_1_1',
    'DataExchange', 'DataExchange_1_0', 'DataExchange_2_0',
    'FileTransferService', 'FilesTransferService',
    'AdditionalReportsAndDataProcessors', 'AdditionalReportsAndDataProcessorsService',
    'SendSMSMessage', 'SendSMS',
    'DigitalSignature', 'DigitalSignatureService',
    'CalendarSchedules', 'AccessManagement',
    'TaxReporting', 'ReportVariants',
    'ESF', 'ESFService', 'ISESFService', 'ElectronicInvoice', 'ElectronicInvoices',
    'PrintService', 'DocumentPrintService',
  ];

  for (const name of wsNames) {
    const r = await req(`${BASE}/ws/${name}?wsdl`);
    if (r.status === 200) {
      const ops = [...new Set([...r.body.matchAll(/operation\s+name="([^"]+)"/g)].map(m => m[1]))];
      console.log(`  ✅ /ws/${name} (${ops.length} ops): ${ops.join(', ')}`);
    }
  }

  // ===== SECTION 5: DataExchange WS - detailed inspection =====
  console.log('\n--- 5. DataExchange WS - WSDL details ---');
  const dxWsdl = await req(`${BASE}/ws/DataExchange?wsdl`);
  if (dxWsdl.status === 200) {
    // Extract all message/element names to understand what data it handles
    const messages = [...new Set([...dxWsdl.body.matchAll(/message\s+name="([^"]+)"/g)].map(m => m[1]))];
    console.log(`  Messages: ${messages.join(', ')}`);
    
    // Extract element names from types
    const elements = [...new Set([...dxWsdl.body.matchAll(/element\s+name="([^"]+)"/g)].map(m => m[1]))];
    console.log(`  Elements: ${elements.join(', ')}`);
  }

  // ===== SECTION 6: Try alternative OData paths =====
  console.log('\n--- 6. Alternative API paths ---');
  const altPaths = [
    '/odata/', '/odata/standard.odata', '/odata/standard.odata/',
    '/e1cib/oid/', '/e1cib/data/',
    '/api/', '/api/v1/', '/api/v2/',
    '/rest/', '/rest/v1/',
    '/json/', '/data/',
    '/en/odata/standard.odata/', '/ru/odata/standard.odata/',
    '/en/hs/', '/ru/hs/',
  ];
  for (const p of altPaths) {
    const r = await req(`${BASE}${p}`);
    if (r.status !== 404 && r.status !== 500) {
      console.log(`  ${p} => ${r.status} (${r.body.length} bytes)`);
    }
  }

  console.log('\n========================================');
  console.log('  SCAN COMPLETE');
  console.log('========================================');
}

main().catch(console.error);
