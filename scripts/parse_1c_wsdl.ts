/**
 * Parse WSDL to extract exact SOAP operation signatures
 */
import https from 'https';

const BASE = 'https://1cstart.itsheff.cloud/okeyvizhenjb94v';
const USER = '\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0411\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440';
const PASS = '5555';
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

function fetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = https.request(url, { headers: { Authorization: AUTH } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    r.on('error', reject);
    r.end();
  });
}

async function main() {
  const services = [
    'Exchange_3_0_2_1',
    'EnterpriseDataExchange_1_0_1_1',
    'EnterpriseDataUpload_1_0_1_1',
    'RemoteAdministrationOfExchange_2_0_1_6',
    'DataExchange',
    'InterfaceVersion',
  ];

  for (const svc of services) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`SERVICE: ${svc}`);
    console.log('='.repeat(60));
    
    const wsdl = await fetch(`${BASE}/ws/${svc}?wsdl`);
    
    // Extract targetNamespace
    const nsMatch = wsdl.match(/targetNamespace="([^"]+)"/);
    console.log(`Namespace: ${nsMatch?.[1] || 'unknown'}`);
    
    // Extract portType operations with their messages
    const ops = [...new Set([...wsdl.matchAll(/operation\s+name="([^"]+)"/g)].map(m => m[1]))];
    
    for (const op of ops) {
      console.log(`\n  Operation: ${op}`);
      
      // Find the message definition for this operation's input
      // Look for <message name="${op}"> or <message name="${op}RequestMessage">
      const inputMsgName = `${op}`;
      
      // Find element definition for this operation
      // Pattern: <xs:element name="ParameterName" type="xs:string"/>
      const opPattern = new RegExp(
        `<(?:xs:)?element\\s+name="${op}"[^>]*>([\\s\\S]*?)<\\/(?:xs:)?(?:element|complexType)>`,
        'i'
      );
      const opMatch = wsdl.match(opPattern);
      
      if (opMatch) {
        // Extract parameter elements
        const paramPattern = /<(?:xs:)?element\s+name="([^"]+)"\s+(?:type="([^"]+)")?/g;
        let paramMatch;
        const params: string[] = [];
        while ((paramMatch = paramPattern.exec(opMatch[1])) !== null) {
          params.push(`${paramMatch[1]}: ${paramMatch[2] || 'complex'}`);
        }
        if (params.length > 0) {
          console.log(`    Params: ${params.join(', ')}`);
        }
      }
      
      // Also search for the element in types section
      const elemPattern = new RegExp(
        `element\\s+name="${op}"[\\s\\S]*?<\\/(?:xs:)?(?:element|complexType)>`,
        'i'
      );
      const elemMatch = wsdl.match(elemPattern);
      if (elemMatch) {
        // Get all nested elements
        const nested = [...elemMatch[0].matchAll(/element\s+name="([^"]+)"(?:\s+type="([^"]+)")?/g)];
        if (nested.length > 1) { // Skip the operation itself
          const paramStrs = nested.slice(1).map(m => `${m[1]}${m[2] ? ':' + m[2].split(':').pop() : ''}`);
          console.log(`    Schema: ${paramStrs.join(', ')}`);
        }
      }
    }
    
    // Also print the raw portType section for this service
    const portTypePattern = /<portType[^>]*>[\s\S]*?<\/portType>/g;
    const ptMatch = wsdl.match(portTypePattern);
    if (ptMatch) {
      // Extract input/output message refs
      const msgRefs = [...ptMatch[0].matchAll(/<(?:input|output)\s+message="([^"]+)"/g)];
    }
    
    // Print the raw message definitions  
    console.log(`\n  === Message Elements (from types) ===`);
    const allElements = [...wsdl.matchAll(/<(?:xs:)?element\s+name="([^"]+)"[^\/]*\/?>/g)];
    const topLevelElements = allElements
      .map(m => m[1])
      .filter(name => ops.includes(name) || name.endsWith('Response'));
    
    for (const elemName of [...new Set(topLevelElements)]) {
      // Get the full element definition
      const fullElemPattern = new RegExp(
        `<(?:xs:)?element\\s+name="${elemName}"[^>]*>([\\s\\S]*?)(?:<\\/(?:xs:)?element>|\\/>)`,
      );
      const fullMatch = wsdl.match(fullElemPattern);
      if (fullMatch) {
        const innerElements = [...fullMatch[0].matchAll(/<(?:xs:)?element\s+name="([^"]+)"(?:\s+type="([^"]+)")?(?:\s+nillable="([^"]+)")?/g)];
        const childParams = innerElements
          .filter(m => m[1] !== elemName)
          .map(m => `${m[1]}${m[2] ? ':' + m[2].replace(/^[^:]+:/, '') : ''}${m[3] === 'true' ? '?' : ''}`);
        if (childParams.length > 0) {
          console.log(`    ${elemName}(${childParams.join(', ')})`);
        }
      }
    }
  }
}

main().catch(console.error);
