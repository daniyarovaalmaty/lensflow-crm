/**
 * Try Exchange_2_0_1_6 Upload/Download operations
 * And also try to get actual org data from GetCommonNodsData
 */
require('dotenv').config();
const https = require('https');

const BASE_URL = process.env.ONEC_URL || 'https://1cstart.itsheff.cloud/okeyvizhenjb94v';
const USERNAME = process.env.ONEC_USERNAME || 'Главный Бухгалтер';
const PASSWORD = process.env.ONEC_PASSWORD || '5555';
const AUTH = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

function soapCall(service, ns, bodyXml) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/ws/${service}`);
    const envelope = 
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
      ` xmlns:tns="${ns}"` +
      ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"' +
      ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xmlns:xs1="http://v8.1c.ru/8.1/data/core">' +
      '<soap:Body>' + bodyXml + '</soap:Body></soap:Envelope>';
    
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': AUTH,
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
      },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(envelope);
    req.end();
  });
}

function decodeHtml(str) {
  return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
}

async function main() {
  const plan = 'СинхронизацияДанныхЧерезУниверсальныйФормат';

  console.log('=== 1. Exchange_2_0_1_6 WSDL operations ===\n');
  // Get WSDL to see all available operations
  const wsdlRes = await new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/ws/Exchange_2_0_1_6?wsdl`);
    https.get({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: { 'Authorization': AUTH },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
  
  // Extract operation elements
  const elements = [...wsdlRes.matchAll(/<xs:element\s+name="(\w+)"[\s\S]*?(?:<\/xs:element>|<xs:element[^\/]*\/>)/g)];
  console.log('All WSDL elements:');
  for (const el of elements) {
    if (el[1].includes('Response')) continue;
    const params = [...el[0].matchAll(/name="(\w+)"\s+(?:type="([^"]+)"|nillable)/g)].map(p => `${p[1]}${p[2] ? '(' + p[2] + ')' : ''}`);
    console.log(`  ${el[1]}: ${params.join(', ')}`);
  }

  // === 2. Try all operations of Exchange_2_0_1_6 ===
  console.log('\n\n=== 2. Exchange_2_0_1_6 Operations ===\n');

  // Upload
  console.log('--- Upload ---');
  const upRes = await soapCall(
    'Exchange_2_0_1_6',
    'http://www.1c.ru/SSL/Exchange_2_0_1_6',
    `<tns:Upload>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:ExchangeMessage></tns:ExchangeMessage>
    </tns:Upload>`
  );
  console.log('HTTP:', upRes.status);
  if (upRes.body.includes('Fault')) {
    console.log('❌', (upRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').substring(0, 400));
  } else {
    console.log('✅', upRes.body.substring(0, 500));
  }

  // Download  
  console.log('\n--- Download ---');
  const dlRes = await soapCall(
    'Exchange_2_0_1_6',
    'http://www.1c.ru/SSL/Exchange_2_0_1_6',
    `<tns:Download>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:ExchangeMessage xsi:nil="true"/>
    </tns:Download>`
  );
  console.log('HTTP:', dlRes.status);
  if (dlRes.body.includes('Fault')) {
    console.log('❌', (dlRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').substring(0, 400));
  } else {
    console.log('✅', dlRes.body.substring(0, 500));
  }

  // GetExchangePlans full response
  console.log('\n--- GetExchangePlans (full response) ---');
  const epRes = await soapCall(
    'RemoteAdministrationOfExchange_2_0_1_6',
    'http://www.1c.ru/SaaS/1.0/WS/RemoteAdministrationOfExchange_2_0_1_6',
    '<tns:GetExchangePlans/>'
  );
  if (!epRes.body.includes('Fault')) {
    const returnVal = epRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    console.log('Plans:', returnVal.substring(0, 3000));
  }

  // === 3. GetCommonNodsData full org data ===
  console.log('\n\n=== 3. GetCommonNodsData - Full Organization Data ===\n');
  const nodsRes = await soapCall(
    'Exchange_2_0_1_6',
    'http://www.1c.ru/SSL/Exchange_2_0_1_6',
    `<tns:GetCommonNodsData><tns:ExchangePlanName>${plan}</tns:ExchangePlanName></tns:GetCommonNodsData>`
  );
  if (!nodsRes.body.includes('Fault')) {
    const returnVal = nodsRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    console.log('Full org data (first 5000):', returnVal.substring(0, 5000));
    
    // Parse organization names  
    const orgNames = [...returnVal.matchAll(/Представление[\s\S]*?<Value[^>]*>([\s\S]*?)<\/Value>/g)].map(m => m[1]);
    const orgUids = [...returnVal.matchAll(/УникальныйИдентификаторСсылки[\s\S]*?<Value[^>]*>([\s\S]*?)<\/Value>/g)].map(m => m[1]);
    console.log('\n\nOrganizations found:');
    for (let i = 0; i < orgNames.length; i++) {
      console.log(`  ${i + 1}. ${orgNames[i]} (UUID: ${orgUids[i] || '?'})`);
    }
  }

  // === 4. Try existing exchange plan nodes via GetExchangeNodes ===
  console.log('\n\n=== 4. GetExchangeNodes ===\n');
  // Check if there's a GetExchangeNodes operation 
  const ops = [
    'GetExchangeNodes',
    'GetSettingValues',
    'GetCatalog',
    'GetCatalogInfo',
  ];
  for (const op of ops) {
    console.log(`--- ${op} ---`);
    const res = await soapCall(
      'Exchange_2_0_1_6',
      'http://www.1c.ru/SSL/Exchange_2_0_1_6',
      `<tns:${op}><tns:ExchangePlanName>${plan}</tns:ExchangePlanName></tns:${op}>`
    );
    if (res.body.includes('Fault')) {
      const fault = (res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').substring(0, 200);
      console.log(`  ❌ ${fault}`);
    } else {
      console.log(`  ✅ HTTP ${res.status}`);
      const ret = res.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
      console.log(`  Response: ${ret.substring(0, 500)}`);
    }
    console.log();
  }

  // === 5. Try the correct Download parameter format for Exchange_3_0_2_1 ===
  console.log('\n=== 5. Exchange_3_0_2_1 with correct param order ===\n');
  // Let me look at WSDL more carefully to get exact param names/order
  const wsdl3Res = await new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/ws/Exchange_3_0_2_1?wsdl`);
    https.get({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: { 'Authorization': AUTH },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
  
  // Find Download element definition
  const downloadMatch = wsdl3Res.match(/<xs:element\s+name="Download"[\s\S]*?<\/xs:element>/);
  if (downloadMatch) {
    console.log('Download WSDL definition:');
    console.log(downloadMatch[0].substring(0, 1000));
  }

  // Find Upload element definition
  const uploadMatch = wsdl3Res.match(/<xs:element\s+name="Upload"[\s\S]*?<\/xs:element>/);
  if (uploadMatch) {
    console.log('\nUpload WSDL definition:');
    console.log(uploadMatch[0].substring(0, 1000));
  }

  // Find CreateExchangeNode element definition
  const createMatch = wsdl3Res.match(/<xs:element\s+name="CreateExchangeNode"[\s\S]*?<\/xs:element>/);
  if (createMatch) {
    console.log('\nCreateExchangeNode WSDL definition:');
    console.log(createMatch[0].substring(0, 1000));
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
