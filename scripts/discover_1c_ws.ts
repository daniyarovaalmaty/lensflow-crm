// Discover ALL available WS services
import https from 'https';

const BASE = 'https://1cstart.itsheff.cloud/okeyvizhenjb94v';
const USER = '\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0411\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440';
const PASS = '5555';
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

function req(url: string): Promise<{status: number; body: string}> {
  return new Promise((resolve, reject) => {
    const r = https.request(url, {
      headers: { Authorization: AUTH },
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
  // Standard BSP web services in 1C:Бухгалтерия для Казахстана
  const wsNames = [
    'Exchange', 'Exchange_2_0_1_6', 'InterfaceVersion',
    'EnterpriseDataUpload_1_0_6_2',
    'EnterpriseDataUpload_1_0_6_1', 
    'EnterpriseDataUpload_1_0_1_1',
    'EnterpriseDataExchange_1_0_1_1',
    'RemoteAdministrationOfExchange',
    'RemoteAdministrationOfExchange_2_0_1_6',
    'MessageExchange', 'MessageExchange_2_0_1_6',
    'EnterpriseDataExchange',
    'DataExchange',
    'ExchangeMessages',
    'FileTransferService',
    'FilesTransferService',
    // ESF related
    'ESF', 'ЭСФ', 'ElectronicInvoice',
    'ISESFService', 'ESFService',
    // Common
    'Ping', 'TestService', 'Test',
    'AdditionalReportsAndDataProcessors',
    'InfobaseVersion',
    'SendSMS',
  ];

  console.log('=== Discovering WS Services ===\n');
  const found: string[] = [];
  
  for (const name of wsNames) {
    const r = await req(`${BASE}/ws/${name}?wsdl`);
    if (r.status === 200) {
      // Extract operations
      const ops = [...r.body.matchAll(/operation\s+name="([^"]+)"/g)].map(m => m[1]);
      const uniqueOps = [...new Set(ops)];
      console.log(`  ✅ /ws/${name} — ${uniqueOps.length} operations: ${uniqueOps.join(', ')}`);
      found.push(name);
    }
  }

  console.log(`\n=== Found ${found.length} WS services ===`);
  
  // Also try OData with $metadata to see if any entity types are now published
  console.log('\n=== OData $metadata EntityTypes ===');
  const meta = await req(`${BASE}/odata/standard.odata/$metadata`);
  const entityTypes = [...meta.body.matchAll(/EntityType\s+Name="([^"]+)"/g)].map(m => m[1]);
  console.log(`  EntityTypes found: ${entityTypes.length}`);
  if (entityTypes.length > 0) {
    entityTypes.forEach(e => console.log(`    - ${e}`));
  }
  
  const entitySets = [...meta.body.matchAll(/EntitySet\s+Name="([^"]+)"/g)].map(m => m[1]);
  console.log(`  EntitySets found: ${entitySets.length}`);
  if (entitySets.length > 0) {
    entitySets.forEach(e => console.log(`    - ${e}`));
  }
}

main().catch(console.error);
