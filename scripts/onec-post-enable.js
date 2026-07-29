/**
 * Post-sync-enable test: Create exchange node and test connection
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

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  POST-ENABLE SYNC TEST                                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. TestConnection first — check if sync is now enabled
  console.log('=== 1. TestConnection ===\n');
  const tcRes = await soapCall(
    'Exchange_3_0_2_1',
    'http://www.1c.ru/SSL/Exchange_3_0_2_1',
    `<tns:TestConnection>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:Result xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:TestConnection>`
  );
  console.log('HTTP:', tcRes.status);
  console.log('Response:', tcRes.body);

  // 2. CreateExchange via Exchange_2_0_1_6
  console.log('\n\n=== 2. CreateExchange (Exchange_2_0_1_6) ===\n');
  
  const createFormats = [
    {
      name: 'Format A: Parameters=LENSFLOW, empty structures',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:Parameters>LENSFLOW</tns:Parameters>
        <tns:FilterSettings>
          <xs1:Property name="empty">
            <xs1:Value xsi:type="xsd:string"></xs1:Value>
          </xs1:Property>
        </tns:FilterSettings>
        <tns:AdditionalSettings>
          <xs1:Property name="empty">
            <xs1:Value xsi:type="xsd:string"></xs1:Value>
          </xs1:Property>
        </tns:AdditionalSettings>
      </tns:CreateExchange>`,
    },
    {
      name: 'Format B: Parameters as JSON with NodeCode and Description',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:Parameters>{"NodeCode":"LENSFLOW","NodeDescription":"LensFlow CRM"}</tns:Parameters>
        <tns:FilterSettings>
          <xs1:Property name="empty">
            <xs1:Value xsi:type="xsd:string"></xs1:Value>
          </xs1:Property>
        </tns:FilterSettings>
        <tns:AdditionalSettings>
          <xs1:Property name="empty">
            <xs1:Value xsi:type="xsd:string"></xs1:Value>
          </xs1:Property>
        </tns:AdditionalSettings>
      </tns:CreateExchange>`,
    },
    {
      name: 'Format C: Parameters as XML structure string',
      body: `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:Parameters>&lt;Structure xmlns="http://v8.1c.ru/8.1/data/core"&gt;&lt;Property name="КодУзла"&gt;&lt;Value&gt;LENSFLOW&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="НаименованиеУзла"&gt;&lt;Value&gt;LensFlow CRM&lt;/Value&gt;&lt;/Property&gt;&lt;/Structure&gt;</tns:Parameters>
        <tns:FilterSettings>
          <xs1:Property name="empty">
            <xs1:Value xsi:type="xsd:string"></xs1:Value>
          </xs1:Property>
        </tns:FilterSettings>
        <tns:AdditionalSettings>
          <xs1:Property name="empty">
            <xs1:Value xsi:type="xsd:string"></xs1:Value>
          </xs1:Property>
        </tns:AdditionalSettings>
      </tns:CreateExchange>`,
    },
  ];

  for (const fmt of createFormats) {
    console.log(`--- ${fmt.name} ---`);
    const res = await soapCall(
      'Exchange_2_0_1_6',
      'http://www.1c.ru/SSL/Exchange_2_0_1_6',
      fmt.body
    );
    const hasFault = res.body.includes('Fault');
    const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log(`  ${hasFault ? '❌ ' + faultStr.trim() : '✅ SUCCESS'} (HTTP ${res.status})`);
    if (!hasFault) {
      console.log('  Response:', res.body);
    }
    console.log();
  }

  // 3. CreateExchangeNode via Exchange_3_0_2_1
  console.log('\n=== 3. CreateExchangeNode (Exchange_3_0_2_1) ===\n');
  const ceRes = await soapCall(
    'Exchange_3_0_2_1',
    'http://www.1c.ru/SSL/Exchange_3_0_2_1',
    `<tns:CreateExchangeNode>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeId>LENSFLOW</tns:NodeId>
      <tns:FileId></tns:FileId>
      <tns:Zone>0</tns:Zone>
    </tns:CreateExchangeNode>`
  );
  console.log('HTTP:', ceRes.status);
  console.log('Response:', ceRes.body);

  // 4. RemoteAdmin CreateExchangeNode format
  console.log('\n\n=== 4. RemoteAdmin PrepareExchangeExecution ===\n');
  const prepRes = await soapCall(
    'RemoteAdministrationOfExchange_2_0_1_6',
    'http://www.1c.ru/SaaS/1.0/WS/RemoteAdministrationOfExchange_2_0_1_6',
    `<tns:PrepareExchangeExecution>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
    </tns:PrepareExchangeExecution>`
  );
  console.log('HTTP:', prepRes.status);
  const prepFault = prepRes.body.includes('Fault');
  console.log(prepFault ? '❌ ' + (prepRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '') : '✅');
  if (!prepFault) console.log('Response:', prepRes.body);

  // 5. Try GetIBParameters again
  console.log('\n\n=== 5. GetIBParameters (post-enable) ===\n');
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
  console.log('HTTP:', ibpRes.status);
  if (!ibpRes.body.includes('Fault')) {
    console.log('✅ Response:', ibpRes.body);
  } else {
    console.log('❌', ibpRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1]);
  }

  // 6. DownloadData attempt
  console.log('\n\n=== 6. DownloadData ===\n');
  const dlRes = await soapCall(
    'Exchange_3_0_2_1',
    'http://www.1c.ru/SSL/Exchange_3_0_2_1',
    `<tns:DownloadData>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:FileID></tns:FileID>
      <tns:ContinuousOperation>false</tns:ContinuousOperation>
      <tns:Operation xsi:nil="true"/>
      <tns:ContinuousOperationAllowed>false</tns:ContinuousOperationAllowed>
      <tns:Zone>0</tns:Zone>
    </tns:DownloadData>`
  );
  console.log('HTTP:', dlRes.status);
  if (!dlRes.body.includes('Fault')) {
    console.log('✅ Response:', dlRes.body.substring(0, 2000));
  } else {
    console.log('❌', dlRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1]);
  }

  // 7. DataExchange - GiveAllDocs (should still work)
  console.log('\n\n=== 7. DataExchange.GiveAllDocs ===\n');
  const docsRes = await soapCall('DataExchange', 'DataExchange', '<tns:GiveAllDocs/>');
  if (!docsRes.body.includes('Fault')) {
    const returnVal = docsRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    const decoded = decodeHtml(returnVal);
    console.log('✅ Response length:', decoded.length);
    console.log('First 3000 chars:', decoded.substring(0, 3000));
  } else {
    console.log('❌', docsRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1]);
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
