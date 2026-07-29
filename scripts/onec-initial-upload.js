/**
 * Send initial exchange message from LensFlow CRM to 1C
 * Upload a minimal EnterpriseData message to complete setup
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
  const nodeCode = 'LF';

  console.log('=== Sending initial exchange message from LensFlow CRM ===\n');

  // Build minimal EnterpriseData exchange message
  // Format: v8 message wrapper + EnterpriseData body
  const exchangeMessage = 
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Message xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.6"\n' +
    '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' +
    '  xmlns:v8="http://v8.1c.ru/8.1/data/core"\n' +
    '  FormatVersion="1.6">\n' +
    '  <Header>\n' +
    '    <Prefix>LF</Prefix>\n' +
    '  </Header>\n' +
    '  <Body/>\n' +
    '</Message>';

  // Also try the v8msg format
  const v8Message = 
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<v8msg:Message xmlns:v8msg="http://v8.1c.ru/messages" xmlns:v8="http://v8.1c.ru/8.1/data/core">\n' +
    '  <v8msg:Header>\n' +
    '    <v8msg:ExchangePlan>' + plan + '</v8msg:ExchangePlan>\n' +
    '    <v8msg:To>БК</v8msg:To>\n' +
    '    <v8msg:From>LF</v8msg:From>\n' +
    '    <v8msg:MessageNo>1</v8msg:MessageNo>\n' +
    '    <v8msg:ReceivedNo>0</v8msg:ReceivedNo>\n' +
    '  </v8msg:Header>\n' +
    '  <v8msg:Body>\n' +
    '    <EnterpriseData xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.6"\n' +
    '      FormatVersion="1.6"/>\n' +
    '  </v8msg:Body>\n' +
    '</v8msg:Message>';

  // Base64 encode both
  const b64Simple = Buffer.from(exchangeMessage, 'utf8').toString('base64');
  const b64V8 = Buffer.from(v8Message, 'utf8').toString('base64');

  // 1. Try Upload with base64 encoded Data (ValueStorage)
  console.log('--- 1. Upload with simple EnterpriseData message ---');
  const up1 = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:Upload>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:Data>${b64Simple}</tns:Data>
      <tns:Zone>0</tns:Zone>
    </tns:Upload>`
  );
  console.log('HTTP:', up1.status);
  if (up1.body.includes('Fault')) {
    const fault = (up1.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log('❌', fault.substring(0, 800));
  } else {
    console.log('✅ Response:', up1.body.substring(0, 1000));
  }

  // 2. Try with v8msg format
  console.log('\n--- 2. Upload with v8msg:Message format ---');
  const up2 = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:Upload>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:Data>${b64V8}</tns:Data>
      <tns:Zone>0</tns:Zone>
    </tns:Upload>`
  );
  console.log('HTTP:', up2.status);
  if (up2.body.includes('Fault')) {
    const fault = (up2.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log('❌', fault.substring(0, 800));
  } else {
    console.log('✅ Response:', up2.body.substring(0, 1000));
  }

  // 3. Try UploadData (file-based) with FileID
  console.log('\n--- 3. PutFileIntoStorage + UploadData ---');
  // First store the file
  const putRes = await soapCall('Exchange_2_0_1_6',
    'http://www.1c.ru/SSL/Exchange_2_0_1_6',
    `<tns:PutFileIntoStorage>
      <tns:FileName>exchange_message.xml</tns:FileName>
      <tns:FileId>00000000-0000-0000-0000-000000000000</tns:FileId>
    </tns:PutFileIntoStorage>`
  );
  console.log('PutFile HTTP:', putRes.status);
  if (putRes.body.includes('Fault')) {
    const fault = (putRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log('❌', fault.substring(0, 300));
  } else {
    console.log('✅', putRes.body.substring(0, 500));
  }

  // 4. Try RegisterOnlyCatalogData to register changes for download
  console.log('\n--- 4. RegisterOnlyCatalogData ---');
  const regRes = await soapCall('Exchange_2_0_1_6',
    'http://www.1c.ru/SSL/Exchange_2_0_1_6',
    `<tns:RegisterOnlyCatalogData>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:ContinuousOperation>false</tns:ContinuousOperation>
    </tns:RegisterOnlyCatalogData>`
  );
  console.log('HTTP:', regRes.status);
  if (regRes.body.includes('Fault')) {
    const fault = (regRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log('❌', fault.substring(0, 500));
  } else {
    console.log('✅ Response:', regRes.body.substring(0, 500));
  }

  // 5. Try UpdateExchange to mark as completed
  console.log('\n--- 5. UpdateExchange ---');
  const ueRes = await soapCall('Exchange_2_0_1_6',
    'http://www.1c.ru/SSL/Exchange_2_0_1_6',
    `<tns:UpdateExchange>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:AdditionalSettings>
        <xs1:Property name="НастройкаСинхронизацииДанныхЗавершена">
          <xs1:Value xsi:type="xsd:boolean">true</xs1:Value>
        </xs1:Property>
      </tns:AdditionalSettings>
    </tns:UpdateExchange>`
  );
  console.log('HTTP:', ueRes.status);
  if (ueRes.body.includes('Fault')) {
    const fault = (ueRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log('❌', fault.substring(0, 500));
  } else {
    console.log('✅ Response:', ueRes.body.substring(0, 500));
  }

  // 6. Check TestConnection again
  console.log('\n--- 6. TestConnection ---');
  const tcRes = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:TestConnection>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:Result xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:TestConnection>`
  );
  const returnVal = tcRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
  const resultVal = tcRes.body.match(/<m:Result[^>]*>([\s\S]*?)<\/m:Result>/)?.[1] || '';
  console.log('return:', returnVal);
  console.log('Result:', resultVal || '(empty - good!)');

  // 7. Try Upload again after UpdateExchange
  console.log('\n--- 7. Upload retry ---');
  const up3 = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:Upload>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:Data>${b64V8}</tns:Data>
      <tns:Zone>0</tns:Zone>
    </tns:Upload>`
  );
  console.log('HTTP:', up3.status);
  if (up3.body.includes('Fault')) {
    const fault = (up3.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log('❌', fault.substring(0, 800));
  } else {
    console.log('✅ SUCCESS! Response:', up3.body.substring(0, 1000));
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
