/**
 * ITIGRIS Sync Service
 *
 * Handles bidirectional data synchronization between ITIGRIS Optima and LensFlow CRM.
 * Supports incremental sync via updatedAfter timestamps.
 *
 * Sync strategy:
 *   1. Clients → Patients (ITIGRIS → LensFlow, matched by phone)
 *   2. Orders → Orders (ITIGRIS → LensFlow, matched by external ID)
 *   3. Prescriptions → Prescriptions (ITIGRIS → LensFlow, linked to patients)
 */

import { PrismaClient } from '@prisma/client';
import {
    ItigrisApiClient,
    ItigrisClient,
    ItigrisOrder,
    ItigrisPrescription,
    ItigrisSyncResult,
    ItigrisConfig,
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

    async syncClients(updatedAfter?: string): Promise<ItigrisSyncResult> {
        const result: ItigrisSyncResult = {
            entity: 'clients',
            created: 0,
            updated: 0,
            errors: 0,
            details: [],
        };

        let page = 1;
        let hasMore = true;

        while (hasMore) {
            try {
                const { data: clients, total } = await this.api.getClients({
                    page,
                    limit: 50,
                    updatedAfter,
                });

                for (const client of clients) {
                    try {
                        await this.upsertPatient(client, result);
                    } catch (err: any) {
                        result.errors++;
                        result.details.push(`Ошибка клиента ${client.id}: ${err.message}`);
                    }
                }

                hasMore = clients.length === 50 && page * 50 < total;
                page++;
            } catch (err: any) {
                result.errors++;
                result.details.push(`Ошибка загрузки страницы ${page}: ${err.message}`);
                hasMore = false;
            }
        }

        return result;
    }

    private async upsertPatient(
        client: ItigrisClient,
        result: ItigrisSyncResult
    ): Promise<void> {
        const phone = this.normalizePhone(client.phone);
        const fullName = [client.lastName, client.firstName, client.middleName]
            .filter(Boolean)
            .join(' ')
            .trim();

        if (!fullName) return;

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
            phone: phone || undefined,
            email: client.email || undefined,
            birthDate: client.birthDate ? new Date(client.birthDate) : undefined,
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

    async syncOrders(updatedAfter?: string): Promise<ItigrisSyncResult> {
        const result: ItigrisSyncResult = {
            entity: 'orders',
            created: 0,
            updated: 0,
            errors: 0,
            details: [],
        };

        let page = 1;
        let hasMore = true;

        while (hasMore) {
            try {
                const { data: orders, total } = await this.api.getOrders({
                    page,
                    limit: 50,
                    updatedAfter,
                });

                for (const order of orders) {
                    try {
                        await this.upsertOrder(order, result);
                    } catch (err: any) {
                        result.errors++;
                        result.details.push(`Ошибка заказа ${order.number}: ${err.message}`);
                    }
                }

                hasMore = orders.length === 50 && page * 50 < total;
                page++;
            } catch (err: any) {
                result.errors++;
                result.details.push(`Ошибка загрузки страницы ${page}: ${err.message}`);
                hasMore = false;
            }
        }

        return result;
    }

    private async upsertOrder(
        order: ItigrisOrder,
        result: ItigrisSyncResult
    ): Promise<void> {
        // Find the patient linked to this order
        const patient = await (this.prisma as any).patient.findFirst({
            where: {
                organizationId: this.orgId,
                externalId: `itigris:${order.clientId}`,
            },
        });

        if (!patient) {
            result.details.push(
                `Заказ ${order.number}: пациент itigris:${order.clientId} не найден — сначала синхронизируйте клиентов`
            );
            result.errors++;
            return;
        }

        const existing = await (this.prisma as any).order.findFirst({
            where: {
                organizationId: this.orgId,
                externalId: `itigris:${order.id}`,
            },
        });

        const lensflowStatus = this.mapOrderStatus(order.status);

        const orderData = {
            externalId: `itigris:${order.id}`,
            externalSource: 'itigris',
            orderNumber: order.number,
            patientId: patient.id,
            organizationId: this.orgId,
            status: lensflowStatus,
            totalPrice: order.totalAmount,
            notes: `Импорт из ITIGRIS. Тип: ${order.type}`,
        };

        if (existing) {
            await (this.prisma as any).order.update({
                where: { id: existing.id },
                data: { status: lensflowStatus },
            });
            result.updated++;
        } else {
            await (this.prisma as any).order.create({
                data: orderData,
            });
            result.created++;
        }
    }

    // ----- Sync Prescriptions -----

    async syncPrescriptions(updatedAfter?: string): Promise<ItigrisSyncResult> {
        const result: ItigrisSyncResult = {
            entity: 'prescriptions',
            created: 0,
            updated: 0,
            errors: 0,
            details: [],
        };

        try {
            const { data: prescriptions } = await this.api.getPrescriptions({ updatedAfter });

            for (const rx of prescriptions) {
                try {
                    await this.upsertPrescription(rx, result);
                } catch (err: any) {
                    result.errors++;
                    result.details.push(`Ошибка рецепта ${rx.id}: ${err.message}`);
                }
            }
        } catch (err: any) {
            result.errors++;
            result.details.push(`Ошибка загрузки рецептов: ${err.message}`);
        }

        return result;
    }

    private async upsertPrescription(
        rx: ItigrisPrescription,
        result: ItigrisSyncResult
    ): Promise<void> {
        const patient = await (this.prisma as any).patient.findFirst({
            where: {
                organizationId: this.orgId,
                externalId: `itigris:${rx.clientId}`,
            },
        });

        if (!patient) return;

        const existing = await (this.prisma as any).prescription.findFirst({
            where: {
                patientId: patient.id,
                externalId: `itigris:${rx.id}`,
            },
        });

        const rxData = {
            externalId: `itigris:${rx.id}`,
            externalSource: 'itigris',
            patientId: patient.id,
            doctorName: rx.doctorName,
            date: new Date(rx.date),
            odSph: rx.od?.sph,
            odCyl: rx.od?.cyl,
            odAx: rx.od?.ax,
            odAdd: rx.od?.add,
            osSph: rx.os?.sph,
            osCyl: rx.os?.cyl,
            osAx: rx.os?.ax,
            osAdd: rx.os?.add,
        };

        if (existing) {
            await (this.prisma as any).prescription.update({
                where: { id: existing.id },
                data: rxData,
            });
            result.updated++;
        } else {
            await (this.prisma as any).prescription.create({
                data: rxData,
            });
            result.created++;
        }
    }

    // ----- Full Sync -----

    async fullSync(updatedAfter?: string): Promise<ItigrisSyncResult[]> {
        const results: ItigrisSyncResult[] = [];

        // Order matters: clients first, then orders and prescriptions
        results.push(await this.syncClients(updatedAfter));
        results.push(await this.syncOrders(updatedAfter));
        results.push(await this.syncPrescriptions(updatedAfter));

        return results;
    }

    // ----- Helpers -----

    private normalizePhone(phone?: string): string | null {
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
        const statusMap: Record<string, string> = {
            'new': 'new',
            'новый': 'new',
            'in_progress': 'in_production',
            'в работе': 'in_production',
            'ready': 'ready',
            'готов': 'ready',
            'issued': 'delivered',
            'выдан': 'delivered',
            'cancelled': 'cancelled',
            'отменен': 'cancelled',
            'отменён': 'cancelled',
        };
        return statusMap[itigrisStatus.toLowerCase()] || 'new';
    }
}
