/**
 * Try to complete exchange setup and download data from 1C
 * RegisterAllData + DownloadData to bypass the "setup not completed" issue
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
  const ns2 = 'http://www.1c.ru/SSL/Exchange_2_0_1_6';
  const ns3 = 'http://www.1c.ru/SSL/Exchange_3_0_2_1';
  const nodeCode = 'LF';

  console.log('=== Completing setup + attempting data download ===\n');

  // 1. RegisterAllDataExceptCatalogs
  console.log('--- 1. RegisterAllDataExceptCatalogs ---');
  const regAll = await soapCall('Exchange_2_0_1_6', ns2,
    `<tns:RegisterAllDataExceptCatalogs>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:ContinuousOperation>false</tns:ContinuousOperation>
    </tns:RegisterAllDataExceptCatalogs>`
  );
  console.log('HTTP:', regAll.status);
  if (regAll.body.includes('Fault')) {
    console.log('❌', (regAll.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim().substring(0, 400));
  } else {
    console.log('✅ Success');
  }

  // 2. Try Download via Exchange_2_0_1_6 with Data param
  console.log('\n--- 2. Download via Exchange_2_0_1_6 ---');
  const dl2 = await soapCall('Exchange_2_0_1_6', ns2,
    `<tns:Download>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:Data xsi:nil="true"/>
    </tns:Download>`
  );
  console.log('HTTP:', dl2.status);
  if (dl2.body.includes('Fault')) {
    console.log('❌', (dl2.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim().substring(0, 600));
  } else {
    // Extract Data from response
    const dataVal = dl2.body.match(/<m:Data[^>]*>([\s\S]*?)<\/m:Data>/)?.[1] || '';
    if (dataVal) {
      // Decode base64
      const decoded = Buffer.from(dataVal, 'base64').toString('utf8');
      console.log('✅ Got data! Length:', decoded.length);
      console.log('First 3000 chars:', decoded.substring(0, 3000));
    } else {
      console.log('✅ Response (no data):', dl2.body.substring(0, 1000));
    }
  }

  // 3. Try DownloadData via Exchange_2_0_1_6  
  console.log('\n--- 3. DownloadData via Exchange_2_0_1_6 ---');
  const dd2 = await soapCall('Exchange_2_0_1_6', ns2,
    `<tns:DownloadData>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:FileID></tns:FileID>
      <tns:ContinuousOperation>false</tns:ContinuousOperation>
      <tns:Operation xsi:nil="true"/>
      <tns:ContinuousOperationAllowed>false</tns:ContinuousOperationAllowed>
    </tns:DownloadData>`
  );
  console.log('HTTP:', dd2.status);
  if (dd2.body.includes('Fault')) {
    console.log('❌', (dd2.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim().substring(0, 600));
  } else {
    // Check for FileID in response
    const fileId = dd2.body.match(/<m:FileID[^>]*>([\s\S]*?)<\/m:FileID>/)?.[1] || '';
    console.log('✅ FileID:', fileId || '(empty)');
    console.log('Response:', dd2.body.substring(0, 1000));
  }

  // 4. Try UpdateExchange with various completion flags
  console.log('\n--- 4. UpdateExchange with completion flags ---');
  const completionFlags = [
    'НастройкаЗавершена',
    'НачальнаяВыгрузкаВыполнена', 
    'ПервоначальнаяВыгрузкаВыполнена',
  ];
  
  for (const flag of completionFlags) {
    const ue = await soapCall('Exchange_2_0_1_6', ns2,
      `<tns:UpdateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:NodeCode>${nodeCode}</tns:NodeCode>
        <tns:AdditionalSettings>
          <xs1:Property name="${flag}">
            <xs1:Value xsi:type="xsd:boolean">true</xs1:Value>
          </xs1:Property>
        </tns:AdditionalSettings>
      </tns:UpdateExchange>`
    );
    const ok = !ue.body.includes('Fault');
    console.log(`  ${flag}: ${ok ? '✅' : '❌'}`);
  }

  // 5. Try Upload again
  console.log('\n--- 5. Upload retry after completion flags ---');
  const v8Message = 
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<v8msg:Message xmlns:v8msg="http://v8.1c.ru/messages">\n' +
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
  const b64 = Buffer.from(v8Message, 'utf8').toString('base64');
  
  const up = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:Upload>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:Data>${b64}</tns:Data>
      <tns:Zone>0</tns:Zone>
    </tns:Upload>`
  );
  console.log('HTTP:', up.status);
  if (up.body.includes('Fault')) {
    console.log('❌', (up.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim().substring(0, 600));
  } else {
    console.log('✅ SUCCESS!', up.body.substring(0, 1000));
  }

  // 6. Try Download again
  console.log('\n--- 6. Download retry ---');
  const dl3 = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:Download>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:Data xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:Download>`
  );
  console.log('HTTP:', dl3.status);
  if (dl3.body.includes('Fault')) {
    console.log('❌', (dl3.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim().substring(0, 600));
  } else {
    const data3 = dl3.body.match(/<m:Data[^>]*>([\s\S]*?)<\/m:Data>/)?.[1] || '';
    if (data3 && data3.length > 10) {
      const decoded3 = Buffer.from(data3, 'base64').toString('utf8');
      console.log('✅ Downloaded data! Length:', decoded3.length);
      console.log('First 5000:', decoded3.substring(0, 5000));
    } else {
      console.log('Response:', dl3.body.substring(0, 1000));
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
