/**
 * Fix CreateExchange with CORRECT WSDL parameters:
 *   ExchangePlanName (string), Parameters (string), FilterSettings (Structure), AdditionalSettings (Structure)
 * 
 * Also try CreateExchangeNode from Exchange_3_0_2_1 with its correct WSDL params
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
        'SOAPAction': soapAction || '',
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

async function main() {
  console.log('\n=== STEP 1: Get Exchange_3_0_2_1 WSDL - CreateExchangeNode params ===\n');
  
  const wsdl3 = await fetchUrl('/ws/Exchange_3_0_2_1?wsdl');
  // Find CreateExchangeNode definition
  const ceNode = wsdl3.body.match(/CreateExchangeNode[\s\S]{0,2000}/);
  if (ceNode) {
    console.log('CreateExchangeNode WSDL context:');
    console.log(ceNode[0].substring(0, 1500));
  }

  // Find TestConnection definition  
  const tc = wsdl3.body.match(/name="TestConnection"[\s\S]{0,2000}/);
  if (tc) {
    console.log('\nTestConnection WSDL context:');
    console.log(tc[0].substring(0, 1000));
  }

  // Find GetIBParameters definition
  const ibp = wsdl3.body.match(/name="GetIBParameters"[\s\S]{0,1500}/);
  if (ibp) {
    console.log('\nGetIBParameters WSDL context:');
    console.log(ibp[0].substring(0, 1000));
  }

  // Find Download and DownloadData
  const dl = wsdl3.body.match(/name="Download"[\s\S]{0,1000}/);
  if (dl) {
    console.log('\nDownload WSDL context:');
    console.log(dl[0].substring(0, 500));
  }
  
  const dld = wsdl3.body.match(/name="DownloadData"[\s\S]{0,1500}/);
  if (dld) {
    console.log('\nDownloadData WSDL context:');
    console.log(dld[0].substring(0, 800));
  }

  console.log('\n\n=== STEP 2: Fix CreateExchange (Exchange_2_0_1_6) with correct params ===\n');
  
  // According to WSDL: ExchangePlanName (string), Parameters (string), FilterSettings (Structure), AdditionalSettings (Structure)
  const plan = 'СинхронизацияДанныхЧерезУниверсальныйФормат';
  
  const formats = [
    {
      name: 'Correct WSDL format: Parameters as JSON string',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:Parameters>{"NodeCode":"LENSFLOW","NodeDescription":"LensFlow CRM"}</tns:Parameters>
        <tns:FilterSettings><xs1:Property name="empty"><xs1:Value xsi:type="xsd:string"></xs1:Value></xs1:Property></tns:FilterSettings>
        <tns:AdditionalSettings><xs1:Property name="empty"><xs1:Value xsi:type="xsd:string"></xs1:Value></xs1:Property></tns:AdditionalSettings>
      </tns:CreateExchange>`,
    },
    {
      name: 'Parameters as XML string',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:Parameters>&lt;Structure&gt;&lt;Property name="КодУзла"&gt;&lt;Value&gt;LENSFLOW&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="НаименованиеУзла"&gt;&lt;Value&gt;LensFlow CRM&lt;/Value&gt;&lt;/Property&gt;&lt;/Structure&gt;</tns:Parameters>
        <tns:FilterSettings/>
        <tns:AdditionalSettings/>
      </tns:CreateExchange>`,
    },
    {
      name: 'Parameters as simple string (NodeCode)',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:Parameters>LENSFLOW</tns:Parameters>
        <tns:FilterSettings/>
        <tns:AdditionalSettings/>
      </tns:CreateExchange>`,
    },
    {
      name: 'Empty Parameters and Settings',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:Parameters></tns:Parameters>
        <tns:FilterSettings xsi:nil="true"/>
        <tns:AdditionalSettings xsi:nil="true"/>
      </tns:CreateExchange>`,
    },
    {
      name: 'Parameters as Structure XML',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:Parameters xsi:type="xsd:string">LENSFLOW;LensFlow CRM</tns:Parameters>
        <tns:FilterSettings>
          <xs1:Property name="ВсеДокументы">
            <xs1:Value xsi:type="xsd:boolean">true</xs1:Value>
          </xs1:Property>
        </tns:FilterSettings>
        <tns:AdditionalSettings>
          <xs1:Property name="ФорматОбмена">
            <xs1:Value xsi:type="xsd:string">UniversalFormat</xs1:Value>
          </xs1:Property>
        </tns:AdditionalSettings>
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
    console.log(`  ${fmt.name}:`);
    console.log(`    ${hasFault ? '❌ ' + faultStr.trim() : '✅ SUCCESS'} (HTTP ${res.status})`);
    if (!hasFault) {
      console.log('    Response:', res.body.substring(0, 500));
    }
    console.log();
  }

  console.log('\n=== STEP 3: Exchange_3_0_2_1 - TestConnection & GetIBParameters with correct params ===\n');

  // Need to look at WSDL to determine correct params
  // TestConnection typically needs: ExchangePlanName, NodeCode, Result
  // GetIBParameters typically needs: ExchangePlanName, NodeCode, ErrorMessage
  
  // Let's try different combinations
  const tcFormats = [
    {
      name: 'ExchangePlanName + NodeCode + Result',
      body: `<tns:TestConnection>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:Result></tns:Result>
      </tns:TestConnection>`,
    },
    {
      name: 'With all Exchange_3_0_2_1 typical params',
      body: `<tns:TestConnection>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:ErrorMessage></tns:ErrorMessage>
      </tns:TestConnection>`,
    },
    {
      name: 'ExchangePlanName + NodeCode + ErrorMessage + Result',
      body: `<tns:TestConnection>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:ErrorMessage></tns:ErrorMessage>
        <tns:Result></tns:Result>
      </tns:TestConnection>`,
    },
  ];

  for (const fmt of tcFormats) {
    const res = await soapCall(
      'Exchange_3_0_2_1',
      'http://www.1c.ru/SSL/Exchange_3_0_2_1',
      fmt.body
    );
    const hasFault = res.body.includes('Fault');
    const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log(`  ${fmt.name}:`);
    console.log(`    ${hasFault ? '❌ ' + faultStr.trim().substring(0, 200) : '✅ SUCCESS'} (HTTP ${res.status})`);
    if (!hasFault) console.log('    Response:', res.body.substring(0, 500));
    console.log();
  }

  // GetIBParameters
  console.log('--- GetIBParameters ---');
  const ibFormats = [
    {
      name: 'ExchangePlanName + NodeCode + ErrorMessage',
      body: `<tns:GetIBParameters>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
        <tns:ErrorMessage></tns:ErrorMessage>
      </tns:GetIBParameters>`,
    },
    {
      name: 'Just ExchangePlanName + NodeCode',
      body: `<tns:GetIBParameters>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
      </tns:GetIBParameters>`,
    },
  ];

  for (const fmt of ibFormats) {
    const res = await soapCall(
      'Exchange_3_0_2_1',
      'http://www.1c.ru/SSL/Exchange_3_0_2_1',
      fmt.body
    );
    const hasFault = res.body.includes('Fault');
    const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log(`  ${fmt.name}:`);
    console.log(`    ${hasFault ? '❌ ' + faultStr.trim().substring(0, 200) : '✅ SUCCESS'} (HTTP ${res.status})`);
    if (!hasFault) console.log('    Response:', res.body.substring(0, 500));
    console.log();
  }

  // === STEP 4: Try Exchange_2_0_1_6 GetIBData with CORRECT WSDL params
  console.log('\n=== STEP 4: Exchange_2_0_1_6 GetIBData with WSDL-correct params ===\n');
  
  // GetIBData WSDL schema - need to look it up
  const wsdl2 = await fetchUrl('/ws/Exchange_2_0_1_6?wsdl');
  const gibdCtx = wsdl2.body.match(/name="GetIBData"[\s\S]{0,1500}/);
  if (gibdCtx) {
    console.log('GetIBData WSDL context:');
    console.log(gibdCtx[0].substring(0, 800));
  }
  
  const gibdFormats = [
    {
      name: 'ExchangePlanName + NodeCode',
      body: `<tns:GetIBData>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>LENSFLOW</tns:NodeCode>
      </tns:GetIBData>`,
    },
    {
      name: 'Just ExchangePlanName',
      body: `<tns:GetIBData>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      </tns:GetIBData>`,
    },
  ];

  for (const fmt of gibdFormats) {
    const res = await soapCall(
      'Exchange_2_0_1_6',
      'http://www.1c.ru/SSL/Exchange_2_0_1_6',
      fmt.body
    );
    const hasFault = res.body.includes('Fault');
    const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log(`  ${fmt.name}:`);
    console.log(`    ${hasFault ? '❌ ' + faultStr.trim().substring(0, 200) : '✅ SUCCESS'} (HTTP ${res.status})`);
    if (!hasFault) console.log('    Response:', res.body.substring(0, 500));
    console.log();
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
