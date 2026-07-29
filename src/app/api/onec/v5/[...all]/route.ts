/**
 * 1C Exchange Web Service Endpoint (V5 Honeypot)
 * 
 * Catches ALL requests (OData, WS, etc.) to log exactly what 1C is doing.
 * Used to bust 1C's aggressive local WSDL cache.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── Auth ────────────────────────────────────────────────────────────
const EXCHANGE_USER = process.env.ONEC_EXCHANGE_USER || 'lensflow';
const EXCHANGE_PASS = process.env.ONEC_EXCHANGE_PASS || 'LensFlow2024!';

function checkAuth(req: NextRequest): boolean {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Basic ')) return false;
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [user, pass] = decoded.split(':');
    return user === EXCHANGE_USER && pass === EXCHANGE_PASS;
}

// ─── SOAP Helpers ────────────────────────────────────────────────────

function soapEnvelope(bodyContent: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>${bodyContent}</soap:Body>
</soap:Envelope>`;
}

function extractOperation(xml: string): string {
    const match = xml.match(/<(?:[^:]+:)?(\w+?)[\s>\/]/);
    if (match) return match[1];
    return '';
}

// ─── IB Parameters (our system info) ─────────────────────────────────
function handleGetIBParameters(): string {
    const structXml = `
        <m:Property name="InfobasePrefix">
            <m:Value xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">LF</m:Value>
        </m:Property>
        <m:Property name="ConfigurationVersion">
            <m:Value xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">1.0.0</m:Value>
        </m:Property>
        <m:Property name="InfobaseDescription">
            <m:Value xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">LensFlow CRM</m:Value>
        </m:Property>
        <m:Property name="OrganizationName">
            <m:Value xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">LensFlow CRM</m:Value>
        </m:Property>
        <m:Property name="OrganizationPrefix">
            <m:Value xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">LF</m:Value>
        </m:Property>
        <m:Property name="DefaultExchangeMessagesTransportKind">
            <m:Value xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">WS</m:Value>
        </m:Property>`;
    
    return soapEnvelope(`<m:GetIBParametersResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return>${structXml}</m:return></m:GetIBParametersResponse>`);
}

function handlePing(): string { return soapEnvelope('<m:PingResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return>true</m:return></m:PingResponse>'); }
function handleTestConnection(): string { return soapEnvelope('<m:TestConnectionResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return>true</m:return><m:ResultMessage></m:ResultMessage></m:TestConnectionResponse>'); }
function handleGetVersions(): string { return soapEnvelope(`<m:GetVersionsResponse xmlns:m="http://www.1c.ru/SaaS/1.0/WS"><m:return>3.0.2.1</m:return><m:return>2.4.5.1</m:return></m:GetVersionsResponse>`); }
function handleGeneric(): string { return soapEnvelope(`<m:GenericResponse><m:return>true</m:return></m:GenericResponse>`); }

// ─── WSDL ────────────────────────────────────────────────────────────

function getWsdl(serviceName: string, baseUrl: string): string {
    if (serviceName === 'InterfaceVersion') {
        return `<?xml version="1.0" encoding="UTF-8"?>
<wsdl:definitions xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
             xmlns:soap12bind="http://schemas.xmlsoap.org/wsdl/soap12/"
             xmlns:soapbind="http://schemas.xmlsoap.org/wsdl/soap/"
             xmlns:tns="http://www.1c.ru/SaaS/1.0/WS"
             xmlns:xsd="http://www.w3.org/2001/XMLSchema"
             xmlns:xsd1="http://www.1c.ru/SaaS/1.0/WS"
             name="InterfaceVersion"
             targetNamespace="http://www.1c.ru/SaaS/1.0/WS">
    <wsdl:types>
        <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:xsd1="http://www.1c.ru/SaaS/1.0/WS"
                   targetNamespace="http://www.1c.ru/SaaS/1.0/WS"
                   elementFormDefault="qualified">
            <xsd:element name="GetVersions">
                <xsd:complexType>
                    <xsd:sequence>
                        <xsd:element name="InterfaceName" type="xsd:string"/>
                    </xsd:sequence>
                </xsd:complexType>
            </xsd:element>
            <xsd:element name="GetVersionsResponse">
                <xsd:complexType>
                    <xsd:sequence>
                        <xsd:element name="return" type="xsd:string" minOccurs="0" maxOccurs="unbounded"/>
                    </xsd:sequence>
                </xsd:complexType>
            </xsd:element>
        </xsd:schema>
    </wsdl:types>
    <wsdl:message name="GetVersionsRequestMessage">
        <wsdl:part name="parameters" element="tns:GetVersions"/>
    </wsdl:message>
    <wsdl:message name="GetVersionsResponseMessage">
        <wsdl:part name="parameters" element="tns:GetVersionsResponse"/>
    </wsdl:message>
    <wsdl:portType name="InterfaceVersionPortType">
        <wsdl:operation name="GetVersions">
            <wsdl:input message="tns:GetVersionsRequestMessage"/>
            <wsdl:output message="tns:GetVersionsResponseMessage"/>
        </wsdl:operation>
    </wsdl:portType>
    <wsdl:binding name="InterfaceVersionSoapBinding" type="tns:InterfaceVersionPortType">
        <soapbind:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
        <wsdl:operation name="GetVersions">
            <soapbind:operation style="document" soapAction="http://www.1c.ru/SaaS/1.0/WS#InterfaceVersion:GetVersions"/>
            <wsdl:input><soapbind:body use="literal"/></wsdl:input>
            <wsdl:output><soapbind:body use="literal"/></wsdl:output>
        </wsdl:operation>
    </wsdl:binding>
    <wsdl:binding name="InterfaceVersionSoap12Binding" type="tns:InterfaceVersionPortType">
        <soap12bind:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
        <wsdl:operation name="GetVersions">
            <soap12bind:operation style="document" soapAction="http://www.1c.ru/SaaS/1.0/WS#InterfaceVersion:GetVersions"/>
            <wsdl:input><soap12bind:body use="literal"/></wsdl:input>
            <wsdl:output><soap12bind:body use="literal"/></wsdl:output>
        </wsdl:operation>
    </wsdl:binding>
    <wsdl:service name="InterfaceVersion">
        <wsdl:port name="InterfaceVersionSoap" binding="tns:InterfaceVersionSoapBinding">
            <soapbind:address location="${baseUrl}/ws/InterfaceVersion"/>
        </wsdl:port>
        <wsdl:port name="InterfaceVersionSoap12" binding="tns:InterfaceVersionSoap12Binding">
            <soap12bind:address location="${baseUrl}/ws/InterfaceVersion"/>
        </wsdl:port>
    </wsdl:service>
</wsdl:definitions>`;
    }

    const ns = serviceName === 'Exchange_3_0_2_1' 
        ? 'http://www.1c.ru/SSL/Exchange_3_0_2_1'
        : `http://www.1c.ru/SSL/${serviceName}`;

    const operations = ['Ping', 'TestConnection', 'GetIBParameters', 'DownloadData', 'UploadData'];

    const typesXml = `
    <wsdl:types>
        <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" elementFormDefault="qualified">
            <xsd:complexType name="Structure">
                <xsd:sequence>
                    <xsd:element name="Property" maxOccurs="unbounded" minOccurs="0">
                        <xsd:complexType>
                            <xsd:sequence>
                                <xsd:element name="Value" type="xsd:anyType" nillable="true"/>
                            </xsd:sequence>
                            <xsd:attribute name="name" type="xsd:string" use="required"/>
                        </xsd:complexType>
                    </xsd:element>
                </xsd:sequence>
            </xsd:complexType>
            ${operations.map(op => {
                let params = '';
                let returnType = 'xsd:string'; // default
                let maxOccurs = '1';

                if (op === 'Ping') {
                    params = '';
                    returnType = 'xsd:boolean';
                } else if (op === 'TestConnection') {
                    return `
            <xsd:element name="TestConnection">
                <xsd:complexType><xsd:sequence>
                    <xsd:element name="ExchangePlanName" type="xsd:string" minOccurs="0"/>
                    <xsd:element name="NodeCode" type="xsd:string" minOccurs="0"/>
                    <xsd:element name="ExchangeMessageFormat" type="xsd:int" minOccurs="0"/>
                </xsd:sequence></xsd:complexType>
            </xsd:element>
            <xsd:element name="TestConnectionResponse">
                <xsd:complexType><xsd:sequence>
                    <xsd:element name="return" type="xsd:boolean"/>
                    <xsd:element name="ResultMessage" type="xsd:string" nillable="true"/>
                </xsd:sequence></xsd:complexType>
            </xsd:element>`;
                } else if (op === 'GetIBParameters') {
                    returnType = 'tns:Structure';
                } else if (op === 'UploadData') {
                    returnType = 'xsd:boolean';
                } else if (op === 'DownloadData') {
                    returnType = 'xsd:base64Binary';
                }

                if (op !== 'Ping' && op !== 'TestConnection') {
                    params = `
                        <xsd:element name="ExchangePlanName" type="xsd:string" minOccurs="0"/>
                        <xsd:element name="NodeCode" type="xsd:string" minOccurs="0"/>
                        <xsd:element name="ExchangeMessageFormat" type="xsd:int" minOccurs="0"/>
                    `;
                }
                
                return `
            <xsd:element name="${op}">
                <xsd:complexType><xsd:sequence>${params}</xsd:sequence></xsd:complexType>
            </xsd:element>
            <xsd:element name="${op}Response">
                <xsd:complexType><xsd:sequence><xsd:element name="return" type="${returnType}" minOccurs="0" maxOccurs="${maxOccurs}"/></xsd:sequence></xsd:complexType>
            </xsd:element>`;
            }).join('')}
        </xsd:schema>
    </wsdl:types>`;

    const msgXml = operations.map(op => `
        <wsdl:message name="${op}Request"><wsdl:part name="parameters" element="tns:${op}"/></wsdl:message>
        <wsdl:message name="${op}Response"><wsdl:part name="parameters" element="tns:${op}Response"/></wsdl:message>`).join('');

    const bindOps = operations.map(op => `
        <wsdl:operation name="${op}">
            <soap:operation soapAction="${ns}#${serviceName}:${op}"/>
            <wsdl:input><soap:body use="literal"/></wsdl:input>
            <wsdl:output><soap:body use="literal"/></wsdl:output>
        </wsdl:operation>`).join('');

    const opXml = operations.map(op => `
        <wsdl:operation name="${op}">
            <wsdl:input message="tns:${op}Request"/>
            <wsdl:output message="tns:${op}Response"/>
        </wsdl:operation>`).join('');

    const bindOps12 = operations.map(op => `
        <wsdl:operation name="${op}">
            <soap12:operation soapAction="${ns}#${serviceName}:${op}"/>
            <wsdl:input><soap12:body use="literal"/></wsdl:input>
            <wsdl:output><soap12:body use="literal"/></wsdl:output>
        </wsdl:operation>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<wsdl:definitions 
    name="${serviceName}"
    xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
    xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
    xmlns:soap12="http://schemas.xmlsoap.org/wsdl/soap12/"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:tns="${ns}"
    targetNamespace="${ns}">
    ${typesXml}
    ${msgXml}
    <wsdl:portType name="${serviceName}PortType">${opXml}</wsdl:portType>
    <wsdl:binding name="${serviceName}SoapBinding" type="tns:${serviceName}PortType">
        <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>${bindOps}
    </wsdl:binding>
    <wsdl:binding name="${serviceName}Soap12Binding" type="tns:${serviceName}PortType">
        <soap12:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>${bindOps12}
    </wsdl:binding>
    <wsdl:service name="${serviceName}">
        <wsdl:port name="${serviceName}Soap" binding="tns:${serviceName}SoapBinding">
            <soap:address location="${baseUrl}/ws/${serviceName}"/>
        </wsdl:port>
        <wsdl:port name="${serviceName}Soap12" binding="tns:${serviceName}Soap12Binding">
            <soap12:address location="${baseUrl}/ws/${serviceName}"/>
        </wsdl:port>
    </wsdl:service>
</wsdl:definitions>`;
}

// ─── Route Handlers ──────────────────────────────────────────────────

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ all: string[] }> }
) {
    const { all } = await params;
    const urlStr = req.nextUrl.toString();
    console.log(`\n\n=== [1C V5 HONEYPOT GET] ===`);
    console.log(`URL: ${urlStr}`);
    console.log(`Path Array: ${JSON.stringify(all)}`);

    // If 1C is looking for OData (REST), explicitly return a 404 text response
    // to FORCE it to log the failure and fall back to SOAP, without hitting Vercel's Edge Next.js 404 cache.
    if (all.includes('odata')) {
        console.log(`[1C V5 HONEYPOT] OData requested, forcing 404 to trigger SOAP fallback.`);
        return new NextResponse('OData not supported, use SOAP', { status: 404 });
    }

    let serviceName = all[all.length - 1] || 'Exchange_3_0_2_1';
    if (serviceName.endsWith('.1cws')) {
        serviceName = serviceName.slice(0, -5);
    }
    
    // WSDL request
    if (req.nextUrl.searchParams.has('wsdl') || req.nextUrl.searchParams.has('WSDL')) {
        const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}/api/onec/v5`;
        console.log(`[1C V5 HONEYPOT] Returning WSDL for ${serviceName}`);
        
        return new NextResponse(getWsdl(serviceName, baseUrl), {
            headers: { 
                'Content-Type': 'text/xml; charset=utf-8',
                'Cache-Control': 'no-store, max-age=0'
            },
        });
    }

    return NextResponse.json({ path: all, status: 'V5 Honeypot Ready' });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ all: string[] }> }
) {
    console.log(`\n\n=== [1C V5 HONEYPOT POST] ===`);
    const { all } = await params;
    console.log(`Path Array: ${JSON.stringify(all)}`);

    if (!checkAuth(req)) {
        console.log(`[1C V5 HONEYPOT] Unauthorized request`);
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.text();
    const soapAction = req.headers.get('soapaction') || '';
    
    let operation = '';
    if (soapAction) {
        const match = soapAction.match(/:(\w+)$/);
        if (match) operation = match[1];
    }
    if (!operation) {
        operation = extractOperation(body);
    }

    console.log(`[1C V5 HONEYPOT POST] Operation: ${operation}`);

    const handlers: Record<string, () => string> = {
        'Ping': handlePing,
        'TestConnection': handleTestConnection,
        'GetIBParameters': handleGetIBParameters,
        'GetVersions': handleGetVersions,
    };

    const handler = handlers[operation] || handleGeneric;
    return new NextResponse(handler(), {
        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    });
}
