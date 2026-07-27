/**
 * 1C Enterprise SOAP Client
 * 
 * Low-level SOAP client for communicating with 1C:Enterprise WS services.
 * Handles XML serialization, authentication, and error parsing.
 * 
 * Available services:
 *   - Exchange_3_0_2_1 (primary: data upload/download, exchange node management)
 *   - EnterpriseDataExchange_1_0_1_1 (data exchange in EnterpriseData format)
 *   - EnterpriseDataUpload_1_0_1_1 (data upload)
 *   - RemoteAdministrationOfExchange_2_0_1_6 (exchange plan management)
 *   - DataExchange (document exchange for marking/EDO)
 *   - InterfaceVersion (version info)
 */

import https from 'https';

// ─── Types ───────────────────────────────────────────────────────────

export interface OneCConfig {
  baseUrl: string;     // e.g. https://1cstart.itsheff.cloud/okeyvizhenjb94v
  username: string;    // e.g. "Главный Бухгалтер"
  password: string;    // e.g. "5555"
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

export interface SoapResponse {
  status: number;
  body: string;
  /** Parsed XML body as a simplified object (key paths) */
  envelope?: Record<string, string>;
}

export interface SoapFault {
  faultCode: string;
  faultString: string;
  detail?: string;
}

export class OneCError extends Error {
  constructor(
    message: string,
    public readonly fault?: SoapFault,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'OneCError';
  }
}

// ─── SOAP Namespaces ────────────────────────────────────────────────

const NS = {
  SOAP: 'http://schemas.xmlsoap.org/soap/envelope/',
  EXCHANGE_3: 'http://www.1c.ru/SSL/Exchange_3_0_2_1',
  EXCHANGE_2: 'http://www.1c.ru/SSL/Exchange_2_0_1_6',
  EXCHANGE: 'http://www.1c.ru/SSL/Exchange',
  ED_EXCHANGE: 'http://www.1c.ru/SSL/EnterpriseDataExchange_1_0_1_1',
  ED_UPLOAD: 'http://www.1c.ru/SSL/EnterpriseDataUpload_1_0_1_1',
  REMOTE_ADMIN: 'http://www.1c.ru/SaaS/1.0/WS/RemoteAdministrationOfExchange_2_0_1_6',
  DATA_EXCHANGE: 'DataExchange',
  INTERFACE_VER: 'http://www.1c.ru/SaaS/1.0/WS',
  V8_CORE: 'http://v8.1c.ru/8.1/data/core',
} as const;

// Map service names to their WS namespace for WSDL operations
const SERVICE_NS: Record<string, string> = {
  'Exchange_3_0_2_1': NS.EXCHANGE_3,
  'Exchange_2_0_1_6': NS.EXCHANGE_2,
  'Exchange': NS.EXCHANGE,
  'EnterpriseDataExchange_1_0_1_1': NS.ED_EXCHANGE,
  'EnterpriseDataUpload_1_0_1_1': NS.ED_UPLOAD,
  'RemoteAdministrationOfExchange_2_0_1_6': NS.REMOTE_ADMIN,
  'DataExchange': NS.DATA_EXCHANGE,
  'InterfaceVersion': NS.INTERFACE_VER,
};

// ─── XML Helpers ────────────────────────────────────────────────────

/** Escape XML special characters */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Extract text content between XML tags (simple regex parser) */
export function extractXmlValue(xml: string, tagName: string): string | null {
  // Handle namespace-prefixed tags like m:return
  const patterns = [
    new RegExp(`<(?:[^:]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[^:]+:)?${tagName}>`, 'i'),
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

/** Extract all values for a repeating tag */
export function extractXmlValues(xml: string, tagName: string): string[] {
  const pattern = new RegExp(`<(?:[^:]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[^:]+:)?${tagName}>`, 'gi');
  const results: string[] = [];
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

/** Extract attribute value from an XML tag */
export function extractXmlAttr(xml: string, tagName: string, attrName: string): string | null {
  const pattern = new RegExp(`<(?:[^:]+:)?${tagName}[^>]*${attrName}="([^"]*)"`, 'i');
  const match = xml.match(pattern);
  return match ? match[1] : null;
}

/** Check if SOAP response contains a fault */
function parseSoapFault(xml: string): SoapFault | null {
  if (!xml.includes('soap:Fault') && !xml.includes('Fault>')) return null;
  return {
    faultCode: extractXmlValue(xml, 'faultcode') || 'Unknown',
    faultString: extractXmlValue(xml, 'faultstring') || 'Unknown SOAP fault',
    detail: extractXmlValue(xml, 'detail') || undefined,
  };
}

// ─── SOAP Client Class ─────────────────────────────────────────────

export class OneCClient {
  private readonly config: Required<OneCConfig>;
  private readonly authHeader: string;

  constructor(config: OneCConfig) {
    this.config = {
      timeout: 30000,
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
    };
    this.authHeader = 'Basic ' + Buffer.from(
      `${this.config.username}:${this.config.password}`
    ).toString('base64');
  }

  // ─── Core SOAP Call ──────────────────────────────────────────────

  /**
   * Make a raw SOAP call to a 1C WS service.
   * 
   * @param serviceName - WS service name (e.g. 'Exchange_3_0_2_1')
   * @param operationName - SOAP operation (e.g. 'Ping')
   * @param bodyXml - Inner XML for soap:Body (without Envelope wrapper)
   * @returns Parsed SOAP response
   */
  async callSoap(
    serviceName: string,
    operationName: string,
    bodyXml: string = '',
  ): Promise<SoapResponse> {
    const ns = SERVICE_NS[serviceName];
    if (!ns) throw new OneCError(`Unknown service: ${serviceName}`);

    const soapAction = `${ns}#${serviceName}:${operationName}`;
    const envelope = this.buildEnvelope(ns, bodyXml);
    const url = `${this.config.baseUrl}/ws/${serviceName}`;

    const response = await this.httpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
      },
      body: envelope,
    });

    // Check for SOAP fault
    const fault = parseSoapFault(response.body);
    if (fault) {
      throw new OneCError(
        `1C SOAP Fault [${serviceName}.${operationName}]: ${fault.faultString}`,
        fault,
        response.status,
      );
    }

    return response;
  }

  // ─── Exchange_3_0_2_1 Operations ────────────────────────────────

  /** Test connectivity */
  async ping(): Promise<boolean> {
    try {
      await this.callSoap('Exchange_3_0_2_1', 'Ping', '<tns:Ping/>');
      return true;
    } catch {
      return false;
    }
  }

  /** Test connection with error reporting */
  async testConnection(exchangePlanName: string, nodeCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.callSoap('Exchange_3_0_2_1', 'TestConnection',
        '<tns:TestConnection>' +
        `<tns:ExchangePlanName>${escapeXml(exchangePlanName)}</tns:ExchangePlanName>` +
        `<tns:NodeCode>${escapeXml(nodeCode)}</tns:NodeCode>` +
        '<tns:Result></tns:Result>' +
        '</tns:TestConnection>'
      );
      const ret = extractXmlValue(res.body, 'return');
      return { success: ret === 'true' || res.status === 200 };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  }

  /** Get information base parameters */
  async getIBParameters(exchangePlanName: string, nodeCode: string): Promise<string> {
    const res = await this.callSoap('Exchange_3_0_2_1', 'GetIBParameters',
      '<tns:GetIBParameters>' +
      `<tns:ExchangePlanName>${escapeXml(exchangePlanName)}</tns:ExchangePlanName>` +
      `<tns:NodeCode>${escapeXml(nodeCode)}</tns:NodeCode>` +
      '<tns:ResultMessage></tns:ResultMessage>' +
      '</tns:GetIBParameters>'
    );
    return res.body;
  }

  /** Create exchange node for LensFlow.
   *  Parameters is a Structure type — we pass it as serialized XML. */
  async createExchangeNode(
    exchangePlanName: string,
    nodeCode: string = 'LENSFLOW',
    nodeDescription: string = 'LensFlow CRM',
  ): Promise<string> {
    const parameters = `<tns:ExchangePlan>${exchangePlanName}</tns:ExchangePlan><tns:NodeCode>${nodeCode}</tns:NodeCode><tns:NodeDescription>${nodeDescription}</tns:NodeDescription>`;
    const res = await this.callSoap('Exchange_3_0_2_1', 'CreateExchangeNode',
      '<tns:CreateExchangeNode>' +
      `<tns:Parameters>${parameters}</tns:Parameters>` +
      '</tns:CreateExchangeNode>'
    );
    return res.body;
  }

  /** Download data from 1C (returns XML data package) */
  async downloadData(
    exchangePlanName: string,
    nodeCode: string,
    fileId: string = '',
  ): Promise<string> {
    const res = await this.callSoap('Exchange_3_0_2_1', 'DownloadData',
      '<tns:DownloadData>' +
      `<tns:ExchangePlanName>${escapeXml(exchangePlanName)}</tns:ExchangePlanName>` +
      `<tns:NodeCode>${escapeXml(nodeCode)}</tns:NodeCode>` +
      `<tns:FileID>${escapeXml(fileId)}</tns:FileID>` +
      '<tns:ContinuousOperation>false</tns:ContinuousOperation>' +
      '<tns:Operation></tns:Operation>' +
      '<tns:ContinuousOperationAllowed>false</tns:ContinuousOperationAllowed>' +
      '</tns:DownloadData>'
    );
    return extractXmlValue(res.body, 'return') || res.body;
  }

  /** Upload data to 1C */
  async uploadData(
    exchangePlanName: string,
    nodeCode: string,
    fileId: string = '',
  ): Promise<string> {
    const res = await this.callSoap('Exchange_3_0_2_1', 'UploadData',
      '<tns:UploadData>' +
      `<tns:ExchangePlanName>${escapeXml(exchangePlanName)}</tns:ExchangePlanName>` +
      `<tns:NodeCode>${escapeXml(nodeCode)}</tns:NodeCode>` +
      `<tns:FileID>${escapeXml(fileId)}</tns:FileID>` +
      '<tns:ContinuousOperation>false</tns:ContinuousOperation>' +
      '<tns:Operation></tns:Operation>' +
      '<tns:ContinuousOperationAllowed>false</tns:ContinuousOperationAllowed>' +
      '</tns:UploadData>'
    );
    return res.body;
  }

  /** Register only catalog data for exchange */
  async registerCatalogData(
    exchangePlanName: string,
  ): Promise<string> {
    const res = await this.callSoap('Exchange_2_0_1_6', 'RegisterOnlyCatalogData',
      '<tns:RegisterOnlyCatalogData>' +
      `<tns:ExchangePlanName>${escapeXml(exchangePlanName)}</tns:ExchangePlanName>` +
      '</tns:RegisterOnlyCatalogData>'
    );
    return res.body;
  }

  /** Register all data except catalogs for exchange */
  async registerDocumentData(
    exchangePlanName: string,
  ): Promise<string> {
    const res = await this.callSoap('Exchange_2_0_1_6', 'RegisterAllDataExceptCatalogs',
      '<tns:RegisterAllDataExceptCatalogs>' +
      `<tns:ExchangePlanName>${escapeXml(exchangePlanName)}</tns:ExchangePlanName>` +
      '</tns:RegisterAllDataExceptCatalogs>'
    );
    return res.body;
  }

  // ─── File Transfer Operations ───────────────────────────────────

  /** Upload file part to 1C temporary storage.
   *  Exchange_3_0_2_1 uses TransferId (UUID), not FileID. */
  async putFilePart(
    transferId: string,
    partNumber: number,
    partData: string, // base64 encoded
  ): Promise<boolean> {
    const res = await this.callSoap('Exchange_3_0_2_1', 'PutFilePart',
      '<tns:PutFilePart>' +
      `<tns:TransferId>${escapeXml(transferId)}</tns:TransferId>` +
      `<tns:PartNumber>${partNumber}</tns:PartNumber>` +
      `<tns:PartData>${partData}</tns:PartData>` +
      '</tns:PutFilePart>'
    );
    return res.status === 200;
  }

  /** Save uploaded file parts */
  async saveFileFromParts(
    transferId: string,
    partsCount: number,
  ): Promise<boolean> {
    const res = await this.callSoap('Exchange_3_0_2_1', 'SaveFileFromParts',
      '<tns:SaveFileFromParts>' +
      `<tns:TransferId>${escapeXml(transferId)}</tns:TransferId>` +
      `<tns:PartsCount>${partsCount}</tns:PartsCount>` +
      '</tns:SaveFileFromParts>'
    );
    return res.status === 200;
  }

  /** Get file part from 1C */
  async getFilePart(
    transferId: string,
    partNumber: number,
  ): Promise<string> {
    const res = await this.callSoap('Exchange_3_0_2_1', 'GetFilePart',
      '<tns:GetFilePart>' +
      `<tns:TransferId>${escapeXml(transferId)}</tns:TransferId>` +
      `<tns:PartNumber>${partNumber}</tns:PartNumber>` +
      '</tns:GetFilePart>'
    );
    return extractXmlValue(res.body, 'return') || '';
  }

  // ─── EnterpriseData Exchange Operations ─────────────────────────

  /** Prepare data for getting (EnterpriseData format) */
  async prepareDataForGetting(
    exchangePlanName: string,
    peerCode: string,
    partSize: number = 0,
  ): Promise<string> {
    const res = await this.callSoap('EnterpriseDataExchange_1_0_1_1', 'PrepareDataForGetting',
      '<tns:PrepareDataForGetting>' +
      `<tns:ExchangePlanName>${escapeXml(exchangePlanName)}</tns:ExchangePlanName>` +
      `<tns:PeerCode>${escapeXml(peerCode)}</tns:PeerCode>` +
      `<tns:PartSize>${partSize}</tns:PartSize>` +
      '</tns:PrepareDataForGetting>'
    );
    return extractXmlValue(res.body, 'return') || res.body;
  }

  /** Get data part (EnterpriseData format) */
  async getDataPart(fileId: string, partNumber: number = 0): Promise<string> {
    const res = await this.callSoap('EnterpriseDataExchange_1_0_1_1', 'GetDataPart',
      '<tns:GetDataPart>' +
      `<tns:FileID>${escapeXml(fileId)}</tns:FileID>` +
      `<tns:PartNumber>${partNumber}</tns:PartNumber>` +
      '</tns:GetDataPart>'
    );
    return extractXmlValue(res.body, 'return') || res.body;
  }

  /** Put data into 1C (EnterpriseData format via Upload service) */
  async putData(fileId: string): Promise<string> {
    const res = await this.callSoap('EnterpriseDataUpload_1_0_1_1', 'PutData',
      '<tns:PutData>' +
      `<tns:FileID>${escapeXml(fileId)}</tns:FileID>` +
      '</tns:PutData>'
    );
    return res.body;
  }

  /** Put file part via EnterpriseDataExchange service */
  async putFilePartED(
    fileId: string,
    partNumber: number,
    partData: string,
  ): Promise<string> {
    const res = await this.callSoap('EnterpriseDataExchange_1_0_1_1', 'PutFilePart',
      '<tns:PutFilePart>' +
      `<tns:FileID>${escapeXml(fileId)}</tns:FileID>` +
      `<tns:PartNumber>${partNumber}</tns:PartNumber>` +
      `<tns:PartData>${partData}</tns:PartData>` +
      '</tns:PutFilePart>'
    );
    return res.body;
  }

  /** Put data via EnterpriseDataExchange (needs ExchangePlanName and PeerCode) */
  async putDataED(
    exchangePlanName: string,
    peerCode: string,
    fileId: string,
  ): Promise<string> {
    const res = await this.callSoap('EnterpriseDataExchange_1_0_1_1', 'PutData',
      '<tns:PutData>' +
      `<tns:ExchangePlanName>${escapeXml(exchangePlanName)}</tns:ExchangePlanName>` +
      `<tns:PeerCode>${escapeXml(peerCode)}</tns:PeerCode>` +
      `<tns:FileID>${escapeXml(fileId)}</tns:FileID>` +
      '</tns:PutData>'
    );
    return res.body;
  }

  // ─── Remote Administration ──────────────────────────────────────

  /** Get list of available exchange plans */
  async getExchangePlans(): Promise<string> {
    const res = await this.callSoap('RemoteAdministrationOfExchange_2_0_1_6', 'GetExchangePlans',
      '<tns:GetExchangePlans></tns:GetExchangePlans>'
    );
    return extractXmlValue(res.body, 'return') || res.body;
  }

  // ─── DataExchange (Marking/EDO) ─────────────────────────────────

  /** Test DataExchange service */
  async testDataExchange(): Promise<boolean> {
    try {
      const res = await this.callSoap('DataExchange', 'Test',
        '<tns:Test></tns:Test>'
      );
      return res.status === 200;
    } catch {
      return false;
    }
  }

  /** Get all documents from DataExchange */
  async getAllDocs(): Promise<string> {
    const res = await this.callSoap('DataExchange', 'GiveAllDocs',
      '<tns:GiveAllDocs></tns:GiveAllDocs>'
    );
    return extractXmlValue(res.body, 'return') || res.body;
  }

  /** Transfer data via DataExchange */
  async dataTransfer(serializedData: string): Promise<string> {
    const res = await this.callSoap('DataExchange', 'DataTransfer',
      '<tns:DataTransfer>' +
      `<tns:SerializedDataStructure>${escapeXml(serializedData)}</tns:SerializedDataStructure>` +
      '</tns:DataTransfer>'
    );
    return extractXmlValue(res.body, 'return') || res.body;
  }

  // ─── Interface Version ──────────────────────────────────────────

  /** Get supported interface versions */
  async getVersions(interfaceName: string = ''): Promise<string[]> {
    const res = await this.callSoap('InterfaceVersion', 'GetVersions',
      '<tns:GetVersions>' +
      `<tns:InterfaceName>${escapeXml(interfaceName)}</tns:InterfaceName>` +
      '</tns:GetVersions>'
    );
    return extractXmlValues(res.body, 'return');
  }

  // ─── Private Helpers ────────────────────────────────────────────

  private buildEnvelope(namespace: string, bodyContent: string): string {
    return (
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
      ` xmlns:tns="${namespace}"` +
      ` xmlns:xsd="http://www.w3.org/2001/XMLSchema"` +
      ` xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
      '<soap:Body>' +
      bodyContent +
      '</soap:Body>' +
      '</soap:Envelope>'
    );
  }

  private httpRequest(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    } = {},
  ): Promise<SoapResponse> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const req = https.request({
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'text/xml',
          ...options.headers,
        },
        timeout: this.config.timeout,
      }, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode!, body: data });
        });
      });

      req.on('error', (err) => {
        reject(new OneCError(`Network error connecting to 1C: ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new OneCError('Connection to 1C timed out'));
      });

      if (options.body) {
        req.write(options.body, 'utf8');
      }
      req.end();
    });
  }
}

// ─── Factory ────────────────────────────────────────────────────────

/** Create a 1C client from environment variables */
export function createOneCClient(): OneCClient {
  const baseUrl = process.env.ONEC_BASE_URL;
  const username = process.env.ONEC_USERNAME;
  const password = process.env.ONEC_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new OneCError(
      'Missing 1C configuration. Set ONEC_BASE_URL, ONEC_USERNAME, ONEC_PASSWORD env vars.'
    );
  }

  return new OneCClient({ baseUrl, username, password });
}

/** Create a 1C client with explicit config (for testing) */
export function createOneCClientWithConfig(config: OneCConfig): OneCClient {
  return new OneCClient(config);
}
