/**
 * TEST: Node LensFlow CRM was created in 1C!
 * Check if TestConnection now returns true and if Download works
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

async function main() {
  const plan = 'СинхронизацияДанныхЧерезУниверсальныйФормат';
  const ns3 = 'http://www.1c.ru/SSL/Exchange_3_0_2_1';

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  NODE CREATED - TESTING EXCHANGE OPERATIONS            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Need to find the correct NodeCode - it might not be "LENSFLOW"
  // The node was created via the wizard, so the code is auto-generated
  // Let's try different codes

  const nodeCodes = ['LF', 'LF000001', 'LENSFLOW', 'LF00001', 'LF0001', 'LF001', 'LF01', 'LF1'];

  // 1. TestConnection with different node codes
  console.log('=== 1. TestConnection - finding correct NodeCode ===\n');
  
  for (const code of nodeCodes) {
    const tcRes = await soapCall('Exchange_3_0_2_1', ns3,
      `<tns:TestConnection>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>${code}</tns:NodeCode>
        <tns:Result xsi:nil="true"/>
        <tns:Zone>0</tns:Zone>
      </tns:TestConnection>`
    );
    const returnVal = tcRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    const resultVal = tcRes.body.match(/<m:Result[^>]*>([\s\S]*?)<\/m:Result>/)?.[1] || '';
    const isTrue = returnVal === 'true';
    console.log(`  ${code}: return=${returnVal} ${isTrue ? '✅ FOUND!' : ''}`);
    if (resultVal && !isTrue) {
      console.log(`    Result: ${resultVal.substring(0, 200)}`);
    }
  }

  // 2. GetIBParameters to find node info
  console.log('\n\n=== 2. GetIBParameters (NodeCode=null, get all info) ===\n');
  const ibpRes = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:GetIBParameters>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode xsi:nil="true"/>
      <tns:ResultMessage xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:GetIBParameters>`
  );
  if (!ibpRes.body.includes('Fault')) {
    const returnVal = ibpRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    // Look for NodeCode or КодУзла in the response
    console.log('Response (first 3000):', returnVal.substring(0, 3000));
  }

  // 3. Try Upload with LF code
  console.log('\n\n=== 3. Upload test with LF code ===\n');
  const upRes = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:Upload>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LF</tns:NodeCode>
      <tns:Data xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:Upload>`
  );
  console.log('Upload HTTP:', upRes.status);
  if (upRes.body.includes('Fault')) {
    const fault = (upRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log('❌', fault.substring(0, 600));
  } else {
    console.log('✅ Response:', upRes.body.substring(0, 2000));
  }

  // 4. Try GetCommonNodsData to see if node appears in the list
  console.log('\n\n=== 4. GetCommonNodsData - check for new node ===\n');
  const nodsRes = await soapCall('Exchange_2_0_1_6',
    'http://www.1c.ru/SSL/Exchange_2_0_1_6',
    `<tns:GetCommonNodsData><tns:ExchangePlanName>${plan}</tns:ExchangePlanName></tns:GetCommonNodsData>`
  );
  if (!nodsRes.body.includes('Fault')) {
    const returnVal = nodsRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    console.log('Response:', returnVal.substring(0, 3000));
  }

  // 5. Try Exchange_2_0_1_6 TestConnection
  console.log('\n\n=== 5. Exchange_2_0_1_6 TestConnection ===\n');
  for (const code of ['LF', 'LF000001', 'LF00001']) {
    const tc2Res = await soapCall('Exchange_2_0_1_6',
      'http://www.1c.ru/SSL/Exchange_2_0_1_6',
      `<tns:TestConnection>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>${code}</tns:NodeCode>
        <tns:Result xsi:nil="true"/>
      </tns:TestConnection>`
    );
    const ret = tc2Res.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    const res = tc2Res.body.match(/<m:Result[^>]*>([\s\S]*?)<\/m:Result>/)?.[1] || '';
    console.log(`  ${code}: return=${ret} ${ret === 'true' ? '✅' : ''}`);
    if (res && ret !== 'true') console.log(`    ${res.substring(0, 150)}`);
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
