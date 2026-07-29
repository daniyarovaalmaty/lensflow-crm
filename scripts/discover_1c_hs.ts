// Discover 1C HTTP services by trying common endpoint names
import https from 'https';

const BASE = 'https://1cstart.itsheff.cloud/okeyvizhenjb94v';
const USER = '\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0411\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440';
const PASS = '5555';
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

function req(url: string): Promise<{status: number; body: string}> {
  return new Promise((resolve, reject) => {
    const r = https.request(url, {
      headers: { Authorization: AUTH, Accept: 'application/json' },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode!, body: d }));
    });
    r.on('error', reject);
    r.end();
  });
}

async function main() {
  // Common 1C HTTP service paths
  const paths = [
    // Standard
    'hs', 'hs/', 
    // Common names
    'hs/api', 'hs/api/', 'hs/api/v1',
    'hs/exchange', 'hs/Exchange',
    'hs/lensflow', 'hs/LensFlow',
    'hs/rest', 'hs/REST',
    'hs/data', 'hs/Data',
    'hs/erp', 'hs/ERP',
    'hs/trade', 'hs/Trade',
    'hs/sync', 'hs/Sync',
    'hs/integration', 'hs/Integration',
    'hs/ext', 'hs/Ext',
    'hs/web', 'hs/Web',
    'hs/crm', 'hs/CRM',
    'hs/service', 'hs/Service',
    'hs/info', 'hs/Info',
    // Kazakh accounting specific
    'hs/buh', 'hs/Buh',
    'hs/accounting', 'hs/Accounting',
    'hs/esf', 'hs/ESF',
    // Standard 1C БСП HTTP services
    'hs/EnterpriseData', 'hs/enterprisedata',
    'hs/DataExchange', 'hs/dataexchange',
    'hs/CommerceML', 'hs/commerceml',
    'hs/Bitrix', 'hs/bitrix',
    'hs/EDT', 'hs/edt',
    'hs/WebhookHandler',
    'hs/SMSProvider',
    'hs/1cFresh',
    'hs/MobileBanking',
    'hs/Exchange_2_0_1_6',
    'hs/InterfaceVersion',
    // Maybe with trailing slashes
    'hs/api/counterparties',
    'hs/api/catalog',
    'hs/api/products',
    'hs/api/invoices',
    'hs/api/organizations',
    // Standard BSP
    'hs/exch', 'hs/Exch',
    'hs/edo', 'hs/EDO',
    'hs/1c-integration',
    'hs/v1', 'hs/v2',
    // Numbered
    'hs/hs1', 'hs/hs2',
    // Other patterns
    'hs/test', 'hs/ping', 'hs/health',
    'hs/GetData', 'hs/GetCatalog',
    'hs/counterparties', 'hs/Counterparties',
    'hs/products', 'hs/Products',
    'hs/nomenclature', 'hs/Nomenclature',
  ];

  console.log('=== Discovering 1C HTTP Services ===\n');
  
  const found: string[] = [];
  
  for (const p of paths) {
    const r = await req(`${BASE}/${p}`);
    if (r.status !== 404) {
      console.log(`  ${p} => ${r.status}: ${r.body.substring(0, 200)}`);
      found.push(p);
    }
  }

  console.log(`\n=== Found ${found.length} non-404 endpoints ===`);
  found.forEach(f => console.log(`  /${f}`));
}

main().catch(console.error);
