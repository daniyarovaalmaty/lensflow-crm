/**
 * 1C Exchange Web Service Endpoint (V2)
 * 
 * Bypasses Vercel cache and returns perfectly typed WSDLs.
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

const IB_PARAMS = `<IBParameters>
<InfobasePrefix>LF</InfobasePrefix>
<DefaultExchangeMessagesTransportKind>WS</DefaultExchangeMessagesTransportKind>
<ConfigurationVersion>1.0.0</ConfigurationVersion>
<InfobaseDescription>LensFlow CRM</InfobaseDescription>
<OrganizationName>LensFlow CRM</OrganizationName>
<OrganizationPrefix>LF</OrganizationPrefix>
<SupportedFormatObjects>
<CatalogObject.Контрагенты/>
<CatalogObject.Номенклатура/>
<CatalogObject.Организации/>
<CatalogObject.ДоговорыКонтрагентов/>
<CatalogObject.Склады/>
<CatalogObject.ЕдиницыИзмерения/>
<DocumentObject.СчетНаОплатуПокупателю/>
<DocumentObject.РеализацияТоваровУслуг/>
<DocumentObject.ПоступлениеТоваровУслуг/>
<InformationRegister.ЦеныНоменклатуры/>
</SupportedFormatObjects>
</IBParameters>`;

// ─── SOAP Operation Handlers ─────────────────────────────────────────

function handlePing(): string {
    return soapEnvelope('<m:PingResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return>true</m:return></m:PingResponse>');
}

function handleTestConnection(): string {
    return soapEnvelope('<m:TestConnectionResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return>true</m:return><m:ResultMessage></m:ResultMessage></m:TestConnectionResponse>');
}

function handleGetIBParameters(): string {
    return soapEnvelope(`<m:GetIBParametersResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return>${IB_PARAMS}</m:return></m:GetIBParametersResponse>`);
}

function handleGetExchangePlans(): string {
    return soapEnvelope(`<m:GetExchangePlansResponse xmlns:m="http://www.1c.ru/SaaS/1.0/WS/RemoteAdministrationOfExchange_2_0_1_6"><m:return>ОбменДанными</m:return></m:GetExchangePlansResponse>`);
}

function handleGetExchangeRules(): string {
    return soapEnvelope(`<m:GetExchangeRulesResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return></m:return></m:GetExchangeRulesResponse>`);
}

function handleDownloadData(): string {
    return soapEnvelope(`<m:DownloadDataResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return></m:return></m:DownloadDataResponse>`);
}

function handleUploadData(): string {
    return soapEnvelope(`<m:UploadDataResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return>true</m:return></m:UploadDataResponse>`);
}

function handleCreateExchangeNode(): string {
    return soapEnvelope(`<m:CreateExchangeNodeResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return>true</m:return></m:CreateExchangeNodeResponse>`);
}

function handleGetCommonNodsData(): string {
    return soapEnvelope(`<m:GetCommonNodsDataResponse xmlns:m="http://www.1c.ru/SSL/Exchange_2_0_1_6"><m:return><Organization><Name>LensFlow CRM</Name><UUID>lensflow-crm-001</UUID><Prefix>LF</Prefix></Organization></m:return></m:GetCommonNodsDataResponse>`);
}

function handleGetIBData(): string {
    return soapEnvelope(`<m:GetIBDataResponse xmlns:m="http://www.1c.ru/SSL/Exchange_2_0_1_6"><m:return>${IB_PARAMS}</m:return></m:GetIBDataResponse>`);
}

function handlePutFilePart(): string {
    return soapEnvelope(`<m:PutFilePartResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return>true</m:return></m:PutFilePartResponse>`);
}

function handleSaveFileFromParts(): string {
    return soapEnvelope(`<m:SaveFileFromPartsResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return>true</m:return></m:SaveFileFromPartsResponse>`);
}

function handleGetFilePart(): string {
    return soapEnvelope(`<m:GetFilePartResponse xmlns:m="http://www.1c.ru/SSL/Exchange_3_0_2_1"><m:return></m:return></m:GetFilePartResponse>`);
}

function handleRegisterOnlyCatalogData(): string {
    return soapEnvelope(`<m:RegisterOnlyCatalogDataResponse xmlns:m="http://www.1c.ru/SSL/Exchange_2_0_1_6"><m:return>true</m:return></m:RegisterOnlyCatalogDataResponse>`);
}

function handleGetVersions(): string {
    return soapEnvelope(`<m:GetVersionsResponse xmlns:m="http://www.1c.ru/SaaS/1.0/WS"><m:return>3.0.2.1</m:return><m:return>2.4.5.1</m:return></m:GetVersionsResponse>`);
}

// ─── WSDL ────────────────────────────────────────────────────────────

function getWsdl(serviceName: string, baseUrl: string): string {
    const ns = serviceName === 'Exchange_3_0_2_1' 
        ? 'http://www.1c.ru/SSL/Exchange_3_0_2_1'
        : serviceName === 'Exchange_2_0_1_6'
        ? 'http://www.1c.ru/SSL/Exchange_2_0_1_6'
        : serviceName === 'RemoteAdministrationOfExchange_2_0_1_6'
        ? 'http://www.1c.ru/SaaS/1.0/WS/RemoteAdministrationOfExchange_2_0_1_6'
        : serviceName === 'InterfaceVersion'
        ? 'http://www.1c.ru/SaaS/1.0/WS'
        : `http://www.1c.ru/SSL/${serviceName}`;

    const operations = serviceName === 'Exchange_3_0_2_1' 
        ? ['Ping', 'TestConnection', 'GetIBParameters', 'DownloadData', 'UploadData', 'CreateExchangeNode', 'GetExchangeRules', 'PutFilePart', 'GetFilePart', 'SaveFileFromParts']
        : serviceName === 'Exchange_2_0_1_6'
        ? ['GetCommonNodsData', 'GetIBData', 'RegisterOnlyCatalogData']
        : serviceName === 'InterfaceVersion'
        ? ['GetVersions']
        : ['GetExchangePlans'];

    const typesXml = `
    <wsdl:types>
        <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" elementFormDefault="qualified">
            ${operations.map(op => {
                let params = '';
                let returnType = 'xsd:string'; // default
                let maxOccurs = '1';

                if (op === 'GetVersions') {
                    params = '<xsd:element name="InterfaceName" type="xsd:string" minOccurs="0"/>';
                    returnType = 'xsd:string';
                    maxOccurs = 'unbounded';
                } else if (op === 'Ping') {
                    params = '';
                    returnType = 'xsd:boolean';
                } else if (op === 'TestConnection') {
                    // Strict alignment with 1C standards for TestConnection
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
                } else if (op === 'UploadData' || op === 'CreateExchangeNode' || op === 'PutFilePart' || op === 'SaveFileFromParts' || op === 'RegisterOnlyCatalogData') {
                    returnType = 'xsd:boolean';
                } else if (op === 'GetExchangeRules' || op === 'DownloadData' || op === 'GetFilePart') {
                    returnType = 'xsd:base64Binary';
                }

                if (op !== 'GetVersions' && op !== 'Ping' && op !== 'TestConnection') {
                    // Standard parameters for Exchange_3_0_2_1 operations
                    params = `
                        <xsd:element name="ExchangePlanName" type="xsd:string" minOccurs="0"/>
                        <xsd:element name="NodeCode" type="xsd:string" minOccurs="0"/>
                        <xsd:element name="ExchangeMessageFormat" type="xsd:int" minOccurs="0"/>
                        <xsd:element name="FileID" type="xsd:string" minOccurs="0"/>
                        <xsd:element name="Data" type="xsd:base64Binary" minOccurs="0"/>
                        <xsd:element name="PartNumber" type="xsd:int" minOccurs="0"/>
                        <xsd:element name="Message" type="xsd:string" minOccurs="0"/>
                        <xsd:element name="ErrorMessage" type="xsd:string" minOccurs="0"/>
                    `;
                }
                
                if (op === 'TestConnection') return ''; // Handled uniquely above

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
    { params }: { params: Promise<{ service: string[] }> }
) {
    const { service } = await params;
    let serviceName = service?.[0] || 'Exchange_3_0_2_1';
    
    // Crucial: 1C requests .1cws files, we must strip the extension to get the true service name!
    if (serviceName.endsWith('.1cws')) {
        serviceName = serviceName.slice(0, -5);
    }
    
    const url = req.nextUrl;

    // WSDL request
    if (url.searchParams.has('wsdl') || url.searchParams.has('WSDL')) {
        const baseUrl = `${url.protocol}//${url.host}/api/onec/v2`;
        console.log(`[1C WS V2 GET] WSDL requested for ${serviceName}`);
        
        return new NextResponse(getWsdl(serviceName, baseUrl), {
            headers: { 
                'Content-Type': 'text/xml; charset=utf-8',
                'Cache-Control': 'no-store, max-age=0' // Prevent Edge Caching
            },
        });
    }

    return NextResponse.json({ service: serviceName, status: 'LensFlow 1C Exchange WS V2' });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ service: string[] }> }
) {
    if (!checkAuth(req)) {
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

    console.log(`[1C WS V2 POST] Operation: ${operation}, SOAPAction: ${soapAction}`);

    const handlers: Record<string, () => string> = {
        'Ping': handlePing,
        'TestConnection': handleTestConnection,
        'GetIBParameters': handleGetIBParameters,
        'GetExchangePlans': handleGetExchangePlans,
        'GetExchangeRules': handleGetExchangeRules,
        'DownloadData': handleDownloadData,
        'UploadData': handleUploadData,
        'CreateExchangeNode': handleCreateExchangeNode,
        'GetCommonNodsData': handleGetCommonNodsData,
        'GetIBData': handleGetIBData,
        'PutFilePart': handlePutFilePart,
        'SaveFileFromParts': handleSaveFileFromParts,
        'GetFilePart': handleGetFilePart,
        'RegisterOnlyCatalogData': handleRegisterOnlyCatalogData,
        'GetVersions': handleGetVersions,
    };

    const handler = handlers[operation];
    if (handler) {
        return new NextResponse(handler(), {
            headers: { 'Content-Type': 'text/xml; charset=utf-8' },
        });
    }

    console.warn(`[1C WS V2] Unknown operation: ${operation}`);
    return new NextResponse(
        soapEnvelope(`<m:${operation}Response><m:return>true</m:return></m:${operation}Response>`),
        { headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
    );
}
