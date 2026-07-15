/**
 * ITIGRIS Optima — LEGACY external API (key-in-request auth).
 *
 * Separate from the v2 client (sign-in/Bearer). Base URL:
 *   https://optima.itigris.ru/<client>/<endpoint>?key=<key>&...
 *
 * Endpoints (per the client's API description):
 *   apiOrderStatus?orderId=        — order status by number (plain text; "NotFound" if missing)
 *   apiBonusInfo?clientCardId=      — loyalty bonus by discount card
 *   apiClientCardInfo?clientCardId= — discount by discount card
 *   apiClInfo?manufacturer&name&dioptre&cylinder&radiusOfCurvature
 *                                   — contact-lens stock: JSON array of { storeName: count } per filter
 */

import axios from 'axios';

const LEGACY_BASE = 'https://optima.itigris.ru';

export interface ItigrisLegacyConfig {
    /** Company / app slug in ITIGRIS, e.g. "optika_narodnaya" */
    client: string;
    /** Legacy access key */
    key: string;
}

export interface LensFilters {
    manufacturer?: string;
    name?: string;
    dioptre?: string;
    cylinder?: string;
    radiusOfCurvature?: string;
}

export class ItigrisLegacyClient {
    constructor(private cfg: ItigrisLegacyConfig) {}

    private async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
        const url = `${LEGACY_BASE}/${this.cfg.client}/${endpoint}`;
        const resp = await axios.get(url, {
            params: { key: this.cfg.key, ...params },
            timeout: 20_000,
            // legacy endpoints return JSON or plain text
            transformResponse: [(d) => d],
        });
        const raw = resp.data;
        try { return JSON.parse(raw); } catch { return raw; } // keep plain text (e.g. "NotFound") as-is
    }

    /** Order status by order number. Returns status text or "NotFound". */
    orderStatus(orderId: string) {
        return this.get('apiOrderStatus', { orderId });
    }

    /** Loyalty bonus by discount card id. */
    bonusInfo(clientCardId: string) {
        return this.get('apiBonusInfo', { clientCardId });
    }

    /** Discount by discount card id. */
    clientCardInfo(clientCardId: string) {
        return this.get('apiClientCardInfo', { clientCardId });
    }

    /** Contact-lens stock per store, filtered. Returns array of { storeName: count }. */
    lensInfo(filters: LensFilters = {}) {
        const params: Record<string, string> = {};
        for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
        return this.get('apiClInfo', params);
    }

    /** Quick connectivity check (lens query with no filter → array). */
    async test(): Promise<{ ok: boolean; message: string }> {
        try {
            const d = await this.lensInfo({});
            if (Array.isArray(d)) return { ok: true, message: 'Подключено (легаси API)' };
            if (typeof d === 'string' && /unauthor|forbidden|invalid|key/i.test(d)) return { ok: false, message: `Отказ: ${d}` };
            return { ok: true, message: 'Ответ получен' };
        } catch (e: any) {
            return { ok: false, message: `Ошибка: ${e.response?.status || e.message}` };
        }
    }
}
