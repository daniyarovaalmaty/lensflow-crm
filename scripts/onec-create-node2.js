/**
 * CreateExchangeNode - add СтрокаПараметровXML field
 * Iteratively fixing: first was НастройкиПодключения, now СтрокаПараметровXML
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
  const ns3 = 'http://www.1c.ru/SSL/Exchange_3_0_2_1';

  // СтрокаПараметровXML is the XML string that gets parsed by ЗаполнитьНастройкиПодключенияИзXML
  // This is the same XML that CreateExchange (2.0) uses as Parameters string
  // So we need the full XML with all settings that 1C BSP wizard generates

  // Build the XML settings string that contains ALL required fields
  const xmlSettingsString = 
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<Property name="ИмяПланаОбмена"><Value xsi:type="xs:string">' + plan + '</Value></Property>' +
    '<Property name="КодУзлаКорреспондента"><Value xsi:type="xs:string">LENSFLOW</Value></Property>' +
    '<Property name="НаименованиеУзлаКорреспондента"><Value xsi:type="xs:string">LensFlow CRM</Value></Property>' +
    '<Property name="ПрефиксИнформационнойБазыКорреспондента"><Value xsi:type="xs:string">LF</Value></Property>' +
    '<Property name="ПрефиксИнформационнойБазыИсточника"><Value xsi:type="xs:string">БК</Value></Property>' +
    '<Property name="ФорматОбмена"><Value xsi:type="xs:string">http://v8.1c.ru/edi/edi_stnd/EnterpriseData</Value></Property>' +
    '<Property name="ВерсияФорматаОбмена"><Value xsi:type="xs:string">1.6</Value></Property>' +
    '<Property name="ВидТранспортаСообщенийОбмена"><Value xsi:type="xs:string">WS</Value></Property>' +
    '<Property name="WSURLВебСервиса"><Value xsi:type="xs:string">' + BASE_URL + '</Value></Property>' +
    '<Property name="WSИмяПользователя"><Value xsi:type="xs:string">' + USERNAME + '</Value></Property>' +
    '<Property name="WSПароль"><Value xsi:type="xs:string">' + PASSWORD + '</Value></Property>' +
    '<Property name="WSЗапомнитьПароль"><Value xsi:type="xs:boolean">true</Value></Property>' +
    '</Structure>';

  console.log('=== CreateExchangeNode with СтрокаПараметровXML ===\n');

  const formats = [
    {
      name: '1. СтрокаПараметровXML as escaped string value',
      body: `<tns:CreateExchangeNode>
        <tns:Parameters>
          <xs1:Property name="НастройкиПодключения">
            <xs1:Value xsi:type="xs1:Structure">
              <xs1:Property name="ВидТранспортаСообщенийОбмена">
                <xs1:Value xsi:type="xsd:string">WS</xs1:Value>
              </xs1:Property>
              <xs1:Property name="WSURLВебСервиса">
                <xs1:Value xsi:type="xsd:string">${BASE_URL}</xs1:Value>
              </xs1:Property>
              <xs1:Property name="WSИмяПользователя">
                <xs1:Value xsi:type="xsd:string">${USERNAME}</xs1:Value>
              </xs1:Property>
              <xs1:Property name="WSПароль">
                <xs1:Value xsi:type="xsd:string">${PASSWORD}</xs1:Value>
              </xs1:Property>
            </xs1:Value>
          </xs1:Property>
          <xs1:Property name="СтрокаПараметровXML">
            <xs1:Value xsi:type="xsd:string">${esc(xmlSettingsString)}</xs1:Value>
          </xs1:Property>
        </tns:Parameters>
        <tns:Zone>0</tns:Zone>
      </tns:CreateExchangeNode>`,
    },
    {
      name: '2. All fields at top level',
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
          <xs1:Property name="НастройкиПодключения">
            <xs1:Value xsi:type="xs1:Structure">
              <xs1:Property name="ВидТранспортаСообщенийОбмена">
                <xs1:Value xsi:type="xsd:string">WS</xs1:Value>
              </xs1:Property>
              <xs1:Property name="WSURLВебСервиса">
                <xs1:Value xsi:type="xsd:string">${BASE_URL}</xs1:Value>
              </xs1:Property>
            </xs1:Value>
          </xs1:Property>
          <xs1:Property name="СтрокаПараметровXML">
            <xs1:Value xsi:type="xsd:string">${esc(xmlSettingsString)}</xs1:Value>
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
  ];

  for (const fmt of formats) {
    console.log(`--- ${fmt.name} ---`);
    const res = await soapCall('Exchange_3_0_2_1', ns3, fmt.body);
    console.log(`HTTP: ${res.status}`);
    if (res.body.includes('Fault')) {
      const fault = (res.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1] || '').trim();
      console.log(`❌ ${fault.substring(0, 1000)}`);
    } else {
      console.log(`✅ Response: ${res.body}`);
    }
    console.log();
  }

  // Check TestConnection
  console.log('\n=== TestConnection check ===\n');
  const tcRes = await soapCall('Exchange_3_0_2_1', ns3,
    `<tns:TestConnection>
      <tns:ExchangePlanName>${plan}</tns:ExchangePlanName>
      <tns:NodeCode>LENSFLOW</tns:NodeCode>
      <tns:Result xsi:nil="true"/>
      <tns:Zone>0</tns:Zone>
    </tns:TestConnection>`
  );
  const returnVal = tcRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
  const resultVal = tcRes.body.match(/<m:Result[^>]*>([\s\S]*?)<\/m:Result>/)?.[1] || '';
  console.log('return:', returnVal);
  console.log('Result:', resultVal);

  console.log('\n=== DONE ===');
}

main().catch(console.error);
