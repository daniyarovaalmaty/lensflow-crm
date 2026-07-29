/**
 * CreateExchangeNode with НастройкиПодключения field in Structure
 * Error from previous: "Поле объекта не обнаружено (НастройкиПодключения)"
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

  console.log('=== CreateExchangeNode with НастройкиПодключения ===\n');

  // The Structure needs: НастройкиПодключения (which is itself a Structure with WS connection settings)
  // Following 1C BSP convention, НастройкиПодключения contains WS connection params

  const formats = [
    {
      name: '1. Full Structure with НастройкиПодключения sub-structure',
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
              <xs1:Property name="WSИмяПользователя">
                <xs1:Value xsi:type="xsd:string">${USERNAME}</xs1:Value>
              </xs1:Property>
              <xs1:Property name="WSПароль">
                <xs1:Value xsi:type="xsd:string">${PASSWORD}</xs1:Value>
              </xs1:Property>
            </xs1:Value>
          </xs1:Property>
        </tns:Parameters>
        <tns:Zone>0</tns:Zone>
      </tns:CreateExchangeNode>`,
    },
    {
      name: '2. НастройкиПодключения with FTP transport',
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
              <xs1:Property name="WSЗапомнитьПароль">
                <xs1:Value xsi:type="xsd:boolean">true</xs1:Value>
              </xs1:Property>
            </xs1:Value>
          </xs1:Property>
        </tns:Parameters>
        <tns:Zone>0</tns:Zone>
      </tns:CreateExchangeNode>`,
    },
    {
      name: '3. Empty НастройкиПодключения',
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
          <xs1:Property name="НастройкиПодключения">
            <xs1:Value xsi:type="xs1:Structure"/>
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
      console.log(`❌ ${fault.substring(0, 800)}`);
    } else {
      console.log(`✅ Response: ${res.body}`);
    }
    console.log();
  }

  // If we get a new error field name, let's try adding it iteratively
  // Also try TestConnection to see if node was created
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
