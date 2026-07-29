/**
 * Try Download with proper Data format and DownloadData with UUID
 * Also try to write settings file via PutFilePart/SaveFileFromParts
 */
require('dotenv').config();
const https = require('https');
const crypto = require('crypto');

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
  const uuid = crypto.randomUUID();

  console.log('=== Download attempts with correct Data format ===\n');

  // 1. Download v2 with empty base64 (not nil)
  console.log('--- 1. Download v2 with empty base64 ---');
  const dl1 = await soapCall('Exchange_2_0_1_6', ns2,
    `<tns:Download>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:Data></tns:Data>
    </tns:Download>`
  );
  console.log('HTTP:', dl1.status);
  if (dl1.body.includes('Fault')) {
    console.log('❌', (dl1.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim().substring(0, 600));
  } else {
    const data = dl1.body.match(/<m:Data[^>]*>([\s\S]*?)<\/m:Data>/)?.[1] || '';
    if (data && data.length > 10) {
      const decoded = Buffer.from(data, 'base64').toString('utf8');
      console.log('✅ Data length:', decoded.length);
      console.log('First 5000:', decoded.substring(0, 5000));
    } else {
      console.log('Response:', dl1.body.substring(0, 1000));
    }
  }

  // 2. DownloadData v2 with proper UUID
  console.log('\n--- 2. DownloadData v2 with UUID ---');
  const dd2 = await soapCall('Exchange_2_0_1_6', ns2,
    `<tns:DownloadData>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:FileID>${uuid}</tns:FileID>
      <tns:ContinuousOperation>false</tns:ContinuousOperation>
      <tns:Operation xsi:nil="true"/>
      <tns:ContinuousOperationAllowed>false</tns:ContinuousOperationAllowed>
    </tns:DownloadData>`
  );
  console.log('HTTP:', dd2.status);
  if (dd2.body.includes('Fault')) {
    console.log('❌', (dd2.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim().substring(0, 600));
  } else {
    const fileId = dd2.body.match(/<m:FileID[^>]*>([\s\S]*?)<\/m:FileID>/)?.[1] || '';
    console.log('✅ FileID:', fileId);
    console.log('Response:', dd2.body.substring(0, 1500));
  }

  // 3. Try PutFilePart to upload settings response file
  console.log('\n--- 3. Upload settings file via PutFilePart ---');
  const transferId = crypto.randomUUID();
  
  // Build the settings response XML that 1C expects
  const settingsXml = 
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n' +
    '<Property name="ВерсияФорматаНастроекОбменаДанными"><Value xsi:type="xs:string">1.2</Value></Property>\n' +
    '<Property name="ИмяПланаОбмена"><Value xsi:type="xs:string">' + plan + '</Value></Property>\n' +
    '<Property name="КодУзла"><Value xsi:type="xs:string">LF</Value></Property>\n' +
    '<Property name="НаименованиеУзла"><Value xsi:type="xs:string">LensFlow CRM</Value></Property>\n' +
    '<Property name="ПрефиксИнформационнойБазы"><Value xsi:type="xs:string">LF</Value></Property>\n' +
    '<Property name="ФорматОбмена"><Value xsi:type="xs:string">http://v8.1c.ru/edi/edi_stnd/EnterpriseData</Value></Property>\n' +
    '<Property name="ВерсияФорматаОбмена"><Value xsi:type="xs:string">1.6</Value></Property>\n' +
    '<Property name="ПоддерживаемыеОбъектыФормата"><Value xsi:type="ValueTable"><column><Name>Версия</Name><ValueType><Type>xs:string</Type></ValueType></column><column><Name>Объект</Name><ValueType><Type>xs:string</Type></ValueType></column><column><Name>Отправка</Name><ValueType><Type>xs:boolean</Type></ValueType></column><column><Name>Получение</Name><ValueType><Type>xs:boolean</Type></ValueType></column></Value></Property>\n' +
    '</Structure>';

  const partData = Buffer.from(settingsXml, 'utf8').toString('base64');
  
  const putPart = await soapCall('Exchange_2_0_1_6', ns2,
    `<tns:PutFilePart>
      <tns:TransferId>${transferId}</tns:TransferId>
      <tns:PartNumber>1</tns:PartNumber>
      <tns:PartData>${partData}</tns:PartData>
    </tns:PutFilePart>`
  );
  console.log('PutFilePart HTTP:', putPart.status);
  if (putPart.body.includes('Fault')) {
    console.log('❌', (putPart.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim().substring(0, 300));
  } else {
    console.log('✅ Part uploaded');
    
    // Save from parts
    const saveParts = await soapCall('Exchange_2_0_1_6', ns2,
      `<tns:SaveFileFromParts>
        <tns:TransferId>${transferId}</tns:TransferId>
        <tns:PartQuantity>1</tns:PartQuantity>
        <tns:FileId>${uuid}</tns:FileId>
      </tns:SaveFileFromParts>`
    );
    console.log('SaveFileFromParts HTTP:', saveParts.status);
    if (saveParts.body.includes('Fault')) {
      console.log('❌', (saveParts.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim().substring(0, 300));
    } else {
      console.log('✅ File saved! FileId:', uuid);
      
      // Now try UploadData with this FileID
      console.log('\n--- 4. UploadData with saved file ---');
      const upd = await soapCall('Exchange_2_0_1_6', ns2,
        `<tns:UploadData>
          <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
          <tns:NodeCode>${nodeCode}</tns:NodeCode>
          <tns:FileID>${uuid}</tns:FileID>
          <tns:ContinuousOperation>false</tns:ContinuousOperation>
          <tns:Operation xsi:nil="true"/>
          <tns:ContinuousOperationAllowed>false</tns:ContinuousOperationAllowed>
        </tns:UploadData>`
      );
      console.log('UploadData HTTP:', upd.status);
      if (upd.body.includes('Fault')) {
        console.log('❌', (upd.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim().substring(0, 600));
      } else {
        console.log('✅ UploadData success:', upd.body.substring(0, 1000));
      }
    }
  }

  // 5. Download v3 with empty Data
  console.log('\n--- 5. Download v3 with empty Data ---');
  const dl3 = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:Download>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>${nodeCode}</tns:NodeCode>
      <tns:Data></tns:Data>
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
      console.log('✅ Downloaded! Length:', decoded3.length);
      console.log('First 5000:', decoded3.substring(0, 5000));
    } else {
      console.log('Response:', dl3.body.substring(0, 1000));
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
