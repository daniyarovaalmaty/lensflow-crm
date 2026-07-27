/**
 * 1C Integration Module
 * 
 * Bidirectional integration with 1C:Бухгалтерия для Казахстана 3.0
 * via SOAP WS Exchange services.
 */

export { OneCClient, createOneCClient, createOneCClientWithConfig, OneCError } from './client';
export type { OneCConfig, SoapResponse, SoapFault } from './client';

export { OneCSyncService } from './sync';

export {
  formatOneCExternalId,
  parseOneCExternalId,
  isOneCExternalId,
  createSyncResult,
  finalizeSyncResult,
  DEFAULT_EXCHANGE_CONFIG,
} from './types';

export type {
  OneCSyncResult,
  OneCExchangeConfig,
  OneCCounterparty,
  OneCNomenclature,
  OneCOrganization,
  OneCContract,
  OneCWarehouse,
  OneCInvoice,
  OneCSalesDocument,
  OneCDocumentLine,
  OneCESFReference,
} from './types';

export { parseDataPackage, buildUploadPackage } from './xml-parser';
export type { ParsedDataPackage } from './xml-parser';
