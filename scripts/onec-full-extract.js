/**
 * Final data extraction script - try all working paths to get actual data from 1C
 * Focus on DataTransfer with Identifier, GiveAllTAC with dates, 
 * and HTTP services for direct data access
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

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
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
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function decodeHtml(str) {
  return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  FULL DATA EXTRACTION - ALL METHODS                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // === 1. DataTransfer with Identifier field ===
  console.log('=== 1. DataTransfer with Identifier ===\n');
  
  const dtFormats = [
    {
      name: 'Identifier=Контрагенты',
      body: `<tns:DataTransfer><tns:SerializedDataStructure>${esc(
        '<Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<Property name="Identifier"><Value xsi:type="xs:string">Контрагенты</Value></Property>' +
        '</Structure>'
      )}</tns:SerializedDataStructure></tns:DataTransfer>`,
    },
    {
      name: 'Identifier=Справочник.Контрагенты',
      body: `<tns:DataTransfer><tns:SerializedDataStructure>${esc(
        '<Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<Property name="Identifier"><Value xsi:type="xs:string">Справочник.Контрагенты</Value></Property>' +
        '</Structure>'
      )}</tns:SerializedDataStructure></tns:DataTransfer>`,
    },
    {
      name: 'Identifier=Catalog.Контрагенты',
      body: `<tns:DataTransfer><tns:SerializedDataStructure>${esc(
        '<Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<Property name="Identifier"><Value xsi:type="xs:string">Catalog.Контрагенты</Value></Property>' +
        '</Structure>'
      )}</tns:SerializedDataStructure></tns:DataTransfer>`,
    },
    {
      name: 'Identifier=All',
      body: `<tns:DataTransfer><tns:SerializedDataStructure>${esc(
        '<Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<Property name="Identifier"><Value xsi:type="xs:string">All</Value></Property>' +
        '</Structure>'
      )}</tns:SerializedDataStructure></tns:DataTransfer>`,
    },
  ];

  for (const fmt of dtFormats) {
    console.log(`--- ${fmt.name} ---`);
    const res = await soapCall('DataExchange', 'DataExchange', fmt.body);
    const hasFault = res.body.includes('Fault');
    if (hasFault) {
      const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
      console.log(`  ❌ ${faultStr.trim().substring(0, 300)}`);
    } else {
      const returnVal = res.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
      const decoded = decodeHtml(returnVal);
      console.log(`  ✅ Response length: ${decoded.length}`);
      console.log('  First 500 chars:', decoded.substring(0, 500));
    }
    console.log();
  }

  // === 2. GiveAllTAC with dates ===
  console.log('\n=== 2. GiveAllTAC with dates ===\n');
  const tacRes = await soapCall('DataExchange', 'DataExchange', 
    `<tns:GiveAllTAC>
      <tns:StartDate>2024-01-01T00:00:00</tns:StartDate>
      <tns:EndDate>2026-12-31T23:59:59</tns:EndDate>
    </tns:GiveAllTAC>`
  );
  if (!tacRes.body.includes('Fault')) {
    const returnVal = tacRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    const decoded = decodeHtml(returnVal);
    console.log(`TAC Response length: ${decoded.length}`);
    console.log('First 2000 chars:', decoded.substring(0, 2000));
  } else {
    const faultStr = tacRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log(`❌ ${faultStr.trim().substring(0, 300)}`);
  }

  // === 3. GiveAllDocs ===
  console.log('\n\n=== 3. GiveAllDocs ===\n');
  const docsRes = await soapCall('DataExchange', 'DataExchange', '<tns:GiveAllDocs/>');
  if (!docsRes.body.includes('Fault')) {
    const returnVal = docsRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    const decoded = decodeHtml(returnVal);
    console.log(`Docs Response length: ${decoded.length}`);
    console.log('Response:', decoded.substring(0, 2000));
  }

  // === 4. HTTP Service endpoints ===
  console.log('\n\n=== 4. HTTP Service Discovery ===\n');
  const hsPaths = [
    '/hs/',
    '/hs/DataExchange/',
    '/hs/DataExchange/test',
    '/hs/exchange/',
    '/hs/exchange/test',
    '/hs/api/',
    '/hs/trade/',
    '/hs/mobile/',
  ];
  
  for (const path of hsPaths) {
    const res = await httpGet(path);
    console.log(`  ${path}: HTTP ${res.status} (${res.body.substring(0, 100).replace(/\n/g, ' ')})`);
  }

  // === 5. OData - check if anything is published now ===
  console.log('\n\n=== 5. OData check ===\n');
  const odataRes = await httpGet('/odata/standard.odata/');
  console.log(`OData root: HTTP ${odataRes.status}`);
  if (odataRes.status === 200) {
    // Check for any collections
    const collections = odataRes.body.match(/href="([^"]+)"/g) || [];
    console.log(`Collections found: ${collections.length}`);
    if (collections.length > 0) {
      console.log('First 20:', collections.slice(0, 20));
    }
  }
  
  // Also try odata $metadata
  const metaRes = await httpGet('/odata/standard.odata/$metadata');
  console.log(`\nOData metadata: HTTP ${metaRes.status}`);
  // Check for EntityType definitions
  const entityTypes = metaRes.body.match(/<EntityType[^>]+Name="([^"]+)"/g) || [];
  console.log(`EntityTypes: ${entityTypes.length}`);
  if (entityTypes.length > 0) {
    console.log('Types:', entityTypes.slice(0, 20));
  }

  // === 6. GetCommonNodsData - get organization data ===
  console.log('\n\n=== 6. GetCommonNodsData (organizations) ===\n');
  const plans = [
    'СинхронизацияДанныхЧерезУниверсальныйФормат',
    'ОбменРозницаБухгалтерияПредприятия30',
    'ОбменУправлениеТорговлейБухгалтерияПредприятия30',
  ];
  
  for (const plan of plans) {
    const nodsRes = await soapCall(
      'Exchange_2_0_1_6',
      'http://www.1c.ru/SSL/Exchange_2_0_1_6',
      `<tns:GetCommonNodsData><tns:ExchangePlanName>${plan}</tns:ExchangePlanName></tns:GetCommonNodsData>`
    );
    if (!nodsRes.body.includes('Fault')) {
      const returnVal = nodsRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
      console.log(`${plan}:`);
      console.log(`  Response: ${returnVal.substring(0, 500)}`);
    } else {
      console.log(`${plan}: ❌`);
    }
    console.log();
  }

  // === 7. GetIBParameters with NodeCode=LENSFLOW (detailed) ===
  console.log('\n=== 7. GetIBParameters full details ===\n');
  const ibpRes = await soapCall(
    'Exchange_3_0_2_1',
    'http://www.1c.ru/SSL/Exchange_3_0_2_1',
    `<tns:GetIBParameters>
      <tns:ExchangePlanName>СинхронизацияДанныхЧерезУниверсальныйФормат</tns:ExchangePlanName>
      <tns:NodeCode xsi:nil="true"/>
      <tns:ResultMessage xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:GetIBParameters>`
  );
  if (!ibpRes.body.includes('Fault')) {
    const returnVal = ibpRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    // Extract ПоддерживаемыеОбъектыФормата table
    const supportedMatch = returnVal.match(/ПоддерживаемыеОбъектыФормата[\s\S]*?<Value xsi:type="ValueTable">([\s\S]*?)<\/Value>/);
    if (supportedMatch) {
      const rows = [...supportedMatch[1].matchAll(/<row>([\s\S]*?)<\/row>/g)];
      console.log(`Supported format objects: ${rows.length} tables`);
      for (const row of rows.slice(0, 30)) {
        const vals = [...row[1].matchAll(/<Value[^>]*>([\s\S]*?)<\/Value>/g)].map(m => m[1]);
        console.log(`  Version=${vals[0]}, Table=${vals[1]}, Send=${vals[2]}, Recv=${vals[3]}`);
      }
    }
  }

  // === 8. CreateExchangeNode via Exchange_3_0_2_1 with UUID FileId ===
  console.log('\n\n=== 8. CreateExchangeNode with UUID FileId ===\n');
  const uuid = '00000000-0000-0000-0000-000000000000';
  const ceRes = await soapCall(
    'Exchange_3_0_2_1',
    'http://www.1c.ru/SSL/Exchange_3_0_2_1',
    `<tns:CreateExchangeNode>
      <tns:ExchangePlanName>СинхронизацияДанныхЧерезУниверсальныйФормат</tns:ExchangePlanName>
      <tns:NodeId>LENSFLOW</tns:NodeId>
      <tns:FileId>${uuid}</tns:FileId>
      <tns:Zone>0</tns:Zone>
    </tns:CreateExchangeNode>`
  );
  console.log('HTTP:', ceRes.status);
  if (!ceRes.body.includes('Fault')) {
    console.log('✅ Response:', ceRes.body.substring(0, 1000));
  } else {
    const faultStr = ceRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log('❌', faultStr.trim().substring(0, 500));
  }

  // === 9. Try Upload/UploadData directly ===
  console.log('\n\n=== 9. Upload attempt ===\n');
  const upRes = await soapCall(
    'Exchange_3_0_2_1',
    'http://www.1c.ru/SSL/Exchange_3_0_2_1',
    `<tns:Upload>
      <tns:ExchangePlanName>СинхронизацияДанныхЧерезУниверсальныйФормат</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:ExchangeMessage></tns:ExchangeMessage>
      <tns:Zone>0</tns:Zone>
    </tns:Upload>`
  );
  console.log('Upload HTTP:', upRes.status);
  if (!upRes.body.includes('Fault')) {
    console.log('✅ Response:', upRes.body.substring(0, 500));
  } else {
    const faultStr = upRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log('❌', faultStr.trim().substring(0, 500));
  }

  // === 10. Download - try to get exchange data ===  
  console.log('\n\n=== 10. Download attempt ===\n');
  const dlRes = await soapCall(
    'Exchange_3_0_2_1',
    'http://www.1c.ru/SSL/Exchange_3_0_2_1',
    `<tns:Download>
      <tns:ExchangePlanName>СинхронизацияДанныхЧерезУниверсальныйФормат</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:ExchangeMessage xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:Download>`
  );
  console.log('Download HTTP:', dlRes.status);
  if (!dlRes.body.includes('Fault')) {
    console.log('✅ Response (first 2000):', dlRes.body.substring(0, 2000));
  } else {
    const faultStr = dlRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log('❌', faultStr.trim().substring(0, 500));
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
