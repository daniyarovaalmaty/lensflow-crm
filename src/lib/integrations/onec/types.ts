/**
 * 1C Enterprise Data Types
 * 
 * Type definitions for 1C:Бухгалтерия для Казахстана 3.0
 * EnterpriseData XML objects mapped to TypeScript.
 */

// ─── Sync Result ────────────────────────────────────────────────────

export interface OneCSyncResult {
  entity: string;
  created: number;
  updated: number;
  errors: number;
  skipped: number;
  details: string[];
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
}

export function createSyncResult(entity: string): OneCSyncResult {
  return {
    entity,
    created: 0,
    updated: 0,
    errors: 0,
    skipped: 0,
    details: [],
    startedAt: new Date(),
  };
}

export function finalizeSyncResult(result: OneCSyncResult): OneCSyncResult {
  result.finishedAt = new Date();
  result.durationMs = result.finishedAt.getTime() - result.startedAt.getTime();
  return result;
}

// ─── 1C Catalog Types ───────────────────────────────────────────────

/** Контрагент (Counterparty) from 1C */
export interface OneCCounterparty {
  /** 1C internal GUID */
  ref: string;
  /** Deletion mark */
  deletionMark: boolean;
  /** БИН/ИИН */
  inn: string;
  /** Full legal name */
  fullName: string;
  /** Short name */
  shortName: string;
  /** Parent group ref (for hierarchy) */
  parentRef?: string;
  /** Is group (folder) */
  isFolder: boolean;
  /** KBE code */
  kbe?: string;
  /** Legal address */
  legalAddress?: string;
  /** Actual address */
  actualAddress?: string;
  /** Phone */
  phone?: string;
  /** Email */
  email?: string;
  /** Contact person */
  contactPerson?: string;
  /** Bank account info */
  bankAccount?: {
    bank: string;
    bik: string;
    iban: string;
  };
  /** Raw 1C XML attributes */
  rawAttributes?: Record<string, string>;
}

/** Номенклатура (Product/Service) from 1C */
export interface OneCNomenclature {
  /** 1C internal GUID */
  ref: string;
  /** Deletion mark */
  deletionMark: boolean;
  /** Product code */
  code: string;
  /** Product name */
  name: string;
  /** Parent group ref */
  parentRef?: string;
  /** Is group (folder) */
  isFolder: boolean;
  /** Article (артикул) */
  article?: string;
  /** Unit of measurement ref */
  unitRef?: string;
  /** Unit of measurement name */
  unitName?: string;
  /** VAT rate ref */
  vatRateRef?: string;
  /** Is service (not a physical product) */
  isService: boolean;
  /** Weight */
  weight?: number;
  /** Description */
  description?: string;
  /** Raw 1C XML attributes */
  rawAttributes?: Record<string, string>;
}

/** Организация (Our company) from 1C */
export interface OneCOrganization {
  ref: string;
  name: string;
  fullName: string;
  inn: string;
  kpp?: string;
  prefix?: string;
  deletionMark: boolean;
  rawAttributes?: Record<string, string>;
}

/** Договор контрагента (Counterparty contract) from 1C */
export interface OneCContract {
  ref: string;
  deletionMark: boolean;
  number: string;
  date: string;
  counterpartyRef: string;
  organizationRef: string;
  /** Settlement currency ref */
  currencyRef?: string;
  /** Contract type: ДоговорСПокупателем, ДоговорСПоставщиком etc */
  contractType?: string;
  /** Is active */
  isActive: boolean;
  rawAttributes?: Record<string, string>;
}

/** Склад (Warehouse) from 1C */
export interface OneCWarehouse {
  ref: string;
  name: string;
  code: string;
  deletionMark: boolean;
  rawAttributes?: Record<string, string>;
}

// ─── 1C Document Types ──────────────────────────────────────────────

/** Строка табличной части документа (Document line item) */
export interface OneCDocumentLine {
  lineNumber: number;
  nomenclatureRef: string;
  nomenclatureName?: string;
  quantity: number;
  price: number;
  sum: number;
  vatRate?: string;
  vatSum?: number;
  unitRef?: string;
  unitName?: string;
}

/** Счёт на оплату покупателю (Invoice to customer) */
export interface OneCInvoice {
  ref?: string;
  number?: string;
  date: string;
  organizationRef: string;
  counterpartyRef: string;
  contractRef?: string;
  comment?: string;
  /** Tabular section: goods/services */
  lines: OneCDocumentLine[];
  /** Total sum */
  totalSum: number;
  /** VAT sum */
  totalVat?: number;
  /** Posted (проведён) */
  posted?: boolean;
  deletionMark?: boolean;
  rawAttributes?: Record<string, string>;
}

/** Реализация товаров и услуг (Sales document) */
export interface OneCSalesDocument {
  ref?: string;
  number?: string;
  date: string;
  organizationRef: string;
  counterpartyRef: string;
  contractRef?: string;
  warehouseRef?: string;
  comment?: string;
  lines: OneCDocumentLine[];
  totalSum: number;
  totalVat?: number;
  posted?: boolean;
  deletionMark?: boolean;
  /** Linked invoice ref */
  invoiceRef?: string;
  rawAttributes?: Record<string, string>;
}

/** ЭСФ (Электронная счёт-фактура) reference */
export interface OneCESFReference {
  /** Related sales document ref */
  salesDocRef: string;
  /** ESF registration number from esf.gov.kz */
  esfNumber?: string;
  /** Status: created, signed, sent, accepted, rejected */
  status: string;
  /** Date sent */
  dateSent?: string;
}

// ─── Exchange Node Config ───────────────────────────────────────────

export interface OneCExchangeConfig {
  /** Exchange plan name in 1C */
  exchangePlanName: string;
  /** Node code for LensFlow */
  nodeCode: string;
  /** Node description */
  nodeDescription: string;
}

export const DEFAULT_EXCHANGE_CONFIG: OneCExchangeConfig = {
  exchangePlanName: 'ОбменДанными',
  nodeCode: 'LENSFLOW',
  nodeDescription: 'LensFlow CRM Integration',
};

// ─── Mapping Helpers ────────────────────────────────────────────────

/** Format external ID for 1C entities */
export function formatOneCExternalId(ref: string): string {
  return `1c:${ref}`;
}

/** Extract 1C ref from external ID */
export function parseOneCExternalId(externalId: string): string | null {
  if (!externalId.startsWith('1c:')) return null;
  return externalId.substring(3);
}

/** Check if an external ID is a 1C ID */
export function isOneCExternalId(externalId: string | null | undefined): boolean {
  return !!externalId && externalId.startsWith('1c:');
}
