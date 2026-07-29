/**
 * CORRECT WSDL-based calls for Exchange_3_0_2_1
 * Download: ExchangePlanName, NodeCode, Data(ValueStorage nillable), Zone
 * Upload: ExchangePlanName, NodeCode, Data(ValueStorage), Zone
 * CreateExchangeNode: Parameters(Structure), Zone
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
  console.log('║  CORRECT WSDL CALLS - Exchange_3_0_2_1                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // === 1. CreateExchangeNode with Structure Parameters ===
  console.log('=== 1. CreateExchangeNode (Parameters=Structure, Zone) ===\n');

  const createFormats = [
    {
      name: 'Minimal Structure with ExchangePlanName + NodeCode',
      body: `<tns:CreateExchangeNode>
        <tns:Parameters>
          <xs1:Property name="ИмяПланаОбмена">
            <xs1:Value xsi:type="xsd:string">${plan}</xs1:Value>
          </xs1:Property>
          <xs1:Property name="КодУзла">
            <xs1:Value xsi:type="xsd:string">LENSFLOW</xs1:Value>
          </xs1:Property>
          <xs1:Property name="НаименованиеУзла">
            <xs1:Value xsi:type="xsd:string">LensFlow CRM</xs1:Value>
          </xs1:Property>
        </tns:Parameters>
        <tns:Zone>0</tns:Zone>
      </tns:CreateExchangeNode>`,
    },
    {
      name: 'With ПрефиксИнформационнойБазы',
      body: `<tns:CreateExchangeNode>
        <tns:Parameters>
          <xs1:Property name="ИмяПланаОбмена">
            <xs1:Value xsi:type="xsd:string">${plan}</xs1:Value>
          </xs1:Property>
          <xs1:Property name="КодУзла">
            <xs1:Value xsi:type="xsd:string">LENSFLOW</xs1:Value>
          </xs1:Property>
          <xs1:Property name="НаименованиеУзла">
            <xs1:Value xsi:type="xsd:string">LensFlow CRM</xs1:Value>
          </xs1:Property>
          <xs1:Property name="ПрефиксИнформационнойБазы">
            <xs1:Value xsi:type="xsd:string">LF</xs1:Value>
          </xs1:Property>
          <xs1:Property name="ФорматОбмена">
            <xs1:Value xsi:type="xsd:string">http://v8.1c.ru/edi/edi_stnd/EnterpriseData</xs1:Value>
          </xs1:Property>
          <xs1:Property name="ВерсияФорматаОбмена">
            <xs1:Value xsi:type="xsd:string">1.6</xs1:Value>
          </xs1:Property>
        </tns:Parameters>
        <tns:Zone>0</tns:Zone>
      </tns:CreateExchangeNode>`,
    },
    {
      name: 'With ExchangePlanName (English)',
      body: `<tns:CreateExchangeNode>
        <tns:Parameters>
          <xs1:Property name="ExchangePlanName">
            <xs1:Value xsi:type="xsd:string">${plan}</xs1:Value>
          </xs1:Property>
          <xs1:Property name="NodeCode">
            <xs1:Value xsi:type="xsd:string">LENSFLOW</xs1:Value>
          </xs1:Property>
          <xs1:Property name="NodeDescription">
            <xs1:Value xsi:type="xsd:string">LensFlow CRM</xs1:Value>
          </xs1:Property>
          <xs1:Property name="Prefix">
            <xs1:Value xsi:type="xsd:string">LF</xs1:Value>
          </xs1:Property>
        </tns:Parameters>
        <tns:Zone>0</tns:Zone>
      </tns:CreateExchangeNode>`,
    },
  ];

  for (const fmt of createFormats) {
    console.log(`--- ${fmt.name} ---`);
    const res = await soapCall('Exchange_3_0_2_1', ns3, fmt.body);
    console.log(`HTTP: ${res.status}`);
    if (res.body.includes('Fault')) {
      const fault = (res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
      console.log(`❌ ${fault.substring(0, 600)}`);
    } else {
      console.log(`✅ Response: ${res.body.substring(0, 1000)}`);
    }
    console.log();
  }

  // === 2. Download with correct params (Data=ValueStorage, nillable) ===
  console.log('\n=== 2. Download (ExchangePlanName, NodeCode, Data, Zone) ===\n');
  const dlRes = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:Download>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:Data xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:Download>`
  );
  console.log('HTTP:', dlRes.status);
  if (dlRes.body.includes('Fault')) {
    const fault = (dlRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log(`❌ ${fault.substring(0, 600)}`);
  } else {
    console.log('✅ Response (first 2000):', dlRes.body.substring(0, 2000));
  }

  // === 3. Upload with correct params ===
  console.log('\n\n=== 3. Upload (ExchangePlanName, NodeCode, Data, Zone) ===\n');
  const upRes = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:Upload>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:Data xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:Upload>`
  );
  console.log('HTTP:', upRes.status);
  if (upRes.body.includes('Fault')) {
    const fault = (upRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log(`❌ ${fault.substring(0, 600)}`);
  } else {
    console.log('✅ Response (first 2000):', upRes.body.substring(0, 2000));
  }

  // === 4. DownloadData with correct params ===
  console.log('\n\n=== 4. DownloadData (ExchangePlanName, NodeCode, FileID, ContinuousOperation, Operation, ContinuousOperationAllowed, Zone) ===\n');
  const ddRes = await soapCall('Exchange_3_0_2_1', ns3,
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
  console.log('HTTP:', ddRes.status);
  if (ddRes.body.includes('Fault')) {
    const fault = (ddRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log(`❌ ${fault.substring(0, 600)}`);
  } else {
    console.log('✅ Response:', ddRes.body.substring(0, 2000));
  }

  // === 5. Exchange_2_0_1_6 Upload/Download with Data param ===
  console.log('\n\n=== 5. Exchange_2_0_1_6 Upload/Download (with Data) ===\n');
  const ns2 = 'http://www.1c.ru/SSL/Exchange_2_0_1_6';

  // WSDL for 2.0.1.6 says: ExchangePlanName, NodeCode, Data(ValueStorage)
  console.log('--- Download v2 ---');
  const dl2Res = await soapCall('Exchange_2_0_1_6', ns2,
    `<tns:Download>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:Data xsi:nil="true"/>
    </tns:Download>`
  );
  console.log('HTTP:', dl2Res.status);
  if (dl2Res.body.includes('Fault')) {
    const fault = (dl2Res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
    console.log(`❌ ${fault.substring(0, 600)}`);
  } else {
    console.log('✅ Response:', dl2Res.body.substring(0, 2000));
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
