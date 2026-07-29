/**
 * 1C SOAP Deep Diagnostic Script
 * 
 * Tests ALL available services and approaches to find working configuration.
 * Fetches WSDLs, tries different parameter formats, exchange plan names, etc.
 */
const https = require('https');
require('dotenv').config();

const BASE_URL = process.env.ONEC_URL || 'https://1cstart.itsheff.cloud/okeyvizhenjb94v';
const USERNAME = process.env.ONEC_USERNAME || 'Главный Бухгалтер';
const PASSWORD = process.env.ONEC_PASSWORD || '5555';

const AUTH = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

// ─── HTTP Helper ────────────────────────────────────────────────────

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOpts = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': AUTH,
        ...(options.headers || {}),
      },
      rejectUnauthorized: false,
      timeout: 30000,
    };

    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

function soapCall(serviceName, namespace, operationName, bodyXml) {
  const soapAction = `${namespace}#${serviceName}:${operationName}`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${namespace}">
  <soap:Body>
    ${bodyXml}
  </soap:Body>
</soap:Envelope>`;

  return httpRequest(`${BASE_URL}/ws/${serviceName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': soapAction,
    },
    body: envelope,
  });
}

// ─── Phase 1: Fetch all WSDLs ──────────────────────────────────────

async function fetchWSDLs() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 1: FETCHING WSDL DEFINITIONS                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const services = [
    'Exchange_3_0_2_1',
    'Exchange_2_0_1_6',
    'Exchange',
    'EnterpriseDataExchange_1_0_1_1',
    'EnterpriseDataUpload_1_0_1_1',
    'RemoteAdministrationOfExchange_2_0_1_6',
    'RemoteAdministrationOfExchange_4_0_7_1',
    'DataExchange',
    'InterfaceVersion',
  ];

  const wsdls = {};

  for (const svc of services) {
    try {
      const res = await httpRequest(`${BASE_URL}/ws/${svc}?wsdl`);
      if (res.status === 200 && res.body.includes('definitions')) {
        console.log(`✅ ${svc}: WSDL loaded (${res.body.length} bytes)`);
        wsdls[svc] = res.body;
        
        // Extract operation names from WSDL
        const ops = [...res.body.matchAll(/<(?:wsdl:)?operation\s+name="([^"]+)"/g)].map(m => m[1]);
        const uniqueOps = [...new Set(ops)];
        console.log(`   Operations: ${uniqueOps.join(', ')}`);
        
        // Extract target namespace
        const tnsMatch = res.body.match(/targetNamespace="([^"]+)"/);
        if (tnsMatch) console.log(`   Namespace: ${tnsMatch[1]}`);
        
      } else {
        console.log(`❌ ${svc}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.log(`❌ ${svc}: ${err.message}`);
    }
  }

  return wsdls;
}

// ─── Phase 2: Test Exchange_3_0_2_1 with various parameter formats ──

async function testExchange3(wsdl) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 2: TESTING Exchange_3_0_2_1                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const NS = 'http://www.1c.ru/SSL/Exchange_3_0_2_1';

  // 2.1 Ping
  console.log('--- 2.1 Ping ---');
  try {
    const res = await soapCall('Exchange_3_0_2_1', NS, 'Ping', '<tns:Ping/>');
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${res.body.substring(0, 500)}`);
  } catch (e) { console.log(`  Error: ${e.message}`); }

  // 2.2 Try different exchange plan names
  const planNames = [
    'СинхронизацияДанныхЧерезУниверсальныйФормат',
    'СинхронизацияДанныхЧерезУниверсальныйФорматБСП',
    'ОбменДанными',
    'ОбменСCRM',
    'Universal',
    'EnterpriseData',
  ];

  const nodeCodes = ['LENSFLOW', 'LensFlow', 'lensflow', '001', 'CRM'];

  // 2.3 TestConnection with different plan names
  console.log('\n--- 2.3 TestConnection with different plan names ---');
  for (const plan of planNames) {
    for (const code of nodeCodes.slice(0, 2)) {
      try {
        const res = await soapCall('Exchange_3_0_2_1', NS, 'TestConnection',
          `<tns:TestConnection>
            <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
            <tns:NodeCode>${code}</tns:NodeCode>
            <tns:Result></tns:Result>
          </tns:TestConnection>`);
        const isFault = res.body.includes('Fault');
        const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
        console.log(`  ${plan} / ${code}: ${isFault ? '❌ ' + faultStr.substring(0, 100) : '✅ OK'}`);
      } catch (e) { console.log(`  ${plan} / ${code}: ❌ ${e.message.substring(0, 100)}`); }
    }
  }

  // 2.4 Try GetExchangePlans if it exists
  console.log('\n--- 2.4 GetExchangePlans ---');
  try {
    const res = await soapCall('Exchange_3_0_2_1', NS, 'GetExchangePlans',
      '<tns:GetExchangePlans/>');
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${res.body.substring(0, 1000)}`);
  } catch (e) { console.log(`  Error: ${e.message}`); }

  // 2.5 GetIBParameters with different formats
  console.log('\n--- 2.5 GetIBParameters ---');
  for (const plan of planNames.slice(0, 3)) {
    try {
      const res = await soapCall('Exchange_3_0_2_1', NS, 'GetIBParameters',
        `<tns:GetIBParameters>
          <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
          <tns:NodeCode>LENSFLOW</tns:NodeCode>
          <tns:Parameters></tns:Parameters>
        </tns:GetIBParameters>`);
      const isFault = res.body.includes('Fault');
      const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
      console.log(`  ${plan}: ${isFault ? '❌ ' + faultStr.substring(0, 150) : '✅ ' + res.body.substring(0, 300)}`);
    } catch (e) { console.log(`  ${plan}: ❌ ${e.message.substring(0, 100)}`); }
  }

  // 2.6 Try operations without ExchangePlanName/NodeCode (maybe they're not required?)
  console.log('\n--- 2.6 Ping with different body formats ---');
  const pingVariants = [
    '<tns:Ping/>',
    '<tns:Ping></tns:Ping>',
    '<Ping xmlns="' + NS + '"/>',
  ];
  for (const body of pingVariants) {
    try {
      const res = await soapCall('Exchange_3_0_2_1', NS, 'Ping', body);
      console.log(`  Body "${body.substring(0, 50)}": Status ${res.status}, Fault: ${res.body.includes('Fault')}`);
    } catch (e) { console.log(`  Error: ${e.message}`); }
  }
}

// ─── Phase 3: Test EnterpriseDataExchange ───────────────────────────

async function testEnterpriseDataExchange(wsdl) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 3: TESTING EnterpriseDataExchange_1_0_1_1       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const NS = 'http://www.1c.ru/SSL/EnterpriseDataExchange_1_0_1_1';

  // Parse WSDL to understand exact operation signatures
  if (wsdl) {
    console.log('--- WSDL Analysis ---');
    // Extract message parts
    const messages = [...wsdl.matchAll(/<(?:wsdl:)?message\s+name="([^"]+)">([\s\S]*?)<\/(?:wsdl:)?message>/g)];
    for (const msg of messages) {
      const parts = [...msg[2].matchAll(/<(?:wsdl:)?part\s+name="([^"]+)"\s+(?:type|element)="([^"]+)"/g)];
      console.log(`  Message "${msg[1]}":`);
      for (const p of parts) {
        console.log(`    Part: ${p[1]} -> ${p[2]}`);
      }
    }
  }

  // 3.1 GetExchangeFeatures
  console.log('\n--- 3.1 GetExchangeFeatures ---');
  try {
    const res = await soapCall('EnterpriseDataExchange_1_0_1_1', NS, 'GetExchangeFeatures',
      '<tns:GetExchangeFeatures/>');
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${res.body.substring(0, 1000)}`);
  } catch (e) { console.log(`  Error: ${e.message}`); }

  // 3.2 Try different plan names for GetData / PrepareDataForGetting
  const planNames = [
    'СинхронизацияДанныхЧерезУниверсальныйФормат',
    'ОбменДанными',
  ];

  console.log('\n--- 3.2 PrepareDataForGetting ---');
  for (const plan of planNames) {
    // Try with string NodeCode
    try {
      const res = await soapCall('EnterpriseDataExchange_1_0_1_1', NS, 'PrepareDataForGetting',
        `<tns:PrepareDataForGetting>
          <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
          <tns:NodeCode>LENSFLOW</tns:NodeCode>
        </tns:PrepareDataForGetting>`);
      const isFault = res.body.includes('Fault');
      const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
      console.log(`  ${plan}/LENSFLOW (string): ${isFault ? '❌ ' + faultStr.substring(0, 200) : '✅ OK'}`);
    } catch (e) { console.log(`  ${plan}: ❌ ${e.message.substring(0, 100)}`); }

    // Try with numeric NodeCode (the error mentions "conversion to Number")
    try {
      const res = await soapCall('EnterpriseDataExchange_1_0_1_1', NS, 'PrepareDataForGetting',
        `<tns:PrepareDataForGetting>
          <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
          <tns:NodeCode>1</tns:NodeCode>
        </tns:PrepareDataForGetting>`);
      const isFault = res.body.includes('Fault');
      const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
      console.log(`  ${plan}/1 (numeric): ${isFault ? '❌ ' + faultStr.substring(0, 200) : '✅ OK'}`);
    } catch (e) { console.log(`  ${plan}: ❌ ${e.message.substring(0, 100)}`); }
  }

  // 3.3 GetData
  console.log('\n--- 3.3 GetData ---');
  for (const plan of planNames) {
    try {
      const res = await soapCall('EnterpriseDataExchange_1_0_1_1', NS, 'GetData',
        `<tns:GetData>
          <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
          <tns:NodeCode>LENSFLOW</tns:NodeCode>
          <tns:FilePartNumber>0</tns:FilePartNumber>
        </tns:GetData>`);
      const isFault = res.body.includes('Fault');
      const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
      console.log(`  ${plan}: ${isFault ? '❌ ' + faultStr.substring(0, 200) : '✅ OK'}`);
    } catch (e) { console.log(`  ${plan}: ❌ ${e.message.substring(0, 100)}`); }
  }
}

// ─── Phase 4: Test EnterpriseDataUpload ─────────────────────────────

async function testEnterpriseDataUpload(wsdl) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 4: TESTING EnterpriseDataUpload_1_0_1_1         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const NS = 'http://www.1c.ru/SSL/EnterpriseDataUpload_1_0_1_1';

  // 4.1 GetExchangeFeatures
  console.log('--- 4.1 GetExchangeFeatures ---');
  try {
    const res = await soapCall('EnterpriseDataUpload_1_0_1_1', NS, 'GetExchangeFeatures',
      '<tns:GetExchangeFeatures/>');
    console.log(`  Status: ${res.status}`);
    const isFault = res.body.includes('Fault');
    if (isFault) {
      const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
      console.log(`  ❌ ${faultStr.substring(0, 200)}`);
    } else {
      console.log(`  ✅ ${res.body.substring(0, 500)}`);
    }
  } catch (e) { console.log(`  Error: ${e.message}`); }

  // 4.2 GetCatalogData with different formats
  console.log('\n--- 4.2 Catalog operations ---');
  const ops = ['GetCatalogData', 'GetCorrespondentData'];
  for (const op of ops) {
    try {
      const res = await soapCall('EnterpriseDataUpload_1_0_1_1', NS, op,
        `<tns:${op}>
          <tns:ExchangePlanName>СинхронизацияДанныхЧерезУниверсальныйФормат</tns:ExchangePlanName>
          <tns:NodeCode>LENSFLOW</tns:NodeCode>
          <tns:FilePartNumber>0</tns:FilePartNumber>
        </tns:${op}>`);
      const isFault = res.body.includes('Fault');
      const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
      console.log(`  ${op}: ${isFault ? '❌ ' + faultStr.substring(0, 200) : '✅ OK'}`);
    } catch (e) { console.log(`  ${op}: ❌ ${e.message.substring(0, 100)}`); }
  }
}

// ─── Phase 5: Test RemoteAdministration ─────────────────────────────

async function testRemoteAdmin(wsdl) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 5: TESTING RemoteAdministration                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Try both version 2 and 4
  const versions = [
    { svc: 'RemoteAdministrationOfExchange_2_0_1_6', ns: 'http://www.1c.ru/SaaS/1.0/WS/RemoteAdministrationOfExchange_2_0_1_6' },
    { svc: 'RemoteAdministrationOfExchange_4_0_7_1', ns: 'http://www.1c.ru/SaaS/1.0/WS/RemoteAdministrationOfExchange_4_0_7_1' },
  ];

  for (const { svc, ns } of versions) {
    console.log(`\n--- ${svc} ---`);
    
    // Try GetExchangePlans
    try {
      const res = await soapCall(svc, ns, 'GetExchangePlans', `<tns:GetExchangePlans/>`);
      const isFault = res.body.includes('Fault');
      if (!isFault) {
        console.log(`  GetExchangePlans: ✅`);
        console.log(`  Response: ${res.body.substring(0, 500)}`);
      } else {
        const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
        console.log(`  GetExchangePlans: ❌ ${faultStr.substring(0, 150)}`);
      }
    } catch (e) { console.log(`  GetExchangePlans: ❌ ${e.message}`); }

    // Try CreateExchangeNode with different XML formats
    const nodeFormats = [
      // Format 1: Simple parameters
      `<tns:CreateExchangeNode>
        <tns:ExchangePlanName>СинхронизацияДанныхЧерезУниверсальныйФормат</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:NodeDescription>LensFlow CRM</tns:NodeDescription>
      </tns:CreateExchangeNode>`,
      // Format 2: With Parameters wrapper
      `<tns:CreateExchangeNode>
        <tns:Parameters>
          <tns:ExchangePlan>СинхронизацияДанныхЧерезУниверсальныйФормат</tns:ExchangePlan>
          <tns:NodeCode>LENSFLOW</tns:NodeCode>
          <tns:NodeDescription>LensFlow CRM</tns:NodeDescription>
        </tns:Parameters>
      </tns:CreateExchangeNode>`,
    ];

    for (let i = 0; i < nodeFormats.length; i++) {
      try {
        const res = await soapCall(svc, ns, 'CreateExchangeNode', nodeFormats[i]);
        const isFault = res.body.includes('Fault');
        const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
        console.log(`  CreateExchangeNode format ${i + 1}: ${isFault ? '❌ ' + faultStr.substring(0, 200) : '✅ OK'}`);
      } catch (e) { console.log(`  CreateExchangeNode format ${i + 1}: ❌ ${e.message.substring(0, 100)}`); }
    }

    // Try GetExchangeNodeParameters
    try {
      const res = await soapCall(svc, ns, 'GetExchangeNodeParameters',
        `<tns:GetExchangeNodeParameters>
          <tns:ExchangePlanName>СинхронизацияДанныхЧерезУниверсальныйФормат</tns:ExchangePlanName>
          <tns:NodeCode>LENSFLOW</tns:NodeCode>
        </tns:GetExchangeNodeParameters>`);
      const isFault = res.body.includes('Fault');
      const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
      console.log(`  GetExchangeNodeParameters: ${isFault ? '❌ ' + faultStr.substring(0, 200) : '✅ OK'}`);
    } catch (e) { console.log(`  GetExchangeNodeParameters: ❌ ${e.message}`); }
  }
}

// ─── Phase 6: Try OData/REST API ────────────────────────────────────

async function testODataRest() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 6: TESTING OData / REST API                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const endpoints = [
    '/odata/standard.odata/$metadata',
    '/odata/standard.odata/Catalog_Номенклатура?$top=1&$format=json',
    '/odata/standard.odata/Catalog_Контрагенты?$top=1&$format=json',
    '/odata/standard.odata/Catalog_Организации?$top=1&$format=json',
    '/odata/standard.odata/InformationRegister_НастройкиТранспортаОбменаДанными?$format=json',
    '/odata/standard.odata/ExchangePlan_СинхронизацияДанныхЧерезУниверсальныйФормат?$format=json',
    '/hs/dt/catalogs',
    '/hs/exchange',
  ];

  for (const ep of endpoints) {
    try {
      const res = await httpRequest(`${BASE_URL}${ep}`);
      const preview = res.body.substring(0, 300).replace(/\n/g, ' ');
      console.log(`  ${ep}: HTTP ${res.status} | ${preview.substring(0, 200)}`);
    } catch (e) { console.log(`  ${ep}: ❌ ${e.message}`); }
  }
}

// ─── Phase 7: Detailed WSDL parameter analysis ─────────────────────

function analyzeWSDL(name, wsdl) {
  if (!wsdl) return;
  console.log(`\n--- ${name} WSDL Parameter Details ---`);
  
  // Extract all types/elements
  const elements = [...wsdl.matchAll(/<(?:s|xsd|xs):element\s+name="([^"]+)"[^>]*(?:type="([^"]+)")?[^>]*\/?>/g)];
  if (elements.length > 0) {
    console.log('  Elements:');
    for (const el of elements.slice(0, 30)) {
      console.log(`    ${el[1]}${el[2] ? ' : ' + el[2] : ''}`);
    }
  }

  // Extract complexTypes
  const complexTypes = [...wsdl.matchAll(/<(?:s|xsd|xs):complexType\s+name="([^"]+)">([\s\S]*?)<\/(?:s|xsd|xs):complexType>/g)];
  if (complexTypes.length > 0) {
    console.log('  ComplexTypes:');
    for (const ct of complexTypes.slice(0, 15)) {
      const innerElements = [...ct[2].matchAll(/<(?:s|xsd|xs):element\s+name="([^"]+)"[^>]*(?:type="([^"]+)")?/g)];
      console.log(`    ${ct[1]}:`);
      for (const ie of innerElements) {
        console.log(`      - ${ie[1]}${ie[2] ? ' : ' + ie[2] : ''}`);
      }
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  1C SOAP DEEP DIAGNOSTIC`);
  console.log(`  URL: ${BASE_URL}`);
  console.log(`  User: ${USERNAME}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  // Phase 1
  const wsdls = await fetchWSDLs();

  // Analyze WSDLs
  for (const [name, wsdl] of Object.entries(wsdls)) {
    analyzeWSDL(name, wsdl);
  }

  // Phase 2
  await testExchange3(wsdls['Exchange_3_0_2_1']);

  // Phase 3
  await testEnterpriseDataExchange(wsdls['EnterpriseDataExchange_1_0_1_1']);

  // Phase 4
  await testEnterpriseDataUpload(wsdls['EnterpriseDataUpload_1_0_1_1']);

  // Phase 5
  await testRemoteAdmin(wsdls['RemoteAdministrationOfExchange_2_0_1_6'] || wsdls['RemoteAdministrationOfExchange_4_0_7_1']);

  // Phase 6
  await testODataRest();

  console.log('\n' + '='.repeat(60));
  console.log('  DIAGNOSTIC COMPLETE');
  console.log('='.repeat(60));
}

main().catch(console.error);
