/**
 * FINAL FIX: Add missing Zone parameter and correct GetIBData TableName
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

  // ═══════════════════════════════════════════════════════════
  // 1. TestConnection with Zone parameter
  // WSDL: ExchangePlanName(string), NodeCode(string), Result(string nillable), Zone(integer)
  // ═══════════════════════════════════════════════════════════
  console.log('=== 1. TestConnection with Zone ===\n');
  
  const zones = [0, 1, -1];
  for (const zone of zones) {
    const res = await soapCall(
      'Exchange_3_0_2_1',
      'http://www.1c.ru/SSL/Exchange_3_0_2_1',
      `<tns:TestConnection>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:Result xsi:nil="true"/>
        <tns:Zone>${zone}</tns:Zone>
      </tns:TestConnection>`
    );
    const hasFault = res.body.includes('Fault');
    const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log(`  Zone=${zone}: ${hasFault ? '❌ ' + faultStr.trim().substring(0, 200) : '✅'} (HTTP ${res.status})`);
    if (!hasFault) console.log('  Response:', res.body.substring(0, 500));
  }

  // ═══════════════════════════════════════════════════════════
  // 2. GetIBParameters with Zone
  // WSDL: ExchangePlanName(string), NodeCode(string nillable), ResultMessage(string nillable), Zone(integer)
  // ═══════════════════════════════════════════════════════════
  console.log('\n=== 2. GetIBParameters with Zone ===\n');
  
  for (const zone of zones) {
    const res = await soapCall(
      'Exchange_3_0_2_1',
      'http://www.1c.ru/SSL/Exchange_3_0_2_1',
      `<tns:GetIBParameters>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode xsi:nil="true"/>
        <tns:ResultMessage xsi:nil="true"/>
        <tns:Zone>${zone}</tns:Zone>
      </tns:GetIBParameters>`
    );
    const hasFault = res.body.includes('Fault');
    const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log(`  Zone=${zone}: ${hasFault ? '❌ ' + faultStr.trim().substring(0, 300) : '✅'} (HTTP ${res.status})`);
    if (!hasFault) {
      console.log('  Response:', res.body.substring(0, 1000));
    }
  }

  // With NodeCode = LENSFLOW
  console.log('\n  With NodeCode=LENSFLOW, Zone=0:');
  const ibpRes = await soapCall(
    'Exchange_3_0_2_1',
    'http://www.1c.ru/SSL/Exchange_3_0_2_1',
    `<tns:GetIBParameters>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:ResultMessage xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:GetIBParameters>`
  );
  const ibpFault = ibpRes.body.includes('Fault');
  const ibpFaultStr = ibpRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
  console.log(`    ${ibpFault ? '❌ ' + ibpFaultStr.trim().substring(0, 300) : '✅'} (HTTP ${ibpRes.status})`);
  if (!ibpFault) console.log('    Response:', ibpRes.body.substring(0, 1000));

  // ═══════════════════════════════════════════════════════════
  // 3. GetIBData with correct TableName parameter
  // WSDL: TableName (string)
  // ═══════════════════════════════════════════════════════════
  console.log('\n=== 3. GetIBData with TableName ===\n');
  
  const tables = [
    'Справочник.Контрагенты',
    'Справочник.Номенклатура',
    'Справочник.Организации',
    'Справочник.Договоры',
    'Catalog.Контрагенты',
    'Catalog.Номенклатура',
    'Контрагенты',
    'Номенклатура',
    'Организации',
    '',
  ];

  for (const table of tables) {
    const res = await soapCall(
      'Exchange_2_0_1_6',
      'http://www.1c.ru/SSL/Exchange_2_0_1_6',
      `<tns:GetIBData><tns:TableName>${table}</tns:TableName></tns:GetIBData>`
    );
    const hasFault = res.body.includes('Fault');
    const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log(`  "${table}": ${hasFault ? '❌ ' + faultStr.trim().substring(0, 200) : '✅'} (HTTP ${res.status})`);
    if (!hasFault) {
      const returnVal = res.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
      console.log('    Response:', decodeHtml(returnVal).substring(0, 500));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 4. CreateExchangeNode (Exchange_3_0_2_1) with Zone
  // WSDL: ExchangePlanName(string), NodeId(string), FileId(string), Zone(integer)
  // ═══════════════════════════════════════════════════════════
  console.log('\n=== 4. CreateExchangeNode with correct WSDL params ===\n');
  console.log('WSDL says: ExchangePlanName, NodeId, FileId, Zone\n');
  
  const ceFormats = [
    {
      name: 'NodeId=LENSFLOW, FileId=empty, Zone=0',
      body: `<tns:CreateExchangeNode>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeId>LENSFLOW</tns:NodeId>
        <tns:FileId></tns:FileId>
        <tns:Zone>0</tns:Zone>
      </tns:CreateExchangeNode>`,
    },
    {
      name: 'NodeId=LENSFLOW, FileId=LENSFLOW, Zone=0',
      body: `<tns:CreateExchangeNode>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeId>LENSFLOW</tns:NodeId>
        <tns:FileId>LENSFLOW</tns:FileId>
        <tns:Zone>0</tns:Zone>
      </tns:CreateExchangeNode>`,
    },
    {
      name: 'NodeId=LENSFLOW, FileId=empty, Zone=-1',
      body: `<tns:CreateExchangeNode>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeId>LENSFLOW</tns:NodeId>
        <tns:FileId></tns:FileId>
        <tns:Zone>-1</tns:Zone>
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
    console.log(`  ${fmt.name}:`);
    console.log(`    ${hasFault ? '❌ ' + faultStr.trim().substring(0, 300) : '✅'} (HTTP ${res.status})`);
    if (!hasFault) console.log('    Response:', res.body.substring(0, 500));
    console.log();
  }

  // ═══════════════════════════════════════════════════════════
  // 5. DownloadData (Exchange_3_0_2_1) with Zone
  // WSDL: ExchangePlanName, NodeCode, FileID, ContinuousOperation(bool), Operation(string), ContinuousOperationAllowed(bool), Zone(integer)
  // ═══════════════════════════════════════════════════════════
  console.log('\n=== 5. DownloadData with Zone ===\n');
  
  const dlRes = await soapCall(
    'Exchange_3_0_2_1',
    'http://www.1c.ru/SSL/Exchange_3_0_2_1',
    `<tns:DownloadData>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:FileID xsi:nil="true"/>
      <tns:ContinuousOperation>false</tns:ContinuousOperation>
      <tns:Operation xsi:nil="true"/>
      <tns:ContinuousOperationAllowed>false</tns:ContinuousOperationAllowed>
      <tns:Zone>0</tns:Zone>
    </tns:DownloadData>`
  );
  const dlFault = dlRes.body.includes('Fault');
  const dlFaultStr = dlRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
  console.log(`  ${dlFault ? '❌ ' + dlFaultStr.trim().substring(0, 300) : '✅'} (HTTP ${dlRes.status})`);
  if (!dlFault) console.log('  Response:', dlRes.body.substring(0, 1000));

  // ═══════════════════════════════════════════════════════════
  // 6. DataExchange.Test - get full response
  // ═══════════════════════════════════════════════════════════
  console.log('\n=== 6. DataExchange.Test full response ===\n');
  const testRes = await soapCall('DataExchange', 'DataExchange', '<tns:Test/>');
  if (!testRes.body.includes('Fault')) {
    const returnVal = testRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    console.log('Test response (decoded):');
    console.log(decodeHtml(returnVal));
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
