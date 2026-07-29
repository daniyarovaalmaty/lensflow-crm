/**
 * Alternative approach: use DataExchange custom service + GetIBData to extract actual data
 * Instead of trying to create exchange node, directly extract data we need
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

// Parse a ValueTable XML to array of objects
function parseValueTable(xml) {
  const columns = [];
  const colMatches = xml.matchAll(/<column>\s*<Name>(.*?)<\/Name>/g);
  for (const m of colMatches) columns.push(m[1]);
  
  const rows = [];
  const rowMatches = xml.matchAll(/<row>([\s\S]*?)<\/row>/g);
  for (const rm of rowMatches) {
    const values = [];
    const valMatches = rm[1].matchAll(/<Value[^>]*>([\s\S]*?)<\/Value>/g);
    for (const vm of valMatches) values.push(vm[1]);
    const obj = {};
    columns.forEach((col, i) => obj[col] = values[i] || '');
    rows.push(obj);
  }
  return { columns, rows };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  DATA EXTRACTION VIA DataExchange & GetIBData          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. DataExchange custom service - discover all available methods
  console.log('=== 1. DataExchange WSDL - all operations ===\n');
  const wsdlRes = await new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/ws/DataExchange?wsdl`);
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
  
  // Extract all operation names
  const ops = [...wsdlRes.matchAll(/name="(\w+)"\s*>/g)].map(m => m[1]);
  const uniqueOps = [...new Set(ops)].filter(n => !n.includes('Response') && !n.includes('Binding') && !n.includes('Service') && !n.includes('Port'));
  console.log('Available operations:', uniqueOps);
  
  // Also get all element definitions
  const elements = [...wsdlRes.matchAll(/<xs:element\s+name="(\w+)"[\s\S]*?<\/xs:element>/g)];
  console.log('\nWSDL operations with parameters:');
  for (const el of elements) {
    if (el[1].includes('Response')) continue;
    const params = [...el[0].matchAll(/name="(\w+)"\s+type="([^"]+)"/g)].map(p => `${p[1]}(${p[2]})`);
    console.log(`  ${el[1]}: ${params.join(', ')}`);
  }

  // 2. GiveAllDocs - get actual document data
  console.log('\n\n=== 2. GiveAllDocs ===\n');
  const docsRes = await soapCall('DataExchange', 'DataExchange', '<tns:GiveAllDocs/>');
  if (!docsRes.body.includes('Fault')) {
    const returnVal = docsRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    const decoded = decodeHtml(returnVal);
    const table = parseValueTable(decoded);
    console.log(`Columns: ${table.columns.join(', ')}`);
    console.log(`Total rows: ${table.rows.length}`);
    if (table.rows.length > 0) {
      console.log('\nFirst 10 rows:');
      for (const row of table.rows.slice(0, 10)) {
        console.log(`  ${JSON.stringify(row)}`);
      }
    }
  }

  // 3. GiveAllTAC - get acts
  console.log('\n\n=== 3. GiveAllTAC ===\n');
  const tacRes = await soapCall('DataExchange', 'DataExchange', '<tns:GiveAllTAC/>');
  if (!tacRes.body.includes('Fault')) {
    const returnVal = tacRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    const decoded = decodeHtml(returnVal);
    const table = parseValueTable(decoded);
    console.log(`Columns: ${table.columns.join(', ')}`);
    console.log(`Total rows: ${table.rows.length}`);
    if (table.rows.length > 0) {
      console.log('\nFirst 10 rows:');
      for (const row of table.rows.slice(0, 10)) {
        console.log(`  ${JSON.stringify(row)}`);
      }
    }
  }

  // 4. DataTransfer - try to get data with different structures
  console.log('\n\n=== 4. DataTransfer attempts ===\n');
  
  // Try DataTransfer with a minimal structure
  const dtFormats = [
    {
      name: 'Empty structure',
      body: '<tns:DataTransfer><tns:SerializedDataStructure></tns:SerializedDataStructure></tns:DataTransfer>',
    },
    {
      name: 'Structure with table name',
      body: `<tns:DataTransfer><tns:SerializedDataStructure>&lt;Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"&gt;&lt;Property name="TableName"&gt;&lt;Value xsi:type="xs:string"&gt;Справочник.Контрагенты&lt;/Value&gt;&lt;/Property&gt;&lt;/Structure&gt;</tns:SerializedDataStructure></tns:DataTransfer>`,
    },
    {
      name: 'Structure with ИмяТаблицы',
      body: `<tns:DataTransfer><tns:SerializedDataStructure>&lt;Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"&gt;&lt;Property name="ИмяТаблицы"&gt;&lt;Value xsi:type="xs:string"&gt;Справочник.Контрагенты&lt;/Value&gt;&lt;/Property&gt;&lt;/Structure&gt;</tns:SerializedDataStructure></tns:DataTransfer>`,
    },
    {
      name: 'ValueTable as structure',
      body: `<tns:DataTransfer><tns:SerializedDataStructure>&lt;ValueTable xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"&gt;&lt;column&gt;&lt;Name&gt;TableName&lt;/Name&gt;&lt;ValueType&gt;&lt;Type&gt;xs:string&lt;/Type&gt;&lt;/ValueType&gt;&lt;/column&gt;&lt;row&gt;&lt;Value xsi:type="xs:string"&gt;Справочник.Контрагенты&lt;/Value&gt;&lt;/row&gt;&lt;/ValueTable&gt;</tns:SerializedDataStructure></tns:DataTransfer>`,
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
      console.log('  First 1000 chars:', decoded.substring(0, 1000));
    }
    console.log();
  }

  // 5. GetIBData - get metadata for key tables
  console.log('\n=== 5. GetIBData - metadata for key tables ===\n');
  const tables = [
    'Справочник.Контрагенты',
    'Справочник.Номенклатура',
    'Справочник.Организации',
    'Документ.РеализацияТоваровУслуг',
    'Документ.СчетФактураВыданный',
    'Документ.ПоступлениеТоваровУслуг',
    'Документ.ЗаказКлиента',
    'РегистрСведений.ЦеныНоменклатуры',
    'Справочник.ДоговорыКонтрагентов',
  ];

  for (const table of tables) {
    const res = await soapCall(
      'Exchange_2_0_1_6',
      'http://www.1c.ru/SSL/Exchange_2_0_1_6',
      `<tns:GetIBData><tns:TableName>${table}</tns:TableName></tns:GetIBData>`
    );
    const hasFault = res.body.includes('Fault');
    if (hasFault) {
      const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
      console.log(`  ${table}: ❌ ${faultStr.trim().substring(0, 150)}`);
    } else {
      console.log(`  ${table}: ✅`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
