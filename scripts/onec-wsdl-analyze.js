/**
 * Deep WSDL analysis - extract exact XSD schema for all operations
 * to understand the correct parameter format
 */
require('dotenv').config();
const https = require('https');

const BASE = process.env.ONEC_URL || 'https://1cstart.itsheff.cloud/okeyvizhenjb94v';
const USER = process.env.ONEC_USERNAME || 'Главный Бухгалтер';
const PASS = process.env.ONEC_PASSWORD || '5555';
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE}${path}`);
    https.get({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: { 'Authorization': AUTH },
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function soapCall(service, ns, bodyXml) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}/ws/${service}`);
    const envelope = 
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
      ` xmlns:tns="${ns}"` +
      ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"' +
      ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<soap:Body>' + bodyXml + '</soap:Body></soap:Envelope>';
    
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': AUTH,
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `${ns}#${service}:Ping`, // dummy
      },
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (envelope) req.write(envelope);
    req.end();
  });
}

async function main() {
  console.log('\n=== DEEP WSDL ANALYSIS ===\n');

  // 1. Get Exchange_3_0_2_1 WSDL and extract XSD definitions for TestConnection, GetIBParameters
  const wsdl = await fetchUrl('/ws/Exchange_3_0_2_1?wsdl');
  
  // Extract the schema import URLs (1C usually puts XSD inline or imports)
  const xsdImports = wsdl.body.match(/schemaLocation="([^"]+)"/g) || [];
  console.log('XSD schema imports found:', xsdImports.length);
  xsdImports.forEach(s => console.log(' ', s));

  // Extract the operation definitions from portType
  const portTypeMatch = wsdl.body.match(/<wsdl:portType[^>]*>([\s\S]*?)<\/wsdl:portType>/);
  if (portTypeMatch) {
    console.log('\n--- PortType Operations ---');
    const ops = portTypeMatch[1].match(/<wsdl:operation[^>]*name="([^"]*)"[^>]*/g) || [];
    ops.forEach(op => console.log(' ', op.match(/name="([^"]*)"/)?.[1]));
  }

  // Extract the binding (to see soapAction patterns)
  const bindingMatch = wsdl.body.match(/<wsdl:binding[^>]*>([\s\S]*?)<\/wsdl:binding>/);
  if (bindingMatch) {
    console.log('\n--- SOAP Actions from Binding ---');
    const soapActions = bindingMatch[1].match(/soapAction="([^"]*)"/g) || [];
    soapActions.forEach(sa => console.log(' ', sa));
  }

  // Extract schema (xs:element definitions for operations)
  // Find the schema section
  const schemaMatch = wsdl.body.match(/<xs:schema[^>]*targetNamespace="http:\/\/www\.1c\.ru\/SSL\/Exchange_3_0_2_1"[^>]*>([\s\S]*?)<\/xs:schema>/);
  if (schemaMatch) {
    console.log('\n--- Exchange_3_0_2_1 XSD Schema (operation elements) ---');
    
    // Find TestConnection element
    const tcMatch = schemaMatch[1].match(/<xs:element\s+name="TestConnection"[^>]*>([\s\S]*?)<\/xs:element>/);
    if (tcMatch) {
      console.log('\nTestConnection schema:');
      console.log(tcMatch[0]);
    } else {
      // Try simpler match
      const tcSimple = schemaMatch[1].match(/TestConnection[\s\S]{0,500}/);
      if (tcSimple) console.log('\nTestConnection context:', tcSimple[0]);
    }

    // Find GetIBParameters element
    const ibMatch = schemaMatch[1].match(/<xs:element\s+name="GetIBParameters"[^>]*>([\s\S]*?)<\/xs:element>/);
    if (ibMatch) {
      console.log('\nGetIBParameters schema:');
      console.log(ibMatch[0]);
    } else {
      const ibSimple = schemaMatch[1].match(/GetIBParameters[\s\S]{0,500}/);
      if (ibSimple) console.log('\nGetIBParameters context:', ibSimple[0]);
    }
    
    // Find DownloadData element
    const dlMatch = schemaMatch[1].match(/<xs:element\s+name="DownloadData"[^>]*>([\s\S]*?)<\/xs:element>/);
    if (dlMatch) {
      console.log('\nDownloadData schema:');
      console.log(dlMatch[0]);
    }
    
    // Find Upload element
    const ulMatch = schemaMatch[1].match(/<xs:element\s+name="Upload"[^>]*>([\s\S]*?)<\/xs:element>/);
    if (ulMatch) {
      console.log('\nUpload schema:');
      console.log(ulMatch[0]);
    }

    // Find Download element
    const dl2Match = schemaMatch[1].match(/<xs:element\s+name="Download"[^>]*>([\s\S]*?)<\/xs:element>/);
    if (dl2Match) {
      console.log('\nDownload schema:');
      console.log(dl2Match[0]);
    }

    // Find CreateExchangeNode
    const ceMatch = schemaMatch[1].match(/<xs:element\s+name="CreateExchangeNode"[^>]*>([\s\S]*?)<\/xs:element>/);
    if (ceMatch) {
      console.log('\nCreateExchangeNode schema:');
      console.log(ceMatch[0]);
    }
  } else {
    console.log('\nNo inline schema found for Exchange_3_0_2_1, dumping all schema sections...');
    const allSchemas = wsdl.body.match(/<xs:schema[^>]*>([\s\S]*?)<\/xs:schema>/g) || [];
    console.log(`Found ${allSchemas.length} schema sections`);
    
    // Find the one with operation elements
    for (let i = 0; i < allSchemas.length; i++) {
      if (allSchemas[i].includes('TestConnection') || allSchemas[i].includes('GetIBParameters') || allSchemas[i].includes('DownloadData')) {
        console.log(`\n--- Schema section ${i} (contains operation elements) ---`);
        // Extract just the operation-related elements
        const elements = allSchemas[i].match(/<xs:element\s+name="[^"]*"[^\/]*(?:\/>|>[\s\S]*?<\/xs:element>)/g) || [];
        elements.forEach(el => {
          const name = el.match(/name="([^"]*)"/)?.[1];
          if (['TestConnection', 'TestConnectionResponse', 'GetIBParameters', 'GetIBParametersResponse',
               'DownloadData', 'DownloadDataResponse', 'UploadData', 'UploadDataResponse',
               'Upload', 'UploadResponse', 'Download', 'DownloadResponse',
               'CreateExchangeNode', 'CreateExchangeNodeResponse',
               'Ping', 'PingResponse'].includes(name)) {
            console.log(`\n  ${name}:`);
            console.log(`    ${el}`);
          }
        });
      }
    }
  }

  // 2. Now let's also get EnterpriseDataExchange_1_0_1_1 WSDL for the PrepareDataForGetting
  console.log('\n\n=== EnterpriseDataExchange_1_0_1_1 WSDL Schema ===\n');
  const edWsdl = await fetchUrl('/ws/EnterpriseDataExchange_1_0_1_1?wsdl');
  
  const edSchemas = edWsdl.body.match(/<xs:schema[^>]*>([\s\S]*?)<\/xs:schema>/g) || [];
  for (let i = 0; i < edSchemas.length; i++) {
    if (edSchemas[i].includes('PrepareDataForGetting') || edSchemas[i].includes('TestConnection') || edSchemas[i].includes('PutData')) {
      console.log(`\n--- ED Schema section ${i} ---`);
      const elements = edSchemas[i].match(/<xs:element\s+name="[^"]*"[^\/]*(?:\/>|>[\s\S]*?<\/xs:element>)/g) || [];
      elements.forEach(el => {
        const name = el.match(/name="([^"]*)"/)?.[1];
        console.log(`\n  ${name}:`);
        console.log(`    ${el}`);
      });
    }
  }

  // 3. Get available exchange plans from RemoteAdmin 
  console.log('\n\n=== Exchange Plans (from GetExchangePlans) ===\n');
  const plansRes = await soapCall(
    'RemoteAdministrationOfExchange_2_0_1_6',
    'http://www.1c.ru/SaaS/1.0/WS/RemoteAdministrationOfExchange_2_0_1_6',
    '<tns:GetExchangePlans/>'
  );
  console.log('Plans response:', plansRes.body);
  
  // Extract plan names
  const planReturn = plansRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1];
  if (planReturn) {
    const plans = planReturn.split(',').filter(p => p.trim());
    console.log('\nAvailable exchange plans:');
    plans.forEach(p => console.log(`  - "${p.trim()}"`));
    
    // 4. For each real plan, try TestConnection with the CORRECT WSDL format
    console.log('\n\n=== Testing Exchange_3_0_2_1 TestConnection with WSDL-correct format ===\n');
    
    for (const plan of plans) {
      const planName = plan.trim();
      if (!planName) continue;
      
      // Try multiple formats based on WSDL analysis
      const formats = [
        // Format A: Standard with <tns:Result/>
        {
          name: 'Standard (with Result)',
          body: `<tns:TestConnection><tns:ExchangePlanName>${planName}</tns:ExchangePlanName><tns:NodeCode>LENSFLOW</tns:NodeCode><tns:Result></tns:Result></tns:TestConnection>`,
        },
        // Format B: Without Result
        {
          name: 'Without Result',
          body: `<tns:TestConnection><tns:ExchangePlanName>${planName}</tns:ExchangePlanName><tns:NodeCode>LENSFLOW</tns:NodeCode></tns:TestConnection>`,
        },
        // Format C: Direct namespace (no tns)
        {
          name: 'Direct namespace',
          body: `<TestConnection xmlns="http://www.1c.ru/SSL/Exchange_3_0_2_1"><ExchangePlanName>${planName}</ExchangePlanName><NodeCode>LENSFLOW</NodeCode><Result/></TestConnection>`,
        },
      ];
      
      for (const fmt of formats) {
        try {
          const res = await soapCall(
            'Exchange_3_0_2_1',
            'http://www.1c.ru/SSL/Exchange_3_0_2_1',
            fmt.body
          );
          const hasFault = res.body.includes('Fault');
          const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
          console.log(`  ${planName} [${fmt.name}]: ${hasFault ? '❌ ' + faultStr : '✅ OK'} (HTTP ${res.status})`);
        } catch (e) {
          console.log(`  ${planName} [${fmt.name}]: ERROR ${e.message}`);
        }
      }
    }

    // 5. Try Exchange_2_0_1_6 operations which have different methods
    console.log('\n\n=== Testing Exchange_2_0_1_6 operations ===\n');
    for (const plan of plans) {
      const planName = plan.trim();
      if (!planName) continue;
      
      // Try GetIBData
      try {
        const res = await soapCall(
          'Exchange_2_0_1_6',
          'http://www.1c.ru/SSL/Exchange_2_0_1_6',
          `<tns:GetIBData><tns:ExchangePlanName>${planName}</tns:ExchangePlanName></tns:GetIBData>`
        );
        const hasFault = res.body.includes('Fault');
        const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
        console.log(`  ${planName} GetIBData: ${hasFault ? '❌ ' + faultStr : '✅'} (HTTP ${res.status})`);
        if (!hasFault) console.log('    Response:', res.body.substring(0, 500));
      } catch (e) {
        console.log(`  ${planName} GetIBData: ERROR ${e.message}`);
      }

      // Try GetCommonNodsData
      try {
        const res = await soapCall(
          'Exchange_2_0_1_6',
          'http://www.1c.ru/SSL/Exchange_2_0_1_6',
          `<tns:GetCommonNodsData><tns:ExchangePlanName>${planName}</tns:ExchangePlanName></tns:GetCommonNodsData>`
        );
        const hasFault = res.body.includes('Fault');
        const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
        console.log(`  ${planName} GetCommonNodsData: ${hasFault ? '❌ ' + faultStr : '✅'} (HTTP ${res.status})`);
        if (!hasFault) console.log('    Response:', res.body.substring(0, 500));
      } catch (e) {
        console.log(`  ${planName} GetCommonNodsData: ERROR ${e.message}`);
      }

      // Try CreateExchange (Exchange_2_0_1_6)
      try {
        const res = await soapCall(
          'Exchange_2_0_1_6',
          'http://www.1c.ru/SSL/Exchange_2_0_1_6',
          `<tns:CreateExchange><tns:ExchangePlanName>${planName}</tns:ExchangePlanName><tns:NodeCode>LENSFLOW</tns:NodeCode><tns:NodeDescription>LensFlow CRM</tns:NodeDescription></tns:CreateExchange>`
        );
        const hasFault = res.body.includes('Fault');
        const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
        console.log(`  ${planName} CreateExchange: ${hasFault ? '❌ ' + faultStr : '✅'} (HTTP ${res.status})`);
        if (!hasFault) console.log('    Response:', res.body.substring(0, 500));
      } catch (e) {
        console.log(`  ${planName} CreateExchange: ERROR ${e.message}`);
      }
    }
  }

  // 6. Try "Exchange" service (older version) operations
  console.log('\n\n=== Testing Exchange (oldest version) ===\n');
  const testPlans = ['СинхронизацияДанныхЧерезУниверсальныйФормат', 'ОбменДанными'];
  for (const plan of testPlans) {
    // Try GetIBData
    try {
      const res = await soapCall(
        'Exchange',
        'http://www.1c.ru/SSL/Exchange',
        `<tns:GetIBData><tns:ExchangePlanName>${plan}</tns:ExchangePlanName></tns:GetIBData>`
      );
      const hasFault = res.body.includes('Fault');
      const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
      console.log(`  ${plan} GetIBData: ${hasFault ? '❌ ' + faultStr : '✅'} (HTTP ${res.status})`);
      if (!hasFault) console.log('    Response:', res.body.substring(0, 500));
    } catch (e) {
      console.log(`  ${plan} GetIBData: ERROR ${e.message}`);
    }
  }

  // 7. Try the DataExchange service which DID work in previous diagnostics
  console.log('\n\n=== Testing DataExchange (GiveAllDocs) ===\n');
  try {
    const res = await soapCall(
      'DataExchange',
      'DataExchange',
      '<tns:GiveAllDocs/>'
    );
    const hasFault = res.body.includes('Fault');
    console.log(`  GiveAllDocs: ${hasFault ? '❌' : '✅'} (HTTP ${res.status})`);
    if (!hasFault) {
      const returnVal = res.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
      console.log(`  Response length: ${returnVal.length} chars`);
      console.log(`  First 2000 chars:`, returnVal.substring(0, 2000));
    } else {
      console.log('  Response:', res.body);
    }
  } catch (e) {
    console.log(`  GiveAllDocs: ERROR ${e.message}`);
  }

  console.log('\n\n=== OData - Get metadata entity names ===\n');
  try {
    const meta = await fetchUrl('/odata/standard.odata/$metadata');
    // Extract all EntityType names
    const entityTypes = meta.body.match(/EntityType\s+Name="([^"]+)"/g) || [];
    console.log(`Found ${entityTypes.length} entity types`);
    entityTypes.slice(0, 30).forEach(et => {
      const name = et.match(/Name="([^"]+)"/)?.[1];
      console.log(`  - ${name}`);
    });
    if (entityTypes.length > 30) console.log(`  ... and ${entityTypes.length - 30} more`);
  } catch (e) {
    console.log('  ERROR:', e.message);
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
