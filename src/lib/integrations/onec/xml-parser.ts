/**
 * 1C EnterpriseData XML Parser & Serializer
 * 
 * Parses XML data packages from 1C Exchange services into typed objects,
 * and serializes LensFlow data into 1C-compatible XML for upload.
 * 
 * Format: EnterpriseData 1.x (used by Бухгалтерия для Казахстана 3.0)
 */

import { extractXmlValue, extractXmlValues, extractXmlAttr, escapeXml } from './client';
import type {
  OneCCounterparty,
  OneCNomenclature,
  OneCOrganization,
  OneCContract,
  OneCWarehouse,
  OneCInvoice,
  OneCSalesDocument,
  OneCDocumentLine,
} from './types';

// ─── XML Data Package Parser ────────────────────────────────────────

/**
 * Parse a 1C Exchange XML data package into categorized objects.
 * The XML package from Download/DownloadData contains multiple object types.
 */
export function parseDataPackage(xml: string): ParsedDataPackage {
  const result: ParsedDataPackage = {
    counterparties: [],
    nomenclature: [],
    organizations: [],
    contracts: [],
    warehouses: [],
    invoices: [],
    salesDocuments: [],
    unknownTypes: [],
    rawXml: xml,
  };

  // Extract individual object blocks from the data package
  // 1C uses <CatalogObject.ИмяСправочника> and <DocumentObject.ИмяДокумента> tags
  
  // Parse Справочник.Контрагенты
  const counterpartyBlocks = extractObjectBlocks(xml, 'CatalogObject.Контрагенты');
  for (const block of counterpartyBlocks) {
    try {
      result.counterparties.push(parseCounterparty(block));
    } catch (e) {
      result.unknownTypes.push(`Error parsing counterparty: ${e}`);
    }
  }

  // Parse Справочник.Номенклатура
  const nomenclatureBlocks = extractObjectBlocks(xml, 'CatalogObject.Номенклатура');
  for (const block of nomenclatureBlocks) {
    try {
      result.nomenclature.push(parseNomenclature(block));
    } catch (e) {
      result.unknownTypes.push(`Error parsing nomenclature: ${e}`);
    }
  }

  // Parse Справочник.Организации
  const orgBlocks = extractObjectBlocks(xml, 'CatalogObject.Организации');
  for (const block of orgBlocks) {
    try {
      result.organizations.push(parseOrganization(block));
    } catch (e) {
      result.unknownTypes.push(`Error parsing organization: ${e}`);
    }
  }

  // Parse Справочник.ДоговорыКонтрагентов
  const contractBlocks = extractObjectBlocks(xml, 'CatalogObject.ДоговорыКонтрагентов');
  for (const block of contractBlocks) {
    try {
      result.contracts.push(parseContract(block));
    } catch (e) {
      result.unknownTypes.push(`Error parsing contract: ${e}`);
    }
  }

  // Parse Справочник.Склады
  const warehouseBlocks = extractObjectBlocks(xml, 'CatalogObject.Склады');
  for (const block of warehouseBlocks) {
    try {
      result.warehouses.push(parseWarehouse(block));
    } catch (e) {
      result.unknownTypes.push(`Error parsing warehouse: ${e}`);
    }
  }

  // Parse Документ.СчетНаОплатуПокупателю
  const invoiceBlocks = extractObjectBlocks(xml, 'DocumentObject.СчетНаОплатуПокупателю');
  for (const block of invoiceBlocks) {
    try {
      result.invoices.push(parseInvoice(block));
    } catch (e) {
      result.unknownTypes.push(`Error parsing invoice: ${e}`);
    }
  }

  // Parse Документ.РеализацияТоваровУслуг
  const salesBlocks = extractObjectBlocks(xml, 'DocumentObject.РеализацияТоваровУслуг');
  for (const block of salesBlocks) {
    try {
      result.salesDocuments.push(parseSalesDocument(block));
    } catch (e) {
      result.unknownTypes.push(`Error parsing sales document: ${e}`);
    }
  }

  return result;
}

export interface ParsedDataPackage {
  counterparties: OneCCounterparty[];
  nomenclature: OneCNomenclature[];
  organizations: OneCOrganization[];
  contracts: OneCContract[];
  warehouses: OneCWarehouse[];
  invoices: OneCInvoice[];
  salesDocuments: OneCSalesDocument[];
  unknownTypes: string[];
  rawXml: string;
}

// ─── Object Block Extraction ────────────────────────────────────────

/**
 * Extract XML blocks for a specific object type.
 * Handles both EnterpriseData format and standard 1C XML exchange format.
 */
function extractObjectBlocks(xml: string, objectType: string): string[] {
  const blocks: string[] = [];
  
  // Pattern 1: Standard 1C exchange format
  // <CatalogObject.Контрагенты>...</CatalogObject.Контрагенты>
  const pattern1 = new RegExp(
    `<${escapeRegex(objectType)}[^>]*>([\\s\\S]*?)<\\/${escapeRegex(objectType)}>`,
    'gi'
  );
  let match;
  while ((match = pattern1.exec(xml)) !== null) {
    blocks.push(match[0]);
  }

  // Pattern 2: EnterpriseData format with v8:Type
  // <v8:Object xsi:type="v8:CatalogObject.Контрагенты">...</v8:Object>
  if (blocks.length === 0) {
    const pattern2 = new RegExp(
      `<[^>]*Object[^>]*type="[^"]*${escapeRegex(objectType)}"[^>]*>([\\s\\S]*?)<\\/[^>]*Object>`,
      'gi'
    );
    while ((match = pattern2.exec(xml)) !== null) {
      blocks.push(match[0]);
    }
  }

  // Pattern 3: Simplified property-based blocks
  // <Контрагенты>...</Контрагенты> (sometimes used in simplified export)
  if (blocks.length === 0) {
    const simpleName = objectType.replace(/^(CatalogObject|DocumentObject)\./, '');
    const pattern3 = new RegExp(
      `<${escapeRegex(simpleName)}[^>]*>([\\s\\S]*?)<\\/${escapeRegex(simpleName)}>`,
      'gi'
    );
    while ((match = pattern3.exec(xml)) !== null) {
      blocks.push(match[0]);
    }
  }

  return blocks;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Individual Object Parsers ──────────────────────────────────────

function parseCounterparty(xml: string): OneCCounterparty {
  return {
    ref: extractXmlValue(xml, 'Ref') || extractXmlValue(xml, 'Ссылка') || '',
    deletionMark: extractXmlValue(xml, 'DeletionMark') === 'true' ||
                  extractXmlValue(xml, 'ПометкаУдаления') === 'true',
    inn: extractXmlValue(xml, 'ИНН') || extractXmlValue(xml, 'INN') || '',
    fullName: extractXmlValue(xml, 'НаименованиеПолное') ||
              extractXmlValue(xml, 'FullName') ||
              extractXmlValue(xml, 'Description') ||
              extractXmlValue(xml, 'Наименование') || '',
    shortName: extractXmlValue(xml, 'Description') ||
               extractXmlValue(xml, 'Наименование') || '',
    parentRef: extractXmlValue(xml, 'Parent') || extractXmlValue(xml, 'Родитель') || undefined,
    isFolder: extractXmlValue(xml, 'IsFolder') === 'true' ||
              extractXmlValue(xml, 'ЭтоГруппа') === 'true',
    kbe: extractXmlValue(xml, 'КБе') || undefined,
    legalAddress: extractXmlValue(xml, 'ЮридическийАдрес') ||
                  extractXmlValue(xml, 'ЮрАдрес') || undefined,
    actualAddress: extractXmlValue(xml, 'ФактическийАдрес') ||
                   extractXmlValue(xml, 'ФактАдрес') || undefined,
    phone: extractXmlValue(xml, 'Телефон') || extractXmlValue(xml, 'Phone') || undefined,
    email: extractXmlValue(xml, 'Email') || extractXmlValue(xml, 'ЭлПочта') || undefined,
    contactPerson: extractXmlValue(xml, 'КонтактноеЛицо') || undefined,
    rawAttributes: extractAllAttributes(xml),
  };
}

function parseNomenclature(xml: string): OneCNomenclature {
  return {
    ref: extractXmlValue(xml, 'Ref') || extractXmlValue(xml, 'Ссылка') || '',
    deletionMark: extractXmlValue(xml, 'DeletionMark') === 'true' ||
                  extractXmlValue(xml, 'ПометкаУдаления') === 'true',
    code: extractXmlValue(xml, 'Code') || extractXmlValue(xml, 'Код') || '',
    name: extractXmlValue(xml, 'Description') || extractXmlValue(xml, 'Наименование') || '',
    parentRef: extractXmlValue(xml, 'Parent') || extractXmlValue(xml, 'Родитель') || undefined,
    isFolder: extractXmlValue(xml, 'IsFolder') === 'true' ||
              extractXmlValue(xml, 'ЭтоГруппа') === 'true',
    article: extractXmlValue(xml, 'Артикул') || extractXmlValue(xml, 'Article') || undefined,
    unitRef: extractXmlValue(xml, 'ЕдиницаИзмерения') ||
             extractXmlValue(xml, 'BaseUnit') || undefined,
    unitName: extractXmlValue(xml, 'НаименованиеЕдиницы') || undefined,
    vatRateRef: extractXmlValue(xml, 'СтавкаНДС') || undefined,
    isService: extractXmlValue(xml, 'Услуга') === 'true' ||
               extractXmlValue(xml, 'IsService') === 'true',
    weight: parseFloat(extractXmlValue(xml, 'Вес') || '') || undefined,
    description: extractXmlValue(xml, 'Описание') ||
                 extractXmlValue(xml, 'Comment') || undefined,
    rawAttributes: extractAllAttributes(xml),
  };
}

function parseOrganization(xml: string): OneCOrganization {
  return {
    ref: extractXmlValue(xml, 'Ref') || extractXmlValue(xml, 'Ссылка') || '',
    name: extractXmlValue(xml, 'Description') || extractXmlValue(xml, 'Наименование') || '',
    fullName: extractXmlValue(xml, 'НаименованиеПолное') ||
              extractXmlValue(xml, 'FullName') || '',
    inn: extractXmlValue(xml, 'ИНН') || extractXmlValue(xml, 'INN') || '',
    kpp: extractXmlValue(xml, 'КПП') || undefined,
    prefix: extractXmlValue(xml, 'Префикс') || undefined,
    deletionMark: extractXmlValue(xml, 'DeletionMark') === 'true' ||
                  extractXmlValue(xml, 'ПометкаУдаления') === 'true',
    rawAttributes: extractAllAttributes(xml),
  };
}

function parseContract(xml: string): OneCContract {
  return {
    ref: extractXmlValue(xml, 'Ref') || extractXmlValue(xml, 'Ссылка') || '',
    deletionMark: extractXmlValue(xml, 'DeletionMark') === 'true' ||
                  extractXmlValue(xml, 'ПометкаУдаления') === 'true',
    number: extractXmlValue(xml, 'Number') || extractXmlValue(xml, 'Номер') || '',
    date: extractXmlValue(xml, 'Date') || extractXmlValue(xml, 'Дата') || '',
    counterpartyRef: extractXmlValue(xml, 'Owner') ||
                     extractXmlValue(xml, 'Владелец') ||
                     extractXmlValue(xml, 'Контрагент') || '',
    organizationRef: extractXmlValue(xml, 'Организация') ||
                     extractXmlValue(xml, 'Organization') || '',
    currencyRef: extractXmlValue(xml, 'ВалютаВзаиморасчетов') || undefined,
    contractType: extractXmlValue(xml, 'ВидДоговора') || undefined,
    isActive: extractXmlValue(xml, 'Статус') !== 'Закрыт',
    rawAttributes: extractAllAttributes(xml),
  };
}

function parseWarehouse(xml: string): OneCWarehouse {
  return {
    ref: extractXmlValue(xml, 'Ref') || extractXmlValue(xml, 'Ссылка') || '',
    name: extractXmlValue(xml, 'Description') || extractXmlValue(xml, 'Наименование') || '',
    code: extractXmlValue(xml, 'Code') || extractXmlValue(xml, 'Код') || '',
    deletionMark: extractXmlValue(xml, 'DeletionMark') === 'true' ||
                  extractXmlValue(xml, 'ПометкаУдаления') === 'true',
    rawAttributes: extractAllAttributes(xml),
  };
}

function parseDocumentLines(xml: string): OneCDocumentLine[] {
  const lines: OneCDocumentLine[] = [];
  // Lines are in <Row> or <Строка> or <Record> elements inside tabular sections
  const lineBlocks = [
    ...extractObjectBlocks(xml, 'Row'),
    ...extractObjectBlocks(xml, 'Строка'),
    ...extractObjectBlocks(xml, 'Record'),
  ];

  for (const block of lineBlocks) {
    lines.push({
      lineNumber: parseInt(extractXmlValue(block, 'LineNumber') ||
                          extractXmlValue(block, 'НомерСтроки') || '0'),
      nomenclatureRef: extractXmlValue(block, 'Номенклатура') ||
                       extractXmlValue(block, 'Nomenclature') || '',
      nomenclatureName: extractXmlValue(block, 'НаименованиеНоменклатуры') || undefined,
      quantity: parseFloat(extractXmlValue(block, 'Количество') ||
                          extractXmlValue(block, 'Quantity') || '0'),
      price: parseFloat(extractXmlValue(block, 'Цена') ||
                        extractXmlValue(block, 'Price') || '0'),
      sum: parseFloat(extractXmlValue(block, 'Сумма') ||
                      extractXmlValue(block, 'Amount') || '0'),
      vatRate: extractXmlValue(block, 'СтавкаНДС') || undefined,
      vatSum: parseFloat(extractXmlValue(block, 'СуммаНДС') || '') || undefined,
      unitRef: extractXmlValue(block, 'ЕдиницаИзмерения') || undefined,
      unitName: extractXmlValue(block, 'НаименованиеЕдиницы') || undefined,
    });
  }

  return lines;
}

function parseInvoice(xml: string): OneCInvoice {
  const lines = parseDocumentLines(xml);
  return {
    ref: extractXmlValue(xml, 'Ref') || extractXmlValue(xml, 'Ссылка') || undefined,
    number: extractXmlValue(xml, 'Number') || extractXmlValue(xml, 'Номер') || undefined,
    date: extractXmlValue(xml, 'Date') || extractXmlValue(xml, 'Дата') || '',
    organizationRef: extractXmlValue(xml, 'Организация') || '',
    counterpartyRef: extractXmlValue(xml, 'Контрагент') || '',
    contractRef: extractXmlValue(xml, 'ДоговорКонтрагента') || undefined,
    comment: extractXmlValue(xml, 'Комментарий') || undefined,
    lines,
    totalSum: parseFloat(extractXmlValue(xml, 'СуммаДокумента') || '0') ||
              lines.reduce((s, l) => s + l.sum, 0),
    totalVat: parseFloat(extractXmlValue(xml, 'СуммаНДС') || '') || undefined,
    posted: extractXmlValue(xml, 'Posted') === 'true' ||
            extractXmlValue(xml, 'Проведен') === 'true',
    deletionMark: extractXmlValue(xml, 'DeletionMark') === 'true',
    rawAttributes: extractAllAttributes(xml),
  };
}

function parseSalesDocument(xml: string): OneCSalesDocument {
  const lines = parseDocumentLines(xml);
  return {
    ref: extractXmlValue(xml, 'Ref') || extractXmlValue(xml, 'Ссылка') || undefined,
    number: extractXmlValue(xml, 'Number') || extractXmlValue(xml, 'Номер') || undefined,
    date: extractXmlValue(xml, 'Date') || extractXmlValue(xml, 'Дата') || '',
    organizationRef: extractXmlValue(xml, 'Организация') || '',
    counterpartyRef: extractXmlValue(xml, 'Контрагент') || '',
    contractRef: extractXmlValue(xml, 'ДоговорКонтрагента') || undefined,
    warehouseRef: extractXmlValue(xml, 'Склад') || undefined,
    comment: extractXmlValue(xml, 'Комментарий') || undefined,
    lines,
    totalSum: parseFloat(extractXmlValue(xml, 'СуммаДокумента') || '0') ||
              lines.reduce((s, l) => s + l.sum, 0),
    totalVat: parseFloat(extractXmlValue(xml, 'СуммаНДС') || '') || undefined,
    posted: extractXmlValue(xml, 'Posted') === 'true' ||
            extractXmlValue(xml, 'Проведен') === 'true',
    deletionMark: extractXmlValue(xml, 'DeletionMark') === 'true',
    invoiceRef: extractXmlValue(xml, 'СчетНаОплату') || undefined,
    rawAttributes: extractAllAttributes(xml),
  };
}

// ─── XML Serialization (LensFlow → 1C) ─────────────────────────────

/**
 * Build a 1C XML data package for uploading to 1C via Exchange WS.
 * Wraps objects in the standard 1C exchange XML format.
 */
export function buildUploadPackage(options: {
  invoices?: OneCInvoice[];
  counterparties?: OneCCounterparty[];
  nomenclature?: OneCNomenclature[];
}): string {
  const parts: string[] = [];
  
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<v8msg:Body xmlns:v8msg="http://v8.1c.ru/messages"');
  parts.push('  xmlns:xs="http://www.w3.org/2001/XMLSchema"');
  parts.push('  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">');

  // Serialize invoices
  if (options.invoices) {
    for (const inv of options.invoices) {
      parts.push(serializeInvoice(inv));
    }
  }

  // Serialize counterparties
  if (options.counterparties) {
    for (const cp of options.counterparties) {
      parts.push(serializeCounterparty(cp));
    }
  }

  // Serialize nomenclature
  if (options.nomenclature) {
    for (const nom of options.nomenclature) {
      parts.push(serializeNomenclature(nom));
    }
  }

  parts.push('</v8msg:Body>');
  return parts.join('\n');
}

function serializeInvoice(inv: OneCInvoice): string {
  const lines = inv.lines.map((l, i) => `
    <Row>
      <LineNumber>${l.lineNumber || i + 1}</LineNumber>
      <Номенклатура>${escapeXml(l.nomenclatureRef)}</Номенклатура>
      <Количество>${l.quantity}</Количество>
      <Цена>${l.price}</Цена>
      <Сумма>${l.sum}</Сумма>
      ${l.vatRate ? `<СтавкаНДС>${escapeXml(l.vatRate)}</СтавкаНДС>` : ''}
      ${l.vatSum ? `<СуммаНДС>${l.vatSum}</СуммаНДС>` : ''}
    </Row>`).join('');

  return `
  <DocumentObject.СчетНаОплатуПокупателю>
    ${inv.ref ? `<Ref>${escapeXml(inv.ref)}</Ref>` : ''}
    <Date>${escapeXml(inv.date)}</Date>
    ${inv.number ? `<Number>${escapeXml(inv.number)}</Number>` : ''}
    <Организация>${escapeXml(inv.organizationRef)}</Организация>
    <Контрагент>${escapeXml(inv.counterpartyRef)}</Контрагент>
    ${inv.contractRef ? `<ДоговорКонтрагента>${escapeXml(inv.contractRef)}</ДоговорКонтрагента>` : ''}
    ${inv.comment ? `<Комментарий>${escapeXml(inv.comment)}</Комментарий>` : ''}
    <СуммаДокумента>${inv.totalSum}</СуммаДокумента>
    <Товары>${lines}
    </Товары>
  </DocumentObject.СчетНаОплатуПокупателю>`;
}

function serializeCounterparty(cp: OneCCounterparty): string {
  return `
  <CatalogObject.Контрагенты>
    ${cp.ref ? `<Ref>${escapeXml(cp.ref)}</Ref>` : ''}
    <DeletionMark>${cp.deletionMark}</DeletionMark>
    <Description>${escapeXml(cp.shortName)}</Description>
    <НаименованиеПолное>${escapeXml(cp.fullName)}</НаименованиеПолное>
    <ИНН>${escapeXml(cp.inn)}</ИНН>
    <ЭтоГруппа>${cp.isFolder}</ЭтоГруппа>
    ${cp.kbe ? `<КБе>${escapeXml(cp.kbe)}</КБе>` : ''}
    ${cp.phone ? `<Телефон>${escapeXml(cp.phone)}</Телефон>` : ''}
    ${cp.email ? `<Email>${escapeXml(cp.email)}</Email>` : ''}
    ${cp.legalAddress ? `<ЮридическийАдрес>${escapeXml(cp.legalAddress)}</ЮридическийАдрес>` : ''}
    ${cp.contactPerson ? `<КонтактноеЛицо>${escapeXml(cp.contactPerson)}</КонтактноеЛицо>` : ''}
  </CatalogObject.Контрагенты>`;
}

function serializeNomenclature(nom: OneCNomenclature): string {
  return `
  <CatalogObject.Номенклатура>
    ${nom.ref ? `<Ref>${escapeXml(nom.ref)}</Ref>` : ''}
    <DeletionMark>${nom.deletionMark}</DeletionMark>
    <Code>${escapeXml(nom.code)}</Code>
    <Description>${escapeXml(nom.name)}</Description>
    <ЭтоГруппа>${nom.isFolder}</ЭтоГруппа>
    ${nom.article ? `<Артикул>${escapeXml(nom.article)}</Артикул>` : ''}
    ${nom.unitRef ? `<ЕдиницаИзмерения>${escapeXml(nom.unitRef)}</ЕдиницаИзмерения>` : ''}
    <Услуга>${nom.isService}</Услуга>
  </CatalogObject.Номенклатура>`;
}

// ─── Utility ────────────────────────────────────────────────────────

/** Extract all simple tag values as key-value pairs */
function extractAllAttributes(xml: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /<([^\/\s>]+)>([^<]+)<\/\1>/g;
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    const key = match[1].replace(/^[^:]+:/, ''); // strip namespace prefix
    attrs[key] = match[2].trim();
  }
  return attrs;
}
