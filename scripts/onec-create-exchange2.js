/**
 * CreateExchange - fix Parameters XML structure format
 * Error says: "Поле объекта не обнаружено (ИмяПланаОбмена)" 
 * This means the XML is being parsed but the Structure doesn't have the field
 * Try different XML structure formats
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

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function main() {
  const plan = 'СинхронизацияДанныхЧерезУниверсальныйФормат';

  // The key insight: CreateExchange Parameters is deserialized to a Structure via
  // ЗаполнитьНастройкиПодключенияИзXML()
  // It needs ИмяПланаОбмена as a key in the resulting Structure
  // The XML namespace must match what 1C expects for XDTOSerializer.ReadXML

  // Let me first check what GetIBParameters returns to understand the exact Structure format
  console.log('=== Step 1: GetIBParameters full response (reference) ===\n');
  const ibpRes = await soapCall(
    'Exchange_3_0_2_1',
    'http://www.1c.ru/SSL/Exchange_3_0_2_1',
    `<tns:GetIBParameters>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode xsi:nil="true"/>
      <tns:ResultMessage xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:GetIBParameters>`
  );
  // Extract the full return value
  const ibpReturn = ibpRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
  console.log('Full GetIBParameters return:');
  console.log(ibpReturn.substring(0, 3000));

  console.log('\n\n=== Step 2: GetIBData for all exchange plan types ===\n');
  // Let's see what exchange plan details look like
  const ibdRes = await soapCall(
    'Exchange_2_0_1_6',
    'http://www.1c.ru/SSL/Exchange_2_0_1_6',
    `<tns:GetIBData><tns:TableName>ПланОбмена.${plan}</tns:TableName></tns:GetIBData>`
  );
  if (!ibdRes.body.includes('Fault')) {
    const returnVal = ibdRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    console.log('GetIBData for exchange plan:', returnVal.substring(0, 2000));
  } else {
    const faultStr = ibdRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    console.log('GetIBData exchange plan error:', faultStr.substring(0, 300));
  }

  console.log('\n\n=== Step 3: CreateExchange with ИмяПланаОбмена in different XML positions ===\n');

  // The error is at line 2199 of ПомощникСозданияОбменаДанными:
  //   НайденныйПланОбмена = ОбменДаннымиСервер.НайтиИмяПланаОбменаЧерезУниверсальныйФормат(СтруктураНастроек.ИмяПланаОбмена);
  // This means СтруктураНастроек must have ИмяПланаОбмена
  // СтруктураНастроек is the deserialized Parameters

  // The issue might be that the XML for Parameters needs to be a serialized 1C Structure
  // with XDTO format. Let's try a Format that 1C XDTO serializer produces:
  
  const formats = [
    {
      name: '1. XDTO-style Structure with all required fields',
      params: esc(
        '<Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<Property name="ИмяПланаОбмена"><Value xsi:type="xs:string">' + plan + '</Value></Property>' +
        '<Property name="КодУзлаКорреспондента"><Value xsi:type="xs:string">LENSFLOW</Value></Property>' +
        '<Property name="НаименованиеУзлаКорреспондента"><Value xsi:type="xs:string">LensFlow CRM</Value></Property>' +
        '<Property name="ПрефиксИнформационнойБазыКорреспондента"><Value xsi:type="xs:string">LF</Value></Property>' +
        '<Property name="ПрефиксИнформационнойБазыИсточника"><Value xsi:type="xs:string">БК</Value></Property>' +
        '<Property name="ВидТранспортаСообщенийОбмена"><Value xsi:type="xs:string">WS</Value></Property>' +
        '<Property name="WSURLВебСервиса"><Value xsi:type="xs:string">' + BASE_URL + '</Value></Property>' +
        '<Property name="WSИмяПользователя"><Value xsi:type="xs:string">' + USERNAME + '</Value></Property>' +
        '<Property name="WSПароль"><Value xsi:type="xs:string">' + PASSWORD + '</Value></Property>' +
        '<Property name="ФорматОбмена"><Value xsi:type="xs:string">UniversalFormat</Value></Property>' +
        '</Structure>'
      ),
    },
    {
      name: '2. With xml declaration before Structure',
      params: esc(
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<Property name="ИмяПланаОбмена"><Value xsi:type="xs:string">' + plan + '</Value></Property>' +
        '<Property name="КодУзлаКорреспондента"><Value xsi:type="xs:string">LENSFLOW</Value></Property>' +
        '<Property name="НаименованиеУзлаКорреспондента"><Value xsi:type="xs:string">LensFlow CRM</Value></Property>' +
        '<Property name="ПрефиксИнформационнойБазыКорреспондента"><Value xsi:type="xs:string">LF</Value></Property>' +
        '<Property name="ВидТранспортаСообщенийОбмена"><Value xsi:type="xs:string">WS</Value></Property>' +
        '</Structure>'
      ),
    },
    {
      name: '3. Minimal: just ИмяПланаОбмена + код',
      params: esc(
        '<Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<Property name="ИмяПланаОбмена"><Value xsi:type="xs:string">' + plan + '</Value></Property>' +
        '<Property name="КодУзлаКорреспондента"><Value xsi:type="xs:string">LENSFLOW</Value></Property>' +
        '</Structure>'
      ),
    },
    {
      name: '4. Without namespace',
      params: esc(
        '<Structure>' +
        '<Property name="ИмяПланаОбмена"><Value>' + plan + '</Value></Property>' +
        '<Property name="КодУзлаКорреспондента"><Value>LENSFLOW</Value></Property>' +
        '<Property name="НаименованиеУзлаКорреспондента"><Value>LensFlow CRM</Value></Property>' +
        '</Structure>'
      ),
    },
    {
      name: '5. Using ОбменРозницаБухгалтерияПредприятия30 plan name',
      params: esc(
        '<Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<Property name="ИмяПланаОбмена"><Value xsi:type="xs:string">ОбменРозницаБухгалтерияПредприятия30</Value></Property>' +
        '<Property name="КодУзлаКорреспондента"><Value xsi:type="xs:string">LENSFLOW</Value></Property>' +
        '<Property name="НаименованиеУзлаКорреспондента"><Value xsi:type="xs:string">LensFlow CRM</Value></Property>' +
        '<Property name="ПрефиксИнформационнойБазыКорреспондента"><Value xsi:type="xs:string">LF</Value></Property>' +
        '<Property name="ВидТранспортаСообщенийОбмена"><Value xsi:type="xs:string">WS</Value></Property>' +
        '</Structure>'
      ),
    },
  ];

  for (const fmt of formats) {
    console.log(`--- ${fmt.name} ---`);
    const res = await soapCall(
      'Exchange_2_0_1_6',
      'http://www.1c.ru/SSL/Exchange_2_0_1_6',
      `<tns:CreateExchange>
        <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
        <tns:Parameters>${fmt.params}</tns:Parameters>
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
      </tns:CreateExchange>`
    );
    const hasFault = res.body.includes('Fault');
    const faultStr = res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '';
    if (hasFault) {
      console.log(`  ❌ ${faultStr.trim().substring(0, 600)}`);
    } else {
      console.log(`  ✅ SUCCESS (HTTP ${res.status})`);
      console.log('  Response:', res.body.substring(0, 1000));
    }
    console.log();
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
