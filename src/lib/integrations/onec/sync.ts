/**
 * 1C Sync Service
 * 
 * Bidirectional synchronization between LensFlow CRM and 1C:Бухгалтерия КЗ 3.0
 * via SOAP WS Exchange services.
 * 
 * Follows the same pattern as ItigrisSyncService:
 * - Idempotent upserts keyed by external IDs
 * - Soft-failure batch handling
 * - Structured sync results
 */

// PrismaClient type omitted — using `any` for compatibility with extended prisma client
import { OneCClient, OneCError } from './client';
import { parseDataPackage, buildUploadPackage } from './xml-parser';
import {
  OneCSyncResult,
  OneCExchangeConfig,
  DEFAULT_EXCHANGE_CONFIG,
  OneCCounterparty,
  OneCNomenclature,
  OneCInvoice,
  OneCDocumentLine,
  createSyncResult,
  finalizeSyncResult,
  formatOneCExternalId,
  parseOneCExternalId,
} from './types';

// ─── Sync Service ───────────────────────────────────────────────────

export class OneCSyncService {
  private readonly client: OneCClient;
  private readonly prisma: any;
  private readonly orgId: string;
  private readonly exchangeConfig: OneCExchangeConfig;
  private exchangeNodeCreated = false;

  constructor(
    client: OneCClient,
    prisma: any,
    orgId: string,
    exchangeConfig?: Partial<OneCExchangeConfig>,
  ) {
    this.client = client;
    this.prisma = prisma;
    this.orgId = orgId;
    this.exchangeConfig = { ...DEFAULT_EXCHANGE_CONFIG, ...exchangeConfig };
  }

  // ─── Full Sync ──────────────────────────────────────────────────

  /**
   * Run a full bidirectional sync.
   * 1. Ensure exchange node exists
   * 2. Pull catalogs from 1C (counterparties, nomenclature, orgs, warehouses)
   * 3. Pull documents from 1C (invoices, sales docs)
   * 4. Push LensFlow changes to 1C
   */
  async fullSync(): Promise<OneCSyncResult[]> {
    const results: OneCSyncResult[] = [];

    // Step 1: Ensure connectivity
    const connected = await this.client.ping();
    if (!connected) {
      const errResult = createSyncResult('connection');
      errResult.errors = 1;
      errResult.details.push('Cannot connect to 1C. Ping failed.');
      results.push(finalizeSyncResult(errResult));
      return results;
    }

    // Step 2: Ensure exchange node
    await this.ensureExchangeNode();

    // Step 3: Pull from 1C
    try {
      const pullResult = await this.pullFromOneC();
      results.push(...pullResult);
    } catch (err) {
      const errResult = createSyncResult('pull');
      errResult.errors = 1;
      errResult.details.push(`Pull failed: ${err instanceof Error ? err.message : String(err)}`);
      results.push(finalizeSyncResult(errResult));
    }

    // Step 4: Push to 1C
    try {
      const pushResult = await this.pushToOneC();
      results.push(...pushResult);
    } catch (err) {
      const errResult = createSyncResult('push');
      errResult.errors = 1;
      errResult.details.push(`Push failed: ${err instanceof Error ? err.message : String(err)}`);
      results.push(finalizeSyncResult(errResult));
    }

    return results;
  }

  // ─── Pull from 1C ───────────────────────────────────────────────

  /**
   * Pull all registered data from 1C exchange node.
   */
  async pullFromOneC(): Promise<OneCSyncResult[]> {
    const results: OneCSyncResult[] = [];

    // Register catalog data for exchange
    try {
      await this.client.registerCatalogData(
        this.exchangeConfig.exchangePlanName,
      );
    } catch (err) {
      // Not critical - data might already be registered
      console.warn('[1C Sync] RegisterCatalogData warning:', err instanceof Error ? err.message : err);
    }

    // Download data package
    let rawXml: string;
    try {
      rawXml = await this.client.downloadData(
        this.exchangeConfig.exchangePlanName,
        this.exchangeConfig.nodeCode,
      );
    } catch (err) {
      const errResult = createSyncResult('download');
      errResult.errors = 1;
      errResult.details.push(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
      results.push(finalizeSyncResult(errResult));
      return results;
    }

    if (!rawXml || rawXml.length < 50) {
      const emptyResult = createSyncResult('download');
      emptyResult.details.push('No data returned from 1C exchange');
      results.push(finalizeSyncResult(emptyResult));
      return results;
    }

    // Parse the XML package
    const parsed = parseDataPackage(rawXml);

    // Sync counterparties
    if (parsed.counterparties.length > 0) {
      results.push(await this.syncCounterparties(parsed.counterparties));
    }

    // Sync nomenclature
    if (parsed.nomenclature.length > 0) {
      results.push(await this.syncNomenclature(parsed.nomenclature));
    }

    // Sync invoices
    if (parsed.invoices.length > 0) {
      results.push(await this.syncInvoices(parsed.invoices));
    }

    // Sync sales documents
    if (parsed.salesDocuments.length > 0) {
      results.push(await this.syncSalesDocuments(parsed.salesDocuments));
    }

    // Log unknown types
    if (parsed.unknownTypes.length > 0) {
      const unknownResult = createSyncResult('unknown');
      unknownResult.details = parsed.unknownTypes;
      results.push(finalizeSyncResult(unknownResult));
    }

    return results;
  }

  // ─── Push to 1C ─────────────────────────────────────────────────

  /**
   * Push unsynced LensFlow data to 1C.
   * Currently pushes: Sales (with syncedTo1C=false)
   */
  async pushToOneC(): Promise<OneCSyncResult[]> {
    const results: OneCSyncResult[] = [];

    // Push unsynced sales as invoices
    const salesResult = await this.pushUnsyncedSales();
    results.push(salesResult);

    return results;
  }

  // ─── Counterparty Sync (1C → LensFlow) ─────────────────────────

  private async syncCounterparties(counterparties: OneCCounterparty[]): Promise<OneCSyncResult> {
    const result = createSyncResult('counterparties');
    
    for (const cp of counterparties) {
      if (cp.isFolder || !cp.ref) {
        result.skipped++;
        continue;
      }

      try {
        const externalId = formatOneCExternalId(cp.ref);
        
        // Try to find existing organization by external1CId or INN
        const existing = await this.prisma.organization.findFirst({
          where: {
            OR: [
              { metadata: { path: ['onec', 'ref'], equals: cp.ref } },
              ...(cp.inn ? [{ inn: cp.inn }] : []),
            ],
          },
        });

        const orgData = {
          name: cp.shortName || cp.fullName,
          fullName: cp.fullName || cp.shortName,
          inn: cp.inn || undefined,
          legalAddress: cp.legalAddress || undefined,
          actualAddress: cp.actualAddress || undefined,
          phone: cp.phone || undefined,
          email: cp.email || undefined,
          contactPerson: cp.contactPerson || undefined,
          metadata: {
            ...(existing?.metadata as Record<string, unknown> || {}),
            onec: {
              ref: cp.ref,
              kbe: cp.kbe,
              lastSyncedAt: new Date().toISOString(),
              rawAttributes: cp.rawAttributes,
            },
          },
        };

        if (existing) {
          await this.prisma.organization.update({
            where: { id: existing.id },
            data: orgData,
          });
          result.updated++;
        } else {
          // Only create if it has meaningful data
          if (cp.inn || cp.fullName) {
            await this.prisma.organization.create({
              data: {
                ...orgData,
                type: 'standalone',
              },
            });
            result.created++;
          } else {
            result.skipped++;
          }
        }
      } catch (err) {
        result.errors++;
        result.details.push(
          `Error syncing counterparty "${cp.shortName}" (${cp.ref}): ${err instanceof Error ? err.message : err}`
        );
      }
    }

    return finalizeSyncResult(result);
  }

  // ─── Nomenclature Sync (1C → LensFlow) ─────────────────────────

  private async syncNomenclature(items: OneCNomenclature[]): Promise<OneCSyncResult> {
    const result = createSyncResult('nomenclature');

    for (const nom of items) {
      if (nom.isFolder || !nom.ref) {
        result.skipped++;
        continue;
      }

      try {
        // Find existing product by 1C code or name1c
        const existing = await this.prisma.product.findFirst({
          where: {
            organizationId: this.orgId,
            OR: [
              { code: nom.code },
              { name1c: nom.name },
              { metadata: { path: ['onec', 'ref'], equals: nom.ref } },
            ],
          },
        });

        const productData = {
          name: nom.name,
          name1c: nom.name,
          code: nom.code || undefined,
          metadata: {
            ...(existing?.metadata as Record<string, unknown> || {}),
            onec: {
              ref: nom.ref,
              article: nom.article,
              unitRef: nom.unitRef,
              unitName: nom.unitName,
              isService: nom.isService,
              vatRateRef: nom.vatRateRef,
              lastSyncedAt: new Date().toISOString(),
            },
          },
        };

        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: productData,
          });
          result.updated++;
        } else {
          await this.prisma.product.create({
            data: {
              ...productData,
              organizationId: this.orgId,
              sku: `1C-${nom.code || nom.ref.substring(0, 8)}`,
              category: nom.isService ? 'service' : 'lens',
            },
          });
          result.created++;
        }
      } catch (err) {
        result.errors++;
        result.details.push(
          `Error syncing nomenclature "${nom.name}" (${nom.ref}): ${err instanceof Error ? err.message : err}`
        );
      }
    }

    return finalizeSyncResult(result);
  }

  // ─── Invoice Sync (1C → LensFlow) ──────────────────────────────

  private async syncInvoices(invoices: OneCInvoice[]): Promise<OneCSyncResult> {
    const result = createSyncResult('invoices');

    for (const inv of invoices) {
      try {
        // Find the counterparty in our DB
        const counterpartyOrg = inv.counterpartyRef
          ? await this.prisma.organization.findFirst({
              where: { metadata: { path: ['onec', 'ref'], equals: inv.counterpartyRef } },
            })
          : null;

        const externalId = formatOneCExternalId(inv.ref || '');

        // Check if this invoice already exists as a Sale
        const existingSale = await this.prisma.sale.findFirst({
          where: {
            OR: [
              { external1CId: inv.ref },
              { metadata: { path: ['onec', 'ref'], equals: inv.ref } },
            ],
          },
        });

        const saleData = {
          date: new Date(inv.date),
          totalAmount: Math.round(inv.totalSum),
          external1CId: inv.ref,
          syncedTo1C: true,
          notes: inv.comment || `Счёт №${inv.number || 'б/н'} от ${inv.date}`,
          metadata: {
            ...(existingSale?.metadata as Record<string, unknown> || {}),
            onec: {
              ref: inv.ref,
              number: inv.number,
              posted: inv.posted,
              counterpartyRef: inv.counterpartyRef,
              organizationRef: inv.organizationRef,
              contractRef: inv.contractRef,
              lines: inv.lines.map(l => ({
                nomenclatureRef: l.nomenclatureRef,
                name: l.nomenclatureName,
                qty: l.quantity,
                price: l.price,
                sum: l.sum,
              })),
              lastSyncedAt: new Date().toISOString(),
            },
          },
        };

        if (existingSale) {
          await this.prisma.sale.update({
            where: { id: existingSale.id },
            data: saleData,
          });
          result.updated++;
        } else {
          await this.prisma.sale.create({
            data: {
              ...saleData,
              organizationId: this.orgId,
              ...(counterpartyOrg ? { counterpartyId: counterpartyOrg.id } : {}),
            },
          });
          result.created++;
        }
      } catch (err) {
        result.errors++;
        result.details.push(
          `Error syncing invoice ${inv.number}: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    return finalizeSyncResult(result);
  }

  // ─── Sales Document Sync (1C → LensFlow) ───────────────────────

  private async syncSalesDocuments(docs: import('./types').OneCSalesDocument[]): Promise<OneCSyncResult> {
    const result = createSyncResult('salesDocuments');

    for (const doc of docs) {
      try {
        const existingSale = await this.prisma.sale.findFirst({
          where: {
            OR: [
              { external1CId: doc.ref },
              { metadata: { path: ['onec', 'ref'], equals: doc.ref } },
            ],
          },
        });

        const counterpartyOrg = doc.counterpartyRef
          ? await this.prisma.organization.findFirst({
              where: { metadata: { path: ['onec', 'ref'], equals: doc.counterpartyRef } },
            })
          : null;

        const saleData = {
          date: new Date(doc.date),
          totalAmount: Math.round(doc.totalSum),
          external1CId: doc.ref,
          syncedTo1C: true,
          notes: doc.comment || `Реализация №${doc.number || 'б/н'} от ${doc.date}`,
          metadata: {
            ...(existingSale?.metadata as Record<string, unknown> || {}),
            onec: {
              ref: doc.ref,
              number: doc.number,
              type: 'РеализацияТоваровУслуг',
              posted: doc.posted,
              counterpartyRef: doc.counterpartyRef,
              organizationRef: doc.organizationRef,
              warehouseRef: doc.warehouseRef,
              invoiceRef: doc.invoiceRef,
              lines: doc.lines.map(l => ({
                nomenclatureRef: l.nomenclatureRef,
                name: l.nomenclatureName,
                qty: l.quantity,
                price: l.price,
                sum: l.sum,
              })),
              lastSyncedAt: new Date().toISOString(),
            },
          },
        };

        if (existingSale) {
          await this.prisma.sale.update({
            where: { id: existingSale.id },
            data: saleData,
          });
          result.updated++;
        } else {
          await this.prisma.sale.create({
            data: {
              ...saleData,
              organizationId: this.orgId,
              ...(counterpartyOrg ? { counterpartyId: counterpartyOrg.id } : {}),
            },
          });
          result.created++;
        }
      } catch (err) {
        result.errors++;
        result.details.push(
          `Error syncing sales doc ${doc.number}: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    return finalizeSyncResult(result);
  }

  // ─── Push Sales to 1C (LensFlow → 1C) ──────────────────────────

  private async pushUnsyncedSales(): Promise<OneCSyncResult> {
    const result = createSyncResult('pushSales');

    // Find sales not yet synced to 1C
    const unsyncedSales = await this.prisma.sale.findMany({
      where: {
        organizationId: this.orgId,
        syncedTo1C: false,
      },
      include: {
        organization: true,
        items: {
          include: { product: true },
        },
      },
      take: 50, // Process in batches
    });

    if (unsyncedSales.length === 0) {
      result.details.push('No unsynced sales to push');
      return finalizeSyncResult(result);
    }

    // Build invoices from sales
    const invoices: OneCInvoice[] = [];

    for (const sale of unsyncedSales) {
      try {
        // Find the 1C refs for organization and counterparty
        const orgRef = await this.getOneCRef(sale.organizationId, 'organization');
        const counterpartyRef = sale.counterpartyId
          ? await this.getOneCRef(sale.counterpartyId, 'counterparty')
          : null;

        if (!orgRef) {
          result.skipped++;
          result.details.push(`Sale ${sale.id}: Organization not linked to 1C`);
          continue;
        }

        const lines: OneCDocumentLine[] = (sale.items || []).map((item, idx) => ({
          lineNumber: idx + 1,
          nomenclatureRef: (item.product?.metadata as any)?.onec?.ref || '',
          nomenclatureName: item.product?.name1c || item.product?.name || '',
          quantity: item.quantity || 1,
          price: item.price || 0,
          sum: (item.quantity || 1) * (item.price || 0),
        }));

        invoices.push({
          date: sale.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          organizationRef: orgRef,
          counterpartyRef: counterpartyRef || '',
          comment: `LensFlow Sale #${sale.id}`,
          lines,
          totalSum: sale.totalAmount || lines.reduce((s, l) => s + l.sum, 0),
        });
      } catch (err) {
        result.errors++;
        result.details.push(
          `Error preparing sale ${sale.id}: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    if (invoices.length === 0) {
      result.details.push('No valid invoices to push');
      return finalizeSyncResult(result);
    }

    // Build XML package and upload
    try {
      const xmlPackage = buildUploadPackage({ invoices });
      const encodedData = Buffer.from(xmlPackage, 'utf-8').toString('base64');

      // Upload file in parts
      const fileId = `lf-${Date.now()}`;
      await this.client.putFilePart(fileId, 1, encodedData);
      await this.client.saveFileFromParts(fileId, 1);

      // Trigger upload
      await this.client.uploadData(
        this.exchangeConfig.exchangePlanName,
        this.exchangeConfig.nodeCode,
        fileId,
      );

      // Mark sales as synced
      for (const sale of unsyncedSales) {
        try {
          await this.prisma.sale.update({
            where: { id: sale.id },
            data: { syncedTo1C: true },
          });
          result.created++;
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      result.errors++;
      result.details.push(
        `Upload to 1C failed: ${err instanceof Error ? err.message : err}`
      );
    }

    return finalizeSyncResult(result);
  }

  // ─── Push Counterparty to 1C (LensFlow → 1C) ──────────────────

  /**
   * Push a single counterparty from LensFlow to 1C.
   * Used for bidirectional sync when a new counterparty is created in LensFlow.
   */
  async pushCounterparty(organizationId: string): Promise<{ success: boolean; ref?: string; error?: string }> {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) return { success: false, error: 'Organization not found' };

      // Check if already linked to 1C
      const onecMeta = (org.metadata as any)?.onec;
      if (onecMeta?.ref) {
        return { success: true, ref: onecMeta.ref };
      }

      const cp: OneCCounterparty = {
        ref: '', // Will be assigned by 1C
        deletionMark: false,
        inn: org.inn || '',
        fullName: org.fullName || org.name,
        shortName: org.name,
        isFolder: false,
        phone: org.phone || undefined,
        email: org.email || undefined,
        legalAddress: org.legalAddress || undefined,
        contactPerson: org.contactPerson || undefined,
      };

      const xmlPackage = buildUploadPackage({ counterparties: [cp] });
      const encodedData = Buffer.from(xmlPackage, 'utf-8').toString('base64');
      const fileId = `lf-cp-${Date.now()}`;
      
      await this.client.putFilePart(fileId, 1, encodedData);
      await this.client.saveFileFromParts(fileId, 1);
      await this.client.uploadData(
        this.exchangeConfig.exchangePlanName,
        this.exchangeConfig.nodeCode,
        fileId,
      );

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ─── Create Invoice in 1C ──────────────────────────────────────

  /**
   * Create an invoice (Счёт на оплату) in 1C for a sale/order.
   */
  async createInvoiceInOneC(options: {
    organizationId: string;
    counterpartyId: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
    comment?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const orgRef = await this.getOneCRef(options.organizationId, 'organization');
      const cpRef = await this.getOneCRef(options.counterpartyId, 'counterparty');

      if (!orgRef || !cpRef) {
        return { success: false, error: 'Organization or counterparty not linked to 1C' };
      }

      // Resolve product refs
      const lines: OneCDocumentLine[] = [];
      for (let i = 0; i < options.items.length; i++) {
        const item = options.items[i];
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });
        const productRef = (product?.metadata as any)?.onec?.ref || '';

        lines.push({
          lineNumber: i + 1,
          nomenclatureRef: productRef,
          nomenclatureName: product?.name1c || product?.name || '',
          quantity: item.quantity,
          price: item.price,
          sum: item.quantity * item.price,
        });
      }

      const invoice: OneCInvoice = {
        date: new Date().toISOString().split('T')[0],
        organizationRef: orgRef,
        counterpartyRef: cpRef,
        comment: options.comment || 'Created from LensFlow',
        lines,
        totalSum: lines.reduce((s, l) => s + l.sum, 0),
      };

      const xmlPackage = buildUploadPackage({ invoices: [invoice] });
      const encodedData = Buffer.from(xmlPackage, 'utf-8').toString('base64');
      const fileId = `lf-inv-${Date.now()}`;

      await this.client.putFilePart(fileId, 1, encodedData);
      await this.client.saveFileFromParts(fileId, 1);
      await this.client.uploadData(
        this.exchangeConfig.exchangePlanName,
        this.exchangeConfig.nodeCode,
        fileId,
      );

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private async ensureExchangeNode(): Promise<void> {
    if (this.exchangeNodeCreated) return;

    try {
      await this.client.createExchangeNode(
        this.exchangeConfig.exchangePlanName,
        this.exchangeConfig.nodeCode,
        this.exchangeConfig.nodeDescription,
      );
      this.exchangeNodeCreated = true;
    } catch (err) {
      // Node might already exist — that's ok
      if (err instanceof OneCError && err.fault?.faultString?.includes('уже существует')) {
        this.exchangeNodeCreated = true;
        return;
      }
      console.warn('[1C Sync] CreateExchangeNode warning:', err instanceof Error ? err.message : err);
      // Still mark as "attempted" to avoid repeated failures
      this.exchangeNodeCreated = true;
    }
  }

  private async getOneCRef(
    id: string,
    type: 'organization' | 'counterparty',
  ): Promise<string | null> {
    try {
      const org = await this.prisma.organization.findUnique({ where: { id } });
      if (!org) return null;
      return (org.metadata as any)?.onec?.ref || null;
    } catch {
      return null;
    }
  }
}
