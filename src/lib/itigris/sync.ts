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
    ItigrisClientInput,
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
            // If we have a `since` date, use the incremental changes endpoint.
            // Changes items are summaries — fetch full client info before upsert.
            if (since) {
                const changed = await this.api.getClientChanges(since);
                result.details.push(`Изменено клиентов с ${since}: ${changed.length}`);
                for (const c of changed) {
                    try {
                        const full = await this.api.getClient(c.id);
                        await this.upsertPatient(full, result);
                    } catch (err: any) {
                        // 409 = client belongs to a department we're not signed into — skip, not an error
                        if (err.response?.status === 409) {
                            result.details.push(`Клиент ${c.id}: другой департамент (409), пропущен`);
                            continue;
                        }
                        result.errors++;
                        result.details.push(`Ошибка клиента ${c.id}: ${err.message}`);
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
                        const clients = await this.api.searchClients(letter, 'FULL_NAME');
                        for (const client of clients) {
                            if (seenIds.has(client.id)) continue;
                            seenIds.add(client.id);
                            try {
                                // List doesn't include phone — get full client info
                                const fullClient = await this.api.getClient(client.id);
                                await this.upsertPatient(fullClient, result);
                            } catch (err: any) {
                                if (err.response?.status === 409) continue; // other department — skip
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
            // 1. Get all available departments
            const departments = await this.api.getDepartments();
            const storeDepts = departments.filter(d => d.type === 'STORE' || d.type === 'OFFICE');
            result.details.push(`Найдено ${storeDepts.length} филиалов для синхронизации заказов`);

            // 2. For each department — sign in, get orders with full params
            for (const dept of storeDepts) {
                try {
                    const ok = await this.api.signInToDepartment(dept.id);
                    if (!ok) {
                        result.details.push(`Нет доступа к филиалу: ${dept.name}`);
                        continue;
                    }

                    // Get all orders from this department (paginated)
                    let page = 0;
                    let hasMore = true;
                    while (hasMore) {
                        const { content, totalElements } = await this.api.getDepartmentOrders(page, 50);
                        if (content.length === 0) break;

                        for (const order of content) {
                            try {
                                // Get full details (prescription, lens, frame)
                                const fullOrder = await this.api.getOrderFull(order.id);
                                await this.upsertOrderFull(order, fullOrder, dept.id, result);
                            } catch (err: any) {
                                result.errors++;
                                result.details.push(`Ошибка заказа ${order.id}: ${err.message}`);
                            }
                        }

                        page++;
                        hasMore = (page * 50) < totalElements;
                    }

                    result.details.push(`Филиал ${dept.name}: обработано`);
                } catch (err: any) {
                    result.details.push(`Ошибка филиала ${dept.name}: ${err.message}`);
                }
            }

            // 3. Also sync orders per-client (for orders not appearing in dept journal)
            const patients = await (this.prisma as any).patient.findMany({
                where: {
                    organizationId: this.orgId,
                    externalSource: 'itigris',
                    externalId: { startsWith: 'itigris:' },
                },
                select: { externalId: true },
            });
            const clientIds = patients
                .map((p: any) => parseInt(p.externalId.replace('itigris:', ''), 10))
                .filter((id: number) => !isNaN(id));

            // Re-sign in with default dept to get client orders
            await this.api.signIn();
            result.details.push(`Синхронизация заказов для ${clientIds.length} клиентов...`);

            const clientOrders = await this.api.getAllOrders(clientIds);
            for (const order of clientOrders) {
                try {
                    // Check if already synced
                    const existing = await (this.prisma as any).order.findFirst({
                        where: { organizationId: this.orgId, externalId: `itigris:${order.id}` },
                    });
                    if (!existing) {
                        await this.upsertOrderFull(order, null, undefined, result);
                    }
                } catch (err: any) {
                    result.errors++;
                }
            }
        } catch (err: any) {
            result.errors++;
            result.details.push(`Ошибка загрузки заказов: ${err.message}`);
        }

        return result;
    }

    private buildLensConfig(fullOrder: any): object {
        if (!fullOrder) return {};

        const rx = fullOrder.medicalData?.prescriptions?.[0];
        const goods = fullOrder.goods || [];
        const odLens = goods.find((g: any) => g.isRight === true);
        const osLens = goods.find((g: any) => g.isRight === false);

        return {
            source: 'itigris',
            orderType: fullOrder.type,
            prescription: rx ? {
                od: {
                    sph: rx.sphOd,
                    cyl: rx.cylOd,
                    ax: rx.axOd,
                    add: rx.addOd,
                    pd: rx.dppOd,
                    visus: rx.visusOd,
                },
                os: {
                    sph: rx.sphOs,
                    cyl: rx.cylOs,
                    ax: rx.axOs,
                    add: rx.addOs,
                    pd: rx.dppOs,
                    visus: rx.visusOs,
                },
                totalPd: rx.dpp,
                purpose: rx.purpose,
                recommendedLenses: rx.recommendedLenses,
                notes: rx.comments,
                date: rx.date,
                doctor: rx.doctor?.fullName || null,
            } : null,
            lens: {
                od: odLens?.goodParams ? {
                    manufacturer: odLens.goodParams.manufacturer,
                    brand: odLens.goodParams.brand,
                    cover: odLens.goodParams.cover,
                    color: odLens.goodParams.color,
                    index: odLens.goodParams.refractionIndex,
                    diameter: odLens.goodParams.diameter,
                    material: odLens.goodParams.material,
                    geometry: odLens.goodParams.geometry,
                    dioptre: odLens.goodParams.dioptre,
                    cyl: odLens.goodParams.cylinderDioptre,
                    add: odLens.goodParams.add,
                    price: odLens.totalSoldPrice,
                } : null,
                os: osLens?.goodParams ? {
                    manufacturer: osLens.goodParams.manufacturer,
                    brand: osLens.goodParams.brand,
                    cover: osLens.goodParams.cover,
                    color: osLens.goodParams.color,
                    index: osLens.goodParams.refractionIndex,
                    diameter: osLens.goodParams.diameter,
                    material: osLens.goodParams.material,
                    geometry: osLens.goodParams.geometry,
                    dioptre: osLens.goodParams.dioptre,
                    cyl: osLens.goodParams.cylinderDioptre,
                    add: osLens.goodParams.add,
                    price: osLens.totalSoldPrice,
                } : null,
            },
            frame: fullOrder.clientGoods?.frame ? {
                type: fullOrder.clientGoods.frame.type,
                material: fullOrder.clientGoods.frame.material,
                description: fullOrder.clientGoods.frame.description,
            } : null,
            department: fullOrder.department?.name || null,
            seller: fullOrder.user?.fullName || null,
        };
    }

    private async upsertOrderFull(
        order: ItigrisOrder,
        fullOrder: any | null,
        deptId: number | undefined,
        result: ItigrisSyncResult
    ): Promise<void> {
        // Find patient linked to this order
        let patient: any = null;
        const clientId = order.clientId || fullOrder?.clientCardOwnerId || fullOrder?.client?.id;
        if (clientId) {
            patient = await (this.prisma as any).patient.findFirst({
                where: { organizationId: this.orgId, externalId: `itigris:${clientId}` },
            });
        }

        const lensflowStatus = this.mapOrderStatus(order.status || fullOrder?.status || '');
        const totalPrice = Math.round(order.sum || order.totalAmount || fullOrder?.sum || 0);
        const lensConfig = this.buildLensConfig(fullOrder);
        const orderNumber = `ITG-${order.id}`;

        const existing = await (this.prisma as any).order.findFirst({
            where: { organizationId: this.orgId, externalId: `itigris:${order.id}` },
        });

        if (existing) {
            // Update with new full data
            await (this.prisma as any).order.update({
                where: { id: existing.id },
                data: {
                    status: lensflowStatus,
                    totalPrice,
                    lensConfig,
                    notes: order.comment ? `ITIGRIS: ${order.comment}` : undefined,
                    patientId: patient?.id || existing.patientId,
                },
            });
            result.updated++;
        } else {
            // Check by orderNumber
            const existingByNum = await (this.prisma as any).order.findUnique({ where: { orderNumber } });
            if (existingByNum) {
                await (this.prisma as any).order.update({
                    where: { id: existingByNum.id },
                    data: { status: lensflowStatus, totalPrice, lensConfig, patientId: patient?.id || existingByNum.patientId },
                });
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
                    totalPrice,
                    lensConfig,
                    notes: order.comment ? `ITIGRIS: ${order.comment}` : undefined,
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

    // ----- Push: LensFlow → ITIGRIS (two-way write-back) -----

    /** Map a LensFlow Patient to an ITIGRIS client input (surname-first split). */
    private patientToItigrisInput(patient: any): ItigrisClientInput {
        const parts = String(patient.name || '').trim().split(/\s+/);
        const familyName = parts[0] || '';
        const firstName = parts[1] || '';
        const patronymicName = parts.slice(2).join(' ') || null;

        let day: number | null = null, month: number | null = null, year: number | null = null;
        if (patient.birthDate) {
            const d = new Date(patient.birthDate);
            if (!isNaN(d.getTime())) { day = d.getDate(); month = d.getMonth() + 1; year = d.getFullYear(); }
        }

        return {
            firstName,
            familyName,
            patronymicName,
            tel1: patient.phone || null,
            email: patient.email || null,
            birthdayDay: day,
            birthdayMonth: month,
            birthdayYear: year,
            gender: patient.gender === 'male' ? true : patient.gender === 'female' ? false : null,
            comment: patient.notes || null,
        };
    }

    /**
     * Push a LensFlow patient to ITIGRIS.
     *  - linked (externalId 'itigris:{id}') → safe partial update (PUT merge);
     *  - not linked → create + PD consent and store the new externalId,
     *    but only when createIfMissing is set (avoids pushing every CRM lead).
     * Returns the ITIGRIS client id, or null if nothing was pushed.
     */
    async pushPatient(patientId: string, opts: { createIfMissing?: boolean } = {}): Promise<number | null> {
        const patient = await (this.prisma as any).patient.findUnique({ where: { id: patientId } });
        if (!patient) return null;

        const input = this.patientToItigrisInput(patient);
        if (!input.familyName && !input.firstName) return null;

        const linked = typeof patient.externalId === 'string' && patient.externalId.startsWith('itigris:');
        if (linked) {
            const clientId = parseInt(patient.externalId.replace('itigris:', ''), 10);
            if (isNaN(clientId)) return null;
            await this.api.updateClientPartial(clientId, input);
            return clientId;
        }

        if (!opts.createIfMissing) return null;

        // ITIGRIS rejects client creation without a valid birthday.
        if (!input.birthdayDay || !input.birthdayMonth || !input.birthdayYear) {
            throw new Error(`Itigris: нельзя создать клиента без даты рождения (пациент ${patientId})`);
        }

        const newId = await this.api.createClientWithConsent(input);
        await (this.prisma as any).patient.update({
            where: { id: patientId },
            data: { externalId: `itigris:${newId}`, externalSource: 'itigris' },
        });
        return newId;
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
            'wait': 'new_order',
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
