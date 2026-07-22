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
    ItigrisGoodsCategory,
    ItigrisOrder,
    ItigrisRemainItem,
    ItigrisSyncResult,
} from './client';
import type { ItigrisRemoteClient, RemoteProduct } from './remote';

// ITIGRIS goods category → LensFlow OpticProduct.category
const GOODS_CATEGORY_MAP: Record<ItigrisGoodsCategory, string> = {
    'glasses': 'frame',
    'lenses': 'spectacle_lens',
    'sunglasses': 'sun_glasses',
    'contact-lenses': 'contact_lens',
    'accessories': 'accessory',
};

const GOODS_CATEGORY_FALLBACK_NAME: Record<ItigrisGoodsCategory, string> = {
    'glasses': 'Оправа',
    'lenses': 'Очковая линза',
    'sunglasses': 'Солнцезащитные очки',
    'contact-lenses': 'Контактные линзы',
    'accessories': 'Аксессуар',
};

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

        // Extra ITIGRIS fields LensFlow's Patient columns don't cover — stash in metadata.itigris.
        const card: any = (client as any).clientCard || null;
        const itigrisExtras: any = {
            cardId: card?.id ?? null,
            cardSum: card?.sum ?? null,
            bonuses: card?.bonusesSum ?? null,
            discount: card?.discount ?? null,            // per-category discount %
            vipDiscount: (client as any).vipDiscount ?? null,
            city: client.city ?? null,
            address: client.address ?? null,
            profession: client.profession ?? null,
            employmentPlace: client.employmentPlace ?? null,
            tel2: client.tel2 ?? null,
            ordersSum: (client as any).ordersSum ?? null,
            informationSource: (client as any).informationSource ?? null,
        };

        const patientData = {
            name: fullName,
            phone: phone || client.tel1 || '',
            email: client.email || undefined,
            birthDate: birthDate || undefined,
            gender: client.gender === true ? 'male' : client.gender === false ? 'female' : undefined,
            notes: client.comment || undefined,
            metadata: { ...((existing as any)?.metadata || {}), itigris: itigrisExtras },
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

    // ----- Sync Patients (Standalone) -----

    /**
     * Incrementally sync patients modified since a given date.
     * Use this in a cron to keep the LensFlow patient database updated 
     * even for clients without recent orders.
     */
    async syncPatients(since: Date): Promise<ItigrisSyncResult> {
        const result: ItigrisSyncResult = {
            entity: 'clients',
            created: 0,
            updated: 0,
            errors: 0,
            details: [],
        };

        try {
            // The API returns summaries (id, name, phone). 
            // We need to fetch the full client to get address, email, gender, etc.
            const sinceIso = since.toISOString().slice(0, 19) + 'Z';
            const changes = await this.api.getClientChanges(sinceIso);
            
            result.details.push(`Найдено измененных клиентов: ${changes.length}`);

            for (const summary of changes) {
                try {
                    const fullClient = await this.api.getClient(summary.id);
                    await this.upsertPatient(fullClient, result);
                } catch (err: any) {
                    result.errors++;
                    result.details.push(`Ошибка загрузки клиента ${summary.id}: ${err.message}`);
                }
            }
        } catch (err: any) {
            result.errors++;
            result.details.push(`Ошибка получения изменений клиентов: ${err.message}`);
        }

        return result;
    }

    // ----- Sync Orders -----

    async syncOrders(opts?: { forceStatus?: string, skipExisting?: boolean, departmentId?: number }): Promise<ItigrisSyncResult> {
        const result: ItigrisSyncResult = {
            entity: 'orders',
            created: 0,
            updated: 0,
            errors: 0,
            details: [],
        };

        try {
            // 1. Get all available departments
            let departments = await this.api.getDepartments();
            if (opts?.departmentId) {
                departments = departments.filter(d => d.id === opts.departmentId);
            }
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
                    
                    // Stop fetching if we go older than 6 months
                    const limitDate = new Date();
                    limitDate.setMonth(limitDate.getMonth() - 6);
                    let reachedLimit = false;

                    while (hasMore && !reachedLimit) {
                        const { content, totalElements } = await this.api.getDepartmentOrders(page, 50);
                        if (content.length === 0) break;

                        for (const order of content) {
                            const orderDate = new Date(order.createdAt || Date.now());
                            if (orderDate < limitDate) {
                                reachedLimit = true;
                                break; // Stop processing this page, we hit the 6-month limit
                            }
                            try {
                                if (opts?.skipExisting) {
                                    const orderNumber = `ITG-${order.id}`;
                                    const existing = await (this.prisma as any).order.findUnique({ where: { orderNumber } });
                                    if (existing) {
                                        continue; // skip full fetch to save API requests and time
                                    }
                                }

                                // Get full details (prescription, lens, frame)
                                const fullOrder = await this.api.getOrderFull(order.id);
                                await this.upsertOrderFull(order, fullOrder, dept.id, result, opts?.forceStatus);
                            } catch (err: any) {
                                result.errors++;
                                result.details.push(`Ошибка заказа ${order.id}: ${err.message}`);
                                // Optional: pause briefly on network errors to avoid hammering
                                if (err.message?.includes('ENOTFOUND') || err.message?.includes('ECONNREFUSED')) {
                                    await new Promise(r => setTimeout(r, 1000));
                                }
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
                        await this.upsertOrderFull(order, null, undefined, result, opts?.forceStatus);
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

        // Full line-item list (all goods + frame + services) so the order card can
        // show what's actually in the order — especially SALE orders with no Rx.
        const buildGoodName = (g: any): string => {
            const p = g.goodParams || {};
            const parts = [p.brand || p.manufacturer, p.geometry, p.color, p.material]
                .filter((x: any) => x != null && String(x).trim() !== '');
            return parts.join(' ').trim() || g.category || 'Товар';
        };
        const items: any[] = [];
        for (const g of goods) {
            items.push({
                kind: 'good',
                category: g.goodParams?.sellableCategory || g.category || null,
                name: buildGoodName(g),
                eye: g.isRight === true ? 'OD' : g.isRight === false ? 'OS' : null,
                qty: g.quantity || 1,
                price: g.totalSoldPrice || 0,
            });
        }
        if (fullOrder.clientGoods?.frame) {
            const f = fullOrder.clientGoods.frame;
            items.push({
                kind: 'frame',
                category: 'FRAME',
                name: [f.type, f.material, f.description].filter(Boolean).join(' ').trim() || 'Оправа',
                qty: 1,
                price: f.estimatedPrice || 0,
            });
        }
        for (const s of (fullOrder.servicesInfo?.services || [])) {
            items.push({
                kind: 'service',
                category: 'SERVICE',
                name: s.serveType?.name || 'Услуга',
                qty: 1,
                price: s.soldPrice || 0,
            });
        }

        return {
            source: 'itigris',
            orderType: fullOrder.type,
            items,
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
        result: ItigrisSyncResult,
        forceStatus?: string
    ): Promise<void> {
        // Find patient linked to this order
        let patient: any = null;
        const clientId = order.clientId || fullOrder?.clientCardOwnerId || fullOrder?.client?.id;
        if (clientId) {
            patient = await (this.prisma as any).patient.findFirst({
                where: { organizationId: this.orgId, externalId: `itigris:${clientId}` },
            });
        }

        let lensflowStatus = forceStatus || this.mapOrderStatus(order.status || fullOrder?.status || '');
        
        // Force ALL Itigris orders to 'delivered' so they don't clutter production, 
        // as they are already managed in Itigris or just imported for history.
        if (!forceStatus) {
            lensflowStatus = 'delivered';
        }
        const totalPrice = Math.round(order.sum || order.totalAmount || fullOrder?.sum || 0);
        const lensConfig: any = this.buildLensConfig(fullOrder);
        const orderNumber = `ITG-${order.id}`;

        // Payment summary — `paidSum` is present on the order journal object, the
        // per-client orders list, AND /orders/{id}/full (the latter also carries a
        // `payments` breakdown by method). Stash in lensConfig for the order card.
        const paidSum = Math.round(Number(order.paidSum ?? fullOrder?.paidSum ?? 0) || 0);
        if (totalPrice > 0 || paidSum > 0) {
            const methods = Array.isArray(fullOrder?.payments)
                ? fullOrder.payments.map((p: any) => ({ type: p.paymentType, sum: Number(p.sum) || 0 }))
                : undefined;
            lensConfig.payment = {
                sum: totalPrice,
                paid: paidSum,
                due: Math.max(0, totalPrice - paidSum),
                ...(methods && methods.length ? { methods } : {}),
            };
        }
        // Mirror onto the native paymentStatus enum so dashboard badges/filters work.
        const paymentStatus: 'paid' | 'partial' | 'unpaid' | undefined =
            totalPrice > 0 ? (paidSum >= totalPrice ? 'paid' : paidSum > 0 ? 'partial' : 'unpaid') : undefined;

        // Capture the patient's prescription from this order into their Rx history.
        if (patient?.id && fullOrder) {
            try { await this.upsertPrescriptionFromOrder(patient.id, fullOrder, order); } catch { /* non-fatal */ }
        }

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
                    ...(paymentStatus ? { paymentStatus } : {}),
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
                    data: { status: lensflowStatus, totalPrice, lensConfig, ...(paymentStatus ? { paymentStatus } : {}), patientId: patient?.id || existingByNum.patientId },
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
                    ...(paymentStatus ? { paymentStatus } : {}),
                    notes: order.comment ? `ITIGRIS: ${order.comment}` : undefined,
                },
            });
            result.created++;
        }
    }

    /** Upsert a patient Prescription from an order's medical data (idempotent by order id). */
    private async upsertPrescriptionFromOrder(patientId: string, fullOrder: any, order: ItigrisOrder): Promise<void> {
        const rx = fullOrder?.medicalData?.prescriptions?.[0];
        if (!rx) return;
        // Skip empty prescriptions (no measurable values).
        const hasData = [rx.sphOd, rx.sphOs, rx.cylOd, rx.cylOs, rx.addOd, rx.addOs].some((v: any) => v != null);
        if (!hasData) return;

        let prescribedAt = new Date();
        const rawDate = rx.date || (order as any).createdAt;
        if (rawDate) { const d = new Date(rawDate); if (!isNaN(d.getTime())) prescribedAt = d; }

        const typeMap: Record<string, string> = { CONTACT_LENS: 'contacts', GLASSES: 'glasses' };
        const orderIdentifier = `[ITIGRIS_ORDER:${order.id}]`;
        const data: any = {
            patientId,
            odSph: rx.sphOd ?? null, odCyl: rx.cylOd ?? null, odAx: rx.axOd ?? null, odAdd: rx.addOd ?? null, odPd: rx.dppOd ?? null,
            osSph: rx.sphOs ?? null, osCyl: rx.cylOs ?? null, osAx: rx.axOs ?? null, osAdd: rx.addOs ?? null, osPd: rx.dppOs ?? null,
            pdTotal: rx.dpp ?? null,
            type: typeMap[fullOrder.type] || 'glasses',
            notes: [rx.purpose, rx.comments, rx.doctor?.fullName ? `Врач: ${rx.doctor.fullName}` : null, orderIdentifier].filter(Boolean).join(' · ') || null,
            prescribedAt,
        };

        const existing = await (this.prisma as any).prescription.findFirst({ 
            where: { patientId, notes: { contains: orderIdentifier } } 
        });
        if (existing) {
            await (this.prisma as any).prescription.update({ where: { id: existing.id }, data });
        } else {
            await (this.prisma as any).prescription.create({ data });
        }
    }

    // ----- Sync Appointments (registry records) -----

    /**
     * Import the appointment journal (registry-records) from ITIGRIS into Appointment.
     * Matches the patient by ITIGRIS client id or phone; idempotent by registry id.
     */
    async syncAppointments(): Promise<ItigrisSyncResult> {
        const result: ItigrisSyncResult = { entity: 'appointments', created: 0, updated: 0, errors: 0, details: [] };
        try {
            const departments = await this.api.getDepartments();
            const storeDepts = departments.filter(d => d.type === 'STORE' || d.type === 'OFFICE');

            const from = new Date(); from.setFullYear(from.getFullYear() - 2);
            const to = new Date(); to.setFullYear(to.getFullYear() + 1);
            const fmt = (d: Date) => d.toISOString().slice(0, 10);

            for (const dept of storeDepts) {
                const ok = await this.api.signInToDepartment(dept.id);
                if (!ok) continue;
                let records: any[];
                try {
                    records = await this.api.getRegistryRecords({ appointmentFrom: fmt(from), appointmentTo: fmt(to), departmentId: dept.id });
                } catch (err: any) {
                    if (err.response?.status === 403) { result.details.push(`${dept.name}: нет доступа к записям (403)`); continue; }
                    throw err;
                }
                for (const rec of records) {
                    try { await this.upsertAppointment(rec, result); }
                    catch (err: any) { result.errors++; result.details.push(`Ошибка записи ${rec.id}: ${err.message}`); }
                }
                result.details.push(`${dept.name}: записей ${records.length}`);
            }
        } catch (err: any) {
            result.errors++;
            result.details.push(`Ошибка загрузки записей: ${err.message}`);
        }
        return result;
    }

    private async upsertAppointment(rec: any, result: ItigrisSyncResult): Promise<void> {
        const date = rec.appointmentAt ? new Date(rec.appointmentAt) : null;
        if (!date || isNaN(date.getTime())) return;

        // Match patient by ITIGRIS client id or normalized phone.
        const phone = this.normalizePhone(rec.client?.phone);
        const cid = rec.client?.id;
        const patient = await (this.prisma as any).patient.findFirst({
            where: {
                organizationId: this.orgId,
                OR: [
                    ...(cid ? [{ externalId: `itigris:${cid}` }] : []),
                    ...(phone ? [{ phone }] : []),
                ],
            },
            select: { id: true },
        });

        const statusMap: Record<string, string> = {
            CONFIRMED: 'scheduled', SCHEDULED: 'scheduled', WAITING: 'scheduled', NEW: 'scheduled', PLANNED: 'scheduled',
            FINISHED: 'completed', COMPLETED: 'completed', DONE: 'completed',
            CANCELLED: 'cancelled', CANCELED: 'cancelled', NO_SHOW: 'no_show',
        };
        const status = statusMap[String(rec.status || '').toUpperCase()] || (rec.finishedAt ? 'completed' : 'scheduled');

        const externalId = `itigris:registry:${rec.id}`;
        const data: any = {
            patientId: patient?.id || undefined,
            patientName: rec.client?.fullName || null,
            patientPhone: rec.client?.phone || null,
            clinicId: this.orgId,
            date,
            status,
            type: 'consultation',
            notes: rec.serviceType?.name ? `Itigris: ${rec.serviceType.name}` : null,
            externalId,
            externalSource: 'itigris',
        };

        const existing = await (this.prisma as any).appointment.findFirst({ where: { externalId } });
        if (existing) {
            await (this.prisma as any).appointment.update({ where: { id: existing.id }, data });
            result.updated++;
        } else {
            await (this.prisma as any).appointment.create({ data });
            result.created++;
        }
    }

    // ----- Sync Products (catalog / stock remains) -----

    /**
     * Import the goods catalog from ITIGRIS into OpticProduct.
     * Iterates every goods category × every store/office department, pages through
     * /good/remains/{category}, aggregates stock across departments by a stable
     * signature, and upserts one OpticProduct per distinct variant.
     * Idempotent: re-running updates stock/price in place (keyed by synthesized sku).
     */
    async syncProducts(): Promise<ItigrisSyncResult> {
        const result: ItigrisSyncResult = {
            entity: 'products',
            created: 0,
            updated: 0,
            errors: 0,
            details: [],
        };

        const categories: ItigrisGoodsCategory[] = [
            'glasses', 'lenses', 'sunglasses', 'contact-lenses', 'accessories',
        ];

        try {
            const departments = await this.api.getDepartments();
            const storeDepts = departments.filter(d => d.type === 'STORE' || d.type === 'OFFICE');
            result.details.push(`Филиалов для остатков: ${storeDepts.length}`);

            // signature → aggregated variant (stock summed across departments)
            const agg = new Map<string, {
                item: ItigrisRemainItem;
                category: ItigrisGoodsCategory;
                stock: number;
                price: number;
            }>();

            for (const cat of categories) {
                let catRows = 0;
                let accessDenied = false;

                for (const dept of storeDepts) {
                    const ok = await this.api.signInToDepartment(dept.id);
                    if (!ok) continue;

                    let page = 0;
                    while (page < 500) {
                        let rows: ItigrisRemainItem[];
                        try {
                            rows = await this.api.getRemains(cat, dept.id, page);
                        } catch (err: any) {
                            if (err.response?.status === 403) { accessDenied = true; break; }
                            throw err;
                        }
                        if (!rows.length) break;

                        for (const row of rows) {
                            const sig = this.productSignature(cat, row);
                            const stock = Number(row.amount) || 0;
                            const price = Number(row.price) || 0;
                            const ex = agg.get(sig);
                            if (ex) {
                                ex.stock += stock;
                                if (price > ex.price) ex.price = price;
                            } else {
                                agg.set(sig, { item: row, category: cat, stock, price });
                            }
                            catRows++;
                        }
                        page++;
                    }
                    if (accessDenied) break;
                }

                if (accessDenied) {
                    result.errors++;
                    result.details.push(`${cat}: доступ к остаткам запрещен (403)`);
                } else if (catRows > 0) {
                    result.details.push(`${cat}: строк остатков ${catRows}`);
                }
            }

            // Upsert one OpticProduct per distinct variant.
            for (const [sig, p] of agg) {
                try {
                    await this.upsertProduct(sig, p.category, p.item, p.stock, p.price, result);
                } catch (err: any) {
                    result.errors++;
                    result.details.push(`Ошибка товара ${sig}: ${err.message}`);
                }
            }
            result.details.push(`Уникальных позиций: ${agg.size}`);
        } catch (err: any) {
            result.errors++;
            result.details.push(`Ошибка загрузки остатков: ${err.message}`);
        }

        return result;
    }

    /**
     * Catalog via LEGACY RemoteAPI (remoteRemains/list) — alternative to the v2
     * `syncProducts` that needs a store-role v2 user. Uses the RemoteAPI key.
     * Barcode-less: rows are grouped by params; we aggregate stock by signature
     * across pages/departments and upsert one OpticProduct per variant.
     * NOTE: built to the documented contract; field names (amount/count) may need
     * a tweak on first run with a live key.
     */
    async syncProductsLegacy(remote: ItigrisRemoteClient): Promise<ItigrisSyncResult> {
        const result: ItigrisSyncResult = { entity: 'products', created: 0, updated: 0, errors: 0, details: [] };
        const cats: [RemoteProduct, ItigrisGoodsCategory][] = [
            ['glasses', 'glasses'],
            ['lenses', 'lenses'],
            ['sunglasses', 'sunglasses'],
            ['contactlenses', 'contact-lenses'],
            ['accessories', 'accessories'],
        ];

        const agg = new Map<string, { item: ItigrisRemainItem; category: ItigrisGoodsCategory; stock: number; price: number }>();

        for (const [rp, cat] of cats) {
            let catRows = 0;
            try {
                let page = 1; // legacy pages are 1-based
                while (page < 200) {
                    const rows = await remote.remainsList(rp, undefined, page);
                    if (!rows.length) break;
                    for (const row of rows as ItigrisRemainItem[]) {
                        const sig = this.productSignature(cat, row);
                        const stock = Number((row as any).amount ?? (row as any).count ?? (row as any).quantity ?? 0) || 0;
                        const price = Number(row.price) || 0;
                        const ex = agg.get(sig);
                        if (ex) { ex.stock += stock; if (price > ex.price) ex.price = price; }
                        else agg.set(sig, { item: row, category: cat, stock, price });
                        catRows++;
                    }
                    page++;
                }
                result.details.push(`${rp}: строк ${catRows}`);
            } catch (err: any) {
                const s = err.response?.status;
                result.errors++;
                if (s === 403) {
                    result.details.push(`${rp}: доступ к остаткам запрещен (403)`);
                } else {
                    result.details.push(`${rp}: ${s === 401 ? '401 — проверьте RemoteAPI-ключ' : 'ошибка ' + (s || err.message)}`);
                }
            }
        }

        const aggEntries = Array.from(agg.entries());
        for (let i = 0; i < aggEntries.length; i += 50) {
            const chunk = aggEntries.slice(i, i + 50);
            await Promise.all(chunk.map(async ([sig, p]) => {
                try { await this.upsertProduct(sig, p.category, p.item, p.stock, p.price, result); }
                catch (err: any) { result.errors++; result.details.push(`Ошибка товара ${sig}: ${err.message}`); }
            }));
        }
        result.details.push(`Уникальных позиций: ${agg.size}`);
        return result;
    }

    /** Stable signature for a variant — all descriptive fields (excl. price/amount/dept). */
    private productSignature(cat: ItigrisGoodsCategory, row: ItigrisRemainItem): string {
        const idFields: Record<string, any> = { ...row };
        delete idFields.price;
        delete idFields.amount;
        delete idFields.departmentId;
        const str = cat + '|' + Object.keys(idFields).sort()
            .map(k => `${k}=${idFields[k] ?? ''}`).join('|');
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
        return `ITG-${cat}-${(h >>> 0).toString(36)}`;
    }

    /** Human-readable product name built from the category's descriptive fields. */
    private buildProductName(cat: ItigrisGoodsCategory, row: ItigrisRemainItem): string {
        const j = (...vals: any[]) =>
            vals.filter(v => v != null && String(v).trim() !== '').join(' ').trim();
        let name = '';
        switch (cat) {
            case 'glasses':
            case 'sunglasses':
                name = j(row.brand || row.manufacturer, row.model, row.color);
                break;
            case 'lenses':
                name = j(
                    row.brand || row.manufacturer,
                    row.refractionIndex != null ? `n${row.refractionIndex}` : null,
                    row.cover,
                    row.geometry,
                    row.diameter != null ? `Ø${row.diameter}` : null,
                );
                break;
            case 'contact-lenses':
                name = j(
                    row.manufacturer,
                    row.name,
                    row.curvatureRadius != null && row.diameter != null
                        ? `${row.curvatureRadius}/${row.diameter}` : null,
                    row.dioptre != null ? `${row.dioptre} D` : null,
                );
                break;
            case 'accessories':
                name = j(row.model, row.category);
                break;
        }
        return name || GOODS_CATEGORY_FALLBACK_NAME[cat];
    }

    private async upsertProduct(
        sku: string,
        cat: ItigrisGoodsCategory,
        row: ItigrisRemainItem,
        stock: number,
        price: number,
        result: ItigrisSyncResult,
    ): Promise<void> {
        const category = GOODS_CATEGORY_MAP[cat];
        const name = this.buildProductName(cat, row);
        const brand = row.brand || row.manufacturer || null;
        const model = row.model || row.name || null;

        // specs = all descriptive fields + source marker (no price/amount/dept)
        const specs: Record<string, any> = { ...row, source: 'itigris', itigrisCategory: cat };
        delete specs.price;
        delete specs.amount;
        delete specs.departmentId;

        const data = {
            name,
            category,
            type: 'product',
            brand,
            model,
            specs,
            retailPrice: Math.round(price),
            currentStock: stock,
            unit: 'шт',
            isActive: true,
        };

        const existing = await (this.prisma as any).opticProduct.findFirst({
            where: { organizationId: this.orgId, sku },
        });

        if (existing) {
            await (this.prisma as any).opticProduct.update({
                where: { id: existing.id },
                data,
            });
            result.updated++;
        } else {
            await (this.prisma as any).opticProduct.create({
                data: {
                    ...data,
                    sku,
                    slug: sku.toLowerCase(),
                    organizationId: this.orgId,
                },
            });
            result.created++;
        }
    }

    // ----- Full Sync -----

    async fullSync(since?: string): Promise<ItigrisSyncResult[]> {
        const results: ItigrisSyncResult[] = [];

        // Order matters: clients first, then orders, then appointments
        results.push(await this.syncClientChanges(since));
        results.push(await this.syncOrders());
        results.push(await this.syncAppointments());

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
