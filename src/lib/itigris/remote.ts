/**
 * ITIGRIS Optima — RemoteAPI ("для интернет-магазина и мобильного приложения").
 *
 * SEPARATE key from the External API key (apiClInfo/apiOrderStatus/... in legacy.ts).
 * The RemoteAPI key is issued by ITIGRIS support on request and unlocks the
 * two-way cluster + a barcode-less catalog. Auth = key in the query string.
 *
 * Base URL: https://optima.itigris.ru/<client>/<controller>/<method>?key=<key>&...
 * Built to the documented contract (API_ITigris). NOT yet verified against a live
 * key — the demo RemoteAPI key in the docs is dead (401). On first run with a real
 * key, response field names may need minor adjustment.
 *
 * Docs map (controller/method):
 *   remoteRemains/list                      — stock by category (catalog)
 *   remoteBonus/history                     — bonus accrual/write-off history
 *   remoteServicesTypes/list                — services available for API (for booking)
 *   remoteRegistry/getDepartments|getDoctors|getDaysBusiness|getTimeByDepartment|
 *                  getTimeByDoctor|register — appointment booking
 *   remoteClientCard/registerClientCard     — issue a discount card
 *   remoteSale/create (POST)                — push a sale/order task into Optima
 *   remoteNotification/sendSms              — send SMS to a client
 */

import axios from 'axios';

const REMOTE_BASE = 'https://optima.itigris.ru';

export interface ItigrisRemoteConfig {
    /** Company / app slug in ITIGRIS, e.g. "optika_narodnaya" */
    client: string;
    /** RemoteAPI access key (NOT the External API key) */
    key: string;
}

export type RemoteProduct = 'accessories' | 'contactlenses' | 'glasses' | 'lenses' | 'sunglasses';

export interface RemoteSaleGood {
    product: RemoteProduct;
    barcode?: string;
    [key: string]: any;
}

export class ItigrisRemoteClient {
    constructor(private cfg: ItigrisRemoteConfig) {}

    private async get(controllerMethod: string, params: Record<string, any> = {}): Promise<any> {
        const url = `${REMOTE_BASE}/${this.cfg.client}/${controllerMethod}`;
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') clean[k] = v;
        const resp = await axios.get(url, {
            params: { key: this.cfg.key, ...clean },
            timeout: 30_000,
            transformResponse: [(d) => d],
        });
        let data = resp.data;
        if (typeof data === 'string') data = data.trim().replace(/^\uFEFF/, '');
        try { return typeof data === 'string' ? JSON.parse(data) : data; } catch { return data; }
    }

    private async post(controllerMethod: string, body: any): Promise<any> {
        const url = `${REMOTE_BASE}/${this.cfg.client}/${controllerMethod}`;
        const resp = await axios.post(url, body, {
            params: { key: this.cfg.key },
            timeout: 30_000,
            headers: { 'Content-Type': 'application/json' },
            transformResponse: [(d) => d],
        });
        let data = resp.data;
        if (typeof data === 'string') data = data.trim().replace(/^\uFEFF/, '');
        try { return typeof data === 'string' ? JSON.parse(data) : data; } catch { return data; }
    }

    // ----- Catalog (barcode-less stock by category) -----
    /** Stock for one category, optional department, paginated (≤1000/page; empty = no more). */
    remainsList(product: RemoteProduct, departmentId?: number | string, page?: number): Promise<any[]> {
        return this.get('remoteRemains/list', { product, departmentId, page }).then(
            (d) => (Array.isArray(d) ? d : (d?.content || [])),
        );
    }

    // ----- Bonus history -----
    /** Bonus accrual/write-off history by discount card. */
    bonusHistory(clientCardId: string | number, opts: { startDate?: string; finishDate?: string; plusOnly?: boolean; minusOnly?: boolean; waiting?: boolean; page?: number } = {}): Promise<any> {
        return this.get('remoteBonus/history', {
            clientCardId,
            startDate: opts.startDate,
            finishDate: opts.finishDate,
            // these flags must only be sent when true (API rejects explicit false)
            plusOnly: opts.plusOnly ? true : undefined,
            minusOnly: opts.minusOnly ? true : undefined,
            waiting: opts.waiting ? true : undefined,
            page: opts.page,
        });
    }

    // ----- Services (for booking) -----
    /** Services exposed for API (id, name, price, categories). */
    servicesList(category?: string): Promise<any[]> {
        return this.get('remoteServicesTypes/list', { category }).then(
            (d) => (Array.isArray(d) ? d : (d?.content || [])),
        );
    }

    // ----- Registry / appointment booking -----
    getDepartments(): Promise<any[]> {
        return this.get('remoteRegistry/getDepartments').then((d) => (Array.isArray(d) ? d : []));
    }
    getDoctors(departmentId?: number | string): Promise<any[]> {
        return this.get('remoteRegistry/getDoctors', { departmentId }).then((d) => (Array.isArray(d) ? d : []));
    }
    getDaysBusiness(departmentId: number | string, userId?: number | string, serviceTypeId?: number | string): Promise<any[]> {
        return this.get('remoteRegistry/getDaysBusiness', { departmentId, userId, serviceTypeId }).then((d) => (Array.isArray(d) ? d : []));
    }
    /** Free slots for a department on a date (YYYY-MM-DD). */
    getTimeByDepartment(departmentId: number | string, date: string, sortByTime = true): Promise<any[]> {
        return this.get('remoteRegistry/getTimeByDepartment', { departmentId, date, sortByTime }).then((d) => (Array.isArray(d) ? d : []));
    }
    /** Free slots for a doctor across the week containing `date`. */
    getTimeByDoctor(userId: number | string, date: string): Promise<any[]> {
        return this.get('remoteRegistry/getTimeByDoctor', { userId, date }).then((d) => (Array.isArray(d) ? d : []));
    }
    /**
     * Book an appointment. time = "YYYY-MM-DDThh:mm:ss" (must match a free slot start).
     * status: 1 = Подтверждён (default), 5 = Не подтверждён. Returns "OK" or an error name.
     */
    register(args: { clientId: number | string; userId: number | string; time: string; serviceTypeId: number | string; status?: 1 | 5 }): Promise<any> {
        return this.get('remoteRegistry/register', {
            clientId: args.clientId, userId: args.userId, time: args.time,
            serviceTypeId: args.serviceTypeId, status: args.status,
        });
    }

    // ----- Client lookup -----
    /** Find a client's id by phone (+optional surname/first name). Returns clientId or error text. */
    getClient(args: { tel: string; family_name?: string; first_name?: string; noMultiple?: boolean }): Promise<any> {
        return this.get('remoteClientCard/getClient', {
            tel: args.tel, family_name: args.family_name, first_name: args.first_name,
            noMultiple: args.noMultiple ? true : undefined,
        });
    }

    // ----- Discount card -----
    /** Issue a discount card to an existing (non-deleted) client. */
    registerClientCard(id: string | number, clientId: string | number, departmentId?: number | string): Promise<any> {
        return this.get('remoteClientCard/registerClientCard', { id, clientId, departmentId });
    }

    // ----- Sale / order push -----
    /**
     * Push a sale/order task into a store. Body per docs:
     *   { departmentId, goods:[{goods:{...}}], clientInfo|clientId, paidSum, paymentType, receiveType }
     */
    saleCreate(body: { departmentId?: number | string; goods: any[]; clientId?: number | string; clientInfo?: any; paidSum?: number; paymentType?: string; receiveType?: string }): Promise<any> {
        return this.post('remoteSale/create', body);
    }

    // ----- Notifications -----
    /** Send an SMS to a client's primary phone (needs consent + balance + alpha-name). */
    sendSms(clientId: string | number, content: string): Promise<any> {
        return this.get('remoteNotification/sendSms', { clientId, content });
    }

    /** Connectivity check — getDepartments should return an array with a valid key. */
    async test(): Promise<{ ok: boolean; message: string }> {
        try {
            const d = await this.getDepartments();
            if (Array.isArray(d)) return { ok: true, message: `Подключено (RemoteAPI, департаментов: ${d.length})` };
            if (typeof d === 'string' && /unauthor|forbidden|invalid|security|key/i.test(d)) return { ok: false, message: `Отказ: ${d}` };
            return { ok: true, message: 'Ответ получен' };
        } catch (e: any) {
            const s = e.response?.status;
            if (s === 401) return { ok: false, message: 'Неверный RemoteAPI-ключ (401)' };
            return { ok: false, message: `Ошибка: ${s || e.message}` };
        }
    }
}

/** Build a RemoteAPI client from stored config, or null if the key isn't set yet. */
export function createRemoteClient(cfg: Partial<ItigrisRemoteConfig> | null | undefined): ItigrisRemoteClient | null {
    if (!cfg?.client || !cfg?.key) return null;
    return new ItigrisRemoteClient({ client: cfg.client, key: cfg.key });
}
