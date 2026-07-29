/**
 * Exploit working 1C services: GetCommonNodsData, GiveAllDocs, DataTransfer
 * to extract actual data and understand the exchange node setup requirements
 */
require('dotenv').config();
const https = require('https');

const BASE_URL = process.env.ONEC_URL || 'https://1cstart.itsheff.cloud/okeyvizhenjb94v';
const USERNAME = process.env.ONEC_USERNAME || 'Главный Бухгалтер';
const PASSWORD = process.env.ONEC_PASSWORD || '5555';
const AUTH = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

function soapCall(service, ns, bodyXml, soapAction) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/ws/${service}`);
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
        'SOAPAction': soapAction || `${ns}#${service}:Ping`,
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

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
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

function decodeHtmlEntities(str) {
  return str
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  WORKING SERVICES DATA EXTRACTION                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════════════════════════════
  // 1. GetCommonNodsData - get organizations and node info
  // ═══════════════════════════════════════════════════════════════
  console.log('=== 1. GetCommonNodsData (full response) ===\n');
  
  const planNames = [
    'СинхронизацияДанныхЧерезУниверсальныйФормат',
    'ОбменРозницаБухгалтерияПредприятия30',
    'ОбменУправлениеТорговлейБухгалтерияПредприятия30',
  ];
  
  for (const plan of planNames) {
    console.log(`\n--- ${plan} ---`);
    const res = await soapCall(
      'Exchange_2_0_1_6',
      'http://www.1c.ru/SSL/Exchange_2_0_1_6',
      `<tns:GetCommonNodsData><tns:ExchangePlanName>${plan}</tns:ExchangePlanName></tns:GetCommonNodsData>`
    );
    if (!res.body.includes('Fault')) {
      // Decode and print the full response
      const returnVal = res.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
      const decoded = decodeHtmlEntities(returnVal);
      console.log(decoded);
    } else {
      console.log('  FAULT:', res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1]);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. GiveAllDocs - get all documents
  // ═══════════════════════════════════════════════════════════════
  console.log('\n\n=== 2. GiveAllDocs (full response) ===\n');
  const docsRes = await soapCall(
    'DataExchange',
    'DataExchange',
    '<tns:GiveAllDocs/>'
  );
  if (!docsRes.body.includes('Fault')) {
    const returnVal = docsRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || 
                      docsRes.body.match(/<return[^>]*>([\s\S]*?)<\/return>/)?.[1] || '';
    const decoded = decodeHtmlEntities(returnVal);
    console.log(decoded);
  } else {
    console.log('  FAULT:', docsRes.body);
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. InterfaceVersion - GetVersions
  // ═══════════════════════════════════════════════════════════════
  console.log('\n\n=== 3. GetVersions ===\n');
  const versRes = await soapCall(
    'InterfaceVersion',
    'http://www.1c.ru/SaaS/1.0/WS',
    '<tns:GetVersions><tns:InterfaceName>EnterpriseDataExchange</tns:InterfaceName></tns:GetVersions>'
  );
  console.log('EnterpriseDataExchange versions:', versRes.body.includes('Fault') ? 
    versRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] : versRes.body.substring(0, 1000));

  const versRes2 = await soapCall(
    'InterfaceVersion',
    'http://www.1c.ru/SaaS/1.0/WS',
    '<tns:GetVersions><tns:InterfaceName>DataExchange</tns:InterfaceName></tns:GetVersions>'
  );
  console.log('\nDataExchange versions:', versRes2.body.includes('Fault') ? 
    versRes2.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] : versRes2.body.substring(0, 1000));

  const versRes3 = await soapCall(
    'InterfaceVersion',
    'http://www.1c.ru/SaaS/1.0/WS',
    '<tns:GetVersions><tns:InterfaceName>Exchange</tns:InterfaceName></tns:GetVersions>'
  );
  console.log('\nExchange versions:', versRes3.body.includes('Fault') ? 
    versRes3.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] : versRes3.body.substring(0, 1000));

  const versRes4 = await soapCall(
    'InterfaceVersion',
    'http://www.1c.ru/SaaS/1.0/WS',
    '<tns:GetVersions><tns:InterfaceName>RemoteAdministrationOfExchange</tns:InterfaceName></tns:GetVersions>'
  );
  console.log('\nRemoteAdmin versions:', versRes4.body.includes('Fault') ? 
    versRes4.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] : versRes4.body.substring(0, 1000));

  // ═══════════════════════════════════════════════════════════════
  // 4. Now the KEY test: Exchange_2_0_1_6 CreateExchange with CORRECT params
  // The WSDL says CreateExchange needs: ExchangePlanName, NodeCode, NodeDescription, 
  //   NodeDefaultValues (FixedStructure)
  // Let's try different formats
  // ═══════════════════════════════════════════════════════════════
  console.log('\n\n=== 4. CreateExchange via Exchange_2_0_1_6 (different formats) ===\n');
  
  const plan = 'СинхронизацияДанныхЧерезУниверсальныйФормат';
  
  // Get the WSDL for Exchange_2_0_1_6 first to see exact CreateExchange XSD
  const wsdl = await fetchUrl('/ws/Exchange_2_0_1_6?wsdl');
  
  // Find CreateExchange element definition
  const ceMatch = wsdl.body.match(/CreateExchange[\s\S]{0,2000}/);
  if (ceMatch) {
    console.log('CreateExchange WSDL context:');
    console.log(ceMatch[0].substring(0, 1000));
  }

  // Attempt format A: All 4 params  
  const formats = [
    {
      name: 'All params with empty NodeDefaultValues',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:NodeDescription>LensFlow CRM</tns:NodeDescription>
        <tns:NodeDefaultValues></tns:NodeDefaultValues>
      </tns:CreateExchange>`,
    },
    {
      name: 'Without NodeDescription',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
      </tns:CreateExchange>`,
    },
    {
      name: 'With NodeDefaultValues as FixedStructure',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:NodeDescription>LensFlow CRM</tns:NodeDescription>
        <tns:NodeDefaultValues xsi:type="FixedStructure">
        </tns:NodeDefaultValues>
      </tns:CreateExchange>`,
    },
    {
      name: 'With Settings structure',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:NodeDescription>LensFlow CRM</tns:NodeDescription>
        <tns:NodeDefaultValues xsi:type="tns:FixedStructure">
          <tns:Property name="РежимВыгрузки">
            <tns:Value xsi:type="xsd:string">АвтоматическийМаппинг</tns:Value>
          </tns:Property>
        </tns:NodeDefaultValues>
      </tns:CreateExchange>`,
    },
  ];

  for (const fmt of formats) {
    const res = await soapCall(
      'Exchange_2_0_1_6',
      'http://www.1c.ru/SSL/Exchange_2_0_1_6',
      fmt.body
    );
    const hasFault = res.body.includes('Fault');
    const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log(`  ${fmt.name}: ${hasFault ? '❌ ' + faultStr : '✅'} (HTTP ${res.status})`);
    if (!hasFault) {
      console.log('  Response:', res.body.substring(0, 1000));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. Exchange_3_0_2_1 - try CreateExchangeNode with correct format
  // According to WSDL, CreateExchangeNode needs:
  //   ExchangePlanName, NodeCode, NodeDescription, NodeDefaultValues (Structure)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n\n=== 5. CreateExchangeNode via Exchange_3_0_2_1 (different formats) ===\n');
  
  const ceFormats = [
    {
      name: 'Basic 3 params',
      body: `<tns:CreateExchangeNode>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:NodeDescription>LensFlow CRM</tns:NodeDescription>
      </tns:CreateExchangeNode>`,
    },
    {
      name: '4 params with empty NodeDefaultValues',
      body: `<tns:CreateExchangeNode>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:NodeDescription>LensFlow CRM</tns:NodeDescription>
        <tns:NodeDefaultValues/>
      </tns:CreateExchangeNode>`,
    },
    {
      name: '4 params + NodeFiltersSetting',
      body: `<tns:CreateExchangeNode>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:NodeDescription>LensFlow CRM</tns:NodeDescription>
        <tns:NodeDefaultValues/>
        <tns:NodeFiltersSetting/>
      </tns:CreateExchangeNode>`,
    },
  ];

  for (const fmt of ceFormats) {
    const res = await soapCall(
      'Exchange_3_0_2_1',
      'http://www.1c.ru/SSL/Exchange_3_0_2_1',
      fmt.body
    );
    const hasFault = res.body.includes('Fault');
    const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log(`  ${fmt.name}: ${hasFault ? '❌ ' + faultStr.substring(0, 200) : '✅'} (HTTP ${res.status})`);
    if (!hasFault) {
      console.log('  Response:', res.body.substring(0, 500));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. DataExchange service: Test and DataTransfer (these are custom!)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n\n=== 6. DataExchange custom service ===\n');
  
  // Test
  const testRes = await soapCall('DataExchange', 'DataExchange', '<tns:Test/>');
  console.log('Test:', testRes.body.includes('Fault') ? 'FAULT' : 'OK', '- Response:', 
    testRes.body.substring(0, 300));

  // GiveAllTAC (with dates)
  const tacRes = await soapCall(
    'DataExchange', 'DataExchange',
    '<tns:GiveAllTAC><tns:StartDate>2025-01-01T00:00:00</tns:StartDate><tns:EndDate>2026-12-31T23:59:59</tns:EndDate></tns:GiveAllTAC>'
  );
  const tacHasFault = tacRes.body.includes('Fault');
  console.log('\nGiveAllTAC:', tacHasFault ? 'FAULT' : 'OK');
  if (!tacHasFault) {
    const returnVal = tacRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || 
                      tacRes.body.match(/<return[^>]*>([\s\S]*?)<\/return>/)?.[1] || '';
    const decoded = decodeHtmlEntities(returnVal);
    console.log('Response:', decoded.substring(0, 2000));
  } else {
    console.log('Response:', tacRes.body.substring(0, 500));
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. Full OData metadata dump - find what entities ARE available
  // ═══════════════════════════════════════════════════════════════
  console.log('\n\n=== 7. OData metadata entities ===\n');
  const metaRes = await fetchUrl('/odata/standard.odata/$metadata');
  // Extract EntitySet names (these are the accessible entities)
  const entitySets = metaRes.body.match(/EntitySet\s+Name="([^"]+)"/g) || [];
  console.log(`Found ${entitySets.length} entity sets:`);
  entitySets.forEach(es => {
    const name = es.match(/Name="([^"]+)"/)?.[1];
    console.log(`  - ${name}`);
  });
  
  // Also try EntityType
  const entityTypes2 = metaRes.body.match(/EntityType\s+Name="([^"]+)"/g) || [];
  console.log(`\nFound ${entityTypes2.length} entity types:`);
  entityTypes2.forEach(et => {
    const name = et.match(/Name="([^"]+)"/)?.[1];
    console.log(`  - ${name}`);
  });

  // If no entity types found, dump first 3000 chars of metadata
  if (entityTypes2.length === 0 && entitySets.length === 0) {
    console.log('\nNo entities found. Metadata dump (first 5000 chars):');
    console.log(metaRes.body.substring(0, 5000));
  }

  console.log('\n=== ALL DONE ===');
}

main().catch(console.error);
