/**
 * ITIGRIS Sync Service — Real API v.2
 *
 * Sync strategy (one-directional, ITIGRIS → LensFlow):
 *   1. Clients → Patients (matched by phone or externalId)
 *   2. Client Orders → view only (linked to patients)
 *   3. Client changes → incremental sync
 */

import { PrismaClient } from '@prisma/client';
import {
    ItigrisApiClient,
    ItigrisClient,
    ItigrisOrder,
    ItigrisSyncResult,
} from './client';

// ===================== Sync Service =====================

export class ItigrisSyncService {
    private api: ItigrisApiClient;
    private prisma: PrismaClient;
    private orgId: string;

    constructor(api: ItigrisApiClient, prisma: PrismaClient, orgId: string) {
        this.api = api;
        this.prisma = prisma;
        this.orgId = orgId;
    }

    // ----- Sync Clients → Patients -----

    /**
     * Search all clients by phone numbers from our patients
     * and update/create mappings. Or use changes endpoint for delta sync.
     */
    async syncClientChanges(since?: string): Promise<ItigrisSyncResult> {
        const result: ItigrisSyncResult = {
            entity: 'clients',
            created: 0,
            updated: 0,
            errors: 0,
            details: [],
        };

        try {
            // If we have a `since` date, use incremental changes endpoint
            if (since) {
                const clients = await this.api.getClientChanges(since);
                for (const client of clients) {
                    try {
                        await this.upsertPatient(client, result);
                    } catch (err: any) {
                        result.errors++;
                        result.details.push(`Ошибка клиента ${client.id}: ${err.message}`);
                    }
                }
            } else {
                // Full sync: search by common letter patterns to get all clients
                // ITIGRIS search requires at least a query — we search by common letters
                const searchLetters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К',
                    'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф',
                    'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Э', 'Ю', 'Я'];

                const seenIds = new Set<number>();

                for (const letter of searchLetters) {
                    try {
                        const clients = await this.api.searchClients(letter, 'FIO');
                        for (const client of clients) {
                            if (seenIds.has(client.id)) continue;
                            seenIds.add(client.id);
                            try {
                                await this.upsertPatient(client, result);
                            } catch (err: any) {
                                result.errors++;
                                result.details.push(`Ошибка клиента ${client.id}: ${err.message}`);
                            }
                        }
                    } catch (err: any) {
                        // Some letters may return empty — ok
                        result.details.push(`Поиск "${letter}": ${err.message}`);
                    }
                }
            }
        } catch (err: any) {
            result.errors++;
            result.details.push(`Ошибка загрузки клиентов: ${err.message}`);
        }

        return result;
    }

    private async upsertPatient(
        client: ItigrisClient,
        result: ItigrisSyncResult
    ): Promise<void> {
        // Skip deleted clients
        if (client.deleted) return;

        const fullName = [client.familyName, client.firstName, client.patronymicName]
            .filter(Boolean)
            .join(' ')
            .trim();

        if (!fullName) return;

        const phone = this.normalizePhone(client.tel1);

        // Build birthDate from day/month/year
        let birthDate: Date | undefined;
        if (client.birthdayYear && client.birthdayMonth && client.birthdayDay) {
            birthDate = new Date(client.birthdayYear, client.birthdayMonth - 1, client.birthdayDay);
        }

        // Try to find existing patient by ITIGRIS external ID or phone
        const existing = await (this.prisma as any).patient.findFirst({
            where: {
                organizationId: this.orgId,
                OR: [
                    { externalId: `itigris:${client.id}` },
                    ...(phone ? [{ phone }] : []),
                ],
            },
        });

        const patientData = {
            name: fullName,
            phone: phone || client.tel1 || '',
            email: client.email || undefined,
            birthDate: birthDate || undefined,
            gender: client.gender === true ? 'male' : client.gender === false ? 'female' : undefined,
            notes: client.comment || undefined,
            externalId: `itigris:${client.id}`,
            externalSource: 'itigris',
            organizationId: this.orgId,
        };

        if (existing) {
            await (this.prisma as any).patient.update({
                where: { id: existing.id },
                data: patientData,
            });
            result.updated++;
        } else {
            await (this.prisma as any).patient.create({
                data: patientData,
            });
            result.created++;
        }
    }

    // ----- Sync Orders -----

    async syncOrders(): Promise<ItigrisSyncResult> {
        const result: ItigrisSyncResult = {
            entity: 'orders',
            created: 0,
            updated: 0,
            errors: 0,
            details: [],
        };

        try {
            const orders = await this.api.getOrdersJournal();

            for (const order of orders) {
                try {
                    await this.upsertOrder(order, result);
                } catch (err: any) {
                    result.errors++;
                    result.details.push(`Ошибка заказа ${order.id}: ${err.message}`);
                }
            }
        } catch (err: any) {
            result.errors++;
            result.details.push(`Ошибка загрузки заказов: ${err.message}`);
        }

        return result;
    }

    private async upsertOrder(
        order: ItigrisOrder,
        result: ItigrisSyncResult
    ): Promise<void> {
        // Find the patient linked to this order
        let patient: any = null;
        if (order.clientId) {
            patient = await (this.prisma as any).patient.findFirst({
                where: {
                    organizationId: this.orgId,
                    externalId: `itigris:${order.clientId}`,
                },
            });
        }

        const existing = await (this.prisma as any).order.findFirst({
            where: {
                organizationId: this.orgId,
                externalId: `itigris:${order.id}`,
            },
        });

        const lensflowStatus = this.mapOrderStatus(order.status || order.statusName || '');

        if (existing) {
            await (this.prisma as any).order.update({
                where: { id: existing.id },
                data: {
                    status: lensflowStatus,
                    notes: order.comment ? `ITIGRIS: ${order.comment}` : undefined,
                },
            });
            result.updated++;
        } else {
            // Create a new order requires lensConfig
            const orderNumber = `ITG-${order.id}`;

            // Check if orderNumber exists
            const existingByNumber = await (this.prisma as any).order.findUnique({
                where: { orderNumber },
            });
            if (existingByNumber) {
                result.updated++;
                return;
            }

            await (this.prisma as any).order.create({
                data: {
                    externalId: `itigris:${order.id}`,
                    source: 'itigris',
                    orderNumber,
                    patientId: patient?.id || undefined,
                    organizationId: this.orgId,
                    status: lensflowStatus,
                    totalPrice: Math.round(order.totalAmount || 0),
                    lensConfig: {}, // Empty — ITIGRIS orders have different structure
                    notes: `Импорт из ITIGRIS. ${order.type || ''} ${order.comment || ''}`.trim(),
                },
            });
            result.created++;
        }
    }

    // ----- Full Sync -----

    async fullSync(since?: string): Promise<ItigrisSyncResult[]> {
        const results: ItigrisSyncResult[] = [];

        // Order matters: clients first, then orders
        results.push(await this.syncClientChanges(since));
        results.push(await this.syncOrders());

        return results;
    }

    // ----- Helpers -----

    private normalizePhone(phone?: string | null): string | null {
        if (!phone) return null;
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 11 && digits.startsWith('8')) {
            return '+7' + digits.slice(1);
        }
        if (digits.length === 11 && digits.startsWith('7')) {
            return '+' + digits;
        }
        if (digits.length === 10) {
            return '+7' + digits;
        }
        return phone;
    }

    private mapOrderStatus(itigrisStatus: string): string {
        const s = (itigrisStatus || '').toLowerCase();
        const statusMap: Record<string, string> = {
            'новый': 'new_order',
            'new': 'new_order',
            'в работе': 'in_production',
            'in_progress': 'in_production',
            'в производстве': 'in_production',
            'готов': 'ready',
            'ready': 'ready',
            'готов к выдаче': 'ready',
            'выдан': 'delivered',
            'issued': 'delivered',
            'отправлен': 'shipped',
            'shipped': 'shipped',
            'отменен': 'cancelled',
            'отменён': 'cancelled',
            'cancelled': 'cancelled',
        };
        return statusMap[s] || 'new_order';
    }
}
