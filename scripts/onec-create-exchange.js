/**
 * CreateExchange with CORRECT Parameters format (XML document)
 * The 1C server tries to read Parameters as XML - it should contain connection settings
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

  console.log('=== CreateExchange with XML Parameters ===\n');

  // The Parameters field is a string that 1C reads as XML
  // It needs to be an escaped XML structure containing connection settings
  // Based on 1C BSP (Библиотека стандартных подсистем) the Parameters string
  // should contain an XML serialized Structure with connection settings

  const formats = [
    {
      name: '1. XML Structure with WS connection settings',
      params: `&lt;?xml version="1.0" encoding="UTF-8"?&gt;&lt;Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"&gt;&lt;Property name="ВидТранспортаСообщенийОбмена"&gt;&lt;Value xsi:type="xs:string"&gt;WS&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="АдресВебСервиса"&gt;&lt;Value xsi:type="xs:string"&gt;${BASE_URL}&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="ИмяПользователя"&gt;&lt;Value xsi:type="xs:string"&gt;${USERNAME}&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="Пароль"&gt;&lt;Value xsi:type="xs:string"&gt;${PASSWORD}&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="КодУзла"&gt;&lt;Value xsi:type="xs:string"&gt;LENSFLOW&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="НаименованиеУзла"&gt;&lt;Value xsi:type="xs:string"&gt;LensFlow CRM&lt;/Value&gt;&lt;/Property&gt;&lt;/Structure&gt;`,
    },
    {
      name: '2. Minimal XML Structure (just node code)',
      params: `&lt;?xml version="1.0" encoding="UTF-8"?&gt;&lt;Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"&gt;&lt;Property name="КодУзла"&gt;&lt;Value xsi:type="xs:string"&gt;LENSFLOW&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="НаименованиеУзла"&gt;&lt;Value xsi:type="xs:string"&gt;LensFlow CRM&lt;/Value&gt;&lt;/Property&gt;&lt;/Structure&gt;`,
    },
    {
      name: '3. Empty XML Structure',
      params: `&lt;?xml version="1.0" encoding="UTF-8"?&gt;&lt;Structure xmlns="http://v8.1c.ru/8.1/data/core"/&gt;`,
    },
    {
      name: '4. XML with WS transport and remote URL',
      params: `&lt;?xml version="1.0" encoding="UTF-8"?&gt;&lt;Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"&gt;&lt;Property name="ВидТранспортаСообщенийОбмена"&gt;&lt;Value xsi:type="xs:string"&gt;WS&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="WSURLВебСервиса"&gt;&lt;Value xsi:type="xs:string"&gt;${BASE_URL}/ws/Exchange_3_0_2_1&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="WSИмяПользователя"&gt;&lt;Value xsi:type="xs:string"&gt;${USERNAME}&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="WSПароль"&gt;&lt;Value xsi:type="xs:string"&gt;${PASSWORD}&lt;/Value&gt;&lt;/Property&gt;&lt;/Structure&gt;`,
    },
    {
      name: '5. Parameters with ИмяПланаОбмена inside',
      params: `&lt;?xml version="1.0" encoding="UTF-8"?&gt;&lt;Structure xmlns="http://v8.1c.ru/8.1/data/core" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"&gt;&lt;Property name="ИмяПланаОбмена"&gt;&lt;Value xsi:type="xs:string"&gt;${plan}&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="КодУзлаКорреспондента"&gt;&lt;Value xsi:type="xs:string"&gt;LENSFLOW&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="НаименованиеУзлаКорреспондента"&gt;&lt;Value xsi:type="xs:string"&gt;LensFlow CRM&lt;/Value&gt;&lt;/Property&gt;&lt;Property name="ПрефиксИнформационнойБазыКорреспондента"&gt;&lt;Value xsi:type="xs:string"&gt;LF&lt;/Value&gt;&lt;/Property&gt;&lt;/Structure&gt;`,
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
      console.log(`  ❌ ${faultStr.trim().substring(0, 500)}`);
    } else {
      console.log(`  ✅ SUCCESS (HTTP ${res.status})`);
      console.log('  Response:', res.body);
    }
    console.log();
  }

  // Also try TestConnection again to see if status changed
  console.log('\n=== TestConnection (post-create attempts) ===\n');
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
  if (!tcRes.body.includes('Fault')) {
    const returnVal = tcRes.body.match(/<m:return[^>]*>([\s\S]*?)<\/m:return>/)?.[1] || '';
    const resultVal = tcRes.body.match(/<m:Result[^>]*>([\s\S]*?)<\/m:Result>/)?.[1] || '';
    console.log('return:', returnVal);
    console.log('Result:', resultVal);
  } else {
    console.log('FAULT:', tcRes.body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)?.[1]);
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
