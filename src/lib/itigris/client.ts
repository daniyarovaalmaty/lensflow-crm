/**
 * ITIGRIS Optima API v.2 — Integration Client
 *
 * Based on official ITIGRIS Optima REST API documentation.
 * URL pattern: https://optima.itigris.ru/<APP_NAME>/api/v2/
 *
 * Auth: POST /api/v2/sign/in with company, login, password, departmentId
 * Returns accessToken (1 hour TTL) + refreshToken.
 * All subsequent requests use Bearer Token authorization.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ===================== Config =====================

export interface ItigrisConfig {
    /** Company/app name in ITIGRIS (e.g. "demo", "neweye") */
    company: string;
    /** ITIGRIS user login */
    login: string;
    /** ITIGRIS user password */
    password: string;
    /** Department ID in Optima */
    departmentId: number;
    /** LensFlow organization ID (for multi-tenant) */
    organizationId: string;
}

// ===================== Auth Types =====================

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
}

// ===================== Client (Patient) Types =====================

export interface ItigrisClient {
    id: number;
    firstName: string;
    familyName: string;
    patronymicName?: string | null;
    city?: string | null;
    address?: string | null;
    email?: string | null;
    birthdayDay?: number | null;
    birthdayMonth?: number | null;
    birthdayYear?: number | null;
    tel1?: string | null;
    tel2?: string | null;
    gender?: boolean | null; // true = male, false = female
    comment?: string | null;
    profession?: string | null;
    employmentPlace?: string | null;
    deleted?: boolean;
    ordersSum?: number;
    clientCard?: {
        id: number;
        number: string;
        bonus?: number;
    } | null;
    lastUpdatedAt?: string | null;
    lastSeen?: string | null;
}

/** Input shape for creating/updating an ITIGRIS client (LensFlow → ITIGRIS). */
export interface ItigrisClientInput {
    firstName: string;
    familyName: string;
    patronymicName?: string | null;
    tel1?: string | null;
    tel2?: string | null;
    email?: string | null;
    city?: string | null;
    address?: string | null;
    birthdayDay?: number | null;
    birthdayMonth?: number | null;
    birthdayYear?: number | null;
    gender?: boolean | null; // true = male, false = female
    comment?: string | null;
    profession?: string | null;
    employmentPlace?: string | null;
    // Tolerate extra fields echoed back from client info on a PUT merge.
    [key: string]: any;
}

// ===================== Order Types =====================

export interface ItigrisOrder {
    id: number;
    number?: string;
    clientId?: number;
    clientName?: string;
    type?: string;
    status?: string;
    statusName?: string;
    totalAmount?: number;
    sum?: number;
    paidSum?: number;
    departmentId?: number;
    departmentName?: string;
    createdAt?: string;
    updatedAt?: string;
    comment?: string;
    client?: { id: number; familyName: string; firstName: string; patronymicName?: string };
}

export interface ItigrisOrderJournalParams {
    page?: number;
    size?: number;
    statusIds?: number[];
    typeIds?: number[];
    departmentId?: number;
    dateFrom?: string; // ISO date
    dateTo?: string;   // ISO date
}

// Full order detail from /orders/{id}/full
export interface ItigrisOrderFull {
    id: number;
    type: string; // 'GLASSES' | 'CONTACT_LENS' | 'REPAIR' | 'SALE'
    status: string; // 'WAIT' | 'READY' | 'ISSUED' | 'CANCELLED'
    sum: number;
    paidSum: number;
    comment: string | null;
    createdAt: string;
    finishedAt: string | null;
    client?: { id: number; familyName: string; firstName: string; patronymicName?: string };
    department?: { id: number; name: string };
    user?: { id: number; fullName: string };
    medicalData?: {
        prescriptions: Array<{
            id: number;
            sphOd: number | null;
            sphOs: number | null;
            cylOd: number | null;
            cylOs: number | null;
            axOd: number | null;
            axOs: number | null;
            addOd: number | null;
            addOs: number | null;
            dpp: number | null;    // total PD
            dppOd: number | null;  // PD right
            dppOs: number | null;  // PD left
            visusOd: number | null;
            visusOs: number | null;
            purpose: string | null;
            recommendedLenses: string | null;
            comments: string | null;
            date: string | null;
            doctor?: { id: number; fullName: string } | null;
        }>;
    };
    goods?: Array<{
        isRight: boolean;
        category: string;
        quantity: number;
        totalSoldPrice: number;
        goodParams?: {
            manufacturer?: string;
            brand?: string;
            color?: string;
            cover?: string;
            add?: number | null;
            cylinderDioptre?: number | null;
            dioptre?: number | null;
            refractionIndex?: number | null;
            diameter?: number | null;
            material?: string;
            geometry?: string;
            type?: string;
            sellableCategory?: string; // 'LENS' | 'FRAME' | etc
        };
    }>;
    clientGoods?: {
        frame?: {
            id: number;
            description: string | null;
            type: string | null;
            material: string | null;
            estimatedPrice: number | null;
        };
    };
    servicesInfo?: {
        services: Array<{
            serveType?: { name: string };
            soldPrice: number;
        }>;
    };
}

export interface ItigrisDepartment {
    id: number;
    name: string;
    type: string; // 'STORE' | 'PRODUCTION' | 'DEPOT' | 'OFFICE'
}

// ===================== Prescription Types =====================

export interface ItigrisPrescription {
    id: number;
    clientId: number;
    doctorName?: string;
    date: string;
    od?: ItigrisEyeRx;
    os?: ItigrisEyeRx;
}

export interface ItigrisEyeRx {
    sph?: number;
    cyl?: number;
    ax?: number;
    add?: number;
    pd?: number;
}

// ===================== Sync Result =====================

export interface ItigrisSyncResult {
    entity: string;
    created: number;
    updated: number;
    errors: number;
    details: string[];
}

// ===================== API Client =====================

const ITIGRIS_BASE_URL = 'https://optima.itigris.ru';

export class ItigrisApiClient {
    private config: ItigrisConfig;
    private http: AxiosInstance;
    private tokens: AuthTokens | null = null;
    private tokenExpiresAt: Date | null = null;

    constructor(config: ItigrisConfig) {
        this.config = config;

        // Base URL: https://optima.itigris.ru/<company>/api/v2
        const baseURL = `${ITIGRIS_BASE_URL}/${config.company}/api/v2`;

        this.http = axios.create({
            baseURL,
            timeout: 30_000,
            headers: { 'Content-Type': 'application/json' },
        });

        // Interceptor: auto-attach Bearer token and handle token refresh
        this.http.interceptors.request.use(async (reqConfig) => {
            // Skip token logic for ALL /sign/ endpoints (in/refresh). Otherwise the
            // /sign/refresh request itself re-enters getValidToken → refresh → … →
            // infinite recursion (→ OOM) whenever the token looks expired.
            if (reqConfig.url?.includes('/sign/')) return reqConfig;

            const token = await this.getValidToken();
            if (token) {
                reqConfig.headers.Authorization = `Bearer ${token}`;
            }
            return reqConfig;
        });

        // Interceptor: auto-refresh ONCE on 401. The retry is guarded via a
        // header marker (which survives axios config merging) — relying on a
        // custom config field is lost on the merged retry config and causes an
        // infinite refresh→retry loop (→ OOM) when an endpoint keeps returning 401.
        this.http.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const original: any = error.config;
                const alreadyRetried = original?.headers?.['X-LF-Retried'];
                const isSignEndpoint = String(original?.url || '').includes('/sign/');
                if (error.response?.status === 401 && original && !alreadyRetried && !isSignEndpoint) {
                    await this.refreshAccessToken();
                    original.headers = { ...(original.headers || {}), 'X-LF-Retried': '1' };
                    const token = this.tokens?.accessToken;
                    if (token) original.headers.Authorization = `Bearer ${token}`;
                    return this.http(original);
                }
                throw error;
            }
        );
    }

    // ----- Authentication -----

    async signIn(): Promise<AuthTokens> {
        const resp = await this.http.post('/sign/in', {
            company: this.config.company,
            login: this.config.login,
            password: this.config.password,
            departmentId: this.config.departmentId,
        });

        this.tokens = resp.data;
        this.tokenExpiresAt = new Date(resp.data.expiresAt);
        return resp.data;
    }

    async refreshAccessToken(): Promise<void> {
        if (!this.tokens?.refreshToken) {
            await this.signIn();
            return;
        }

        try {
            const resp = await this.http.post('/sign/refresh', {
                refreshToken: this.tokens.refreshToken,
            });
            this.tokens = resp.data;
            this.tokenExpiresAt = new Date(resp.data.expiresAt);
        } catch {
            // If refresh fails, do full sign-in
            await this.signIn();
        }
    }

    private async getValidToken(): Promise<string | null> {
        // If no token or expired (with 5 min buffer), sign in
        if (!this.tokens || !this.tokenExpiresAt) {
            await this.signIn();
            return this.tokens?.accessToken || null;
        }

        const now = new Date();
        const bufferMs = 5 * 60 * 1000; // 5 minutes before expiry
        if (now.getTime() >= this.tokenExpiresAt.getTime() - bufferMs) {
            await this.refreshAccessToken();
        }

        return this.tokens?.accessToken || null;
    }

    // ----- Test Connection -----

    async testConnection(): Promise<{ ok: boolean; message: string; user?: string }> {
        try {
            const result = await this.signIn();
            if (result.accessToken) {
                // Decode JWT to get user info
                try {
                    const payload = JSON.parse(
                        Buffer.from(result.accessToken.split('.')[1], 'base64').toString()
                    );
                    const sub = JSON.parse(payload.sub);
                    const userName = `${sub.principal?.familyName || ''} ${sub.principal?.firstName || ''}`.trim();
                    return {
                        ok: true,
                        message: `Подключено! Пользователь: ${userName || this.config.login}`,
                        user: userName || this.config.login,
                    };
                } catch {
                    return { ok: true, message: 'Подключено успешно!' };
                }
            }
            return { ok: false, message: 'Не удалось получить токен' };
        } catch (err: any) {
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                return { ok: false, message: 'Неверный логин/пароль или нет доступа к API' };
            }
            if (status === 404) {
                return { ok: false, message: 'Приложение не найдено. Проверьте название company.' };
            }
            return {
                ok: false,
                message: `Ошибка подключения: ${err.message || 'неизвестная ошибка'}`,
            };
        }
    }

    // ----- Clients (Patients) -----

    /**
     * Search clients by query.
     * clientSearchType: FULL_NAME | PHONE_NUMBER | CARD_NUMBER | PRESCRIPTIONS
     * Returns paginated response { content: [...], totalElements, ... }
     * IMPORTANT: deleted param is required by the API
     */
    async searchClients(
        query: string,
        searchType: 'FULL_NAME' | 'PHONE_NUMBER' | 'CARD_NUMBER' = 'FULL_NAME',
        page: number = 0,
        size: number = 100,
    ): Promise<ItigrisClient[]> {
        const resp = await this.http.get('/clients', {
            params: {
                clientSearchType: searchType,
                searchQuery: query,
                deleted: false,
                page,
                size,
            },
        });
        // API returns paginated: { content: [...], totalElements, ... }
        if (resp.data?.content) return resp.data.content;
        if (Array.isArray(resp.data)) return resp.data;
        return [];
    }

    /** Get total number of clients matching search */
    async countClients(query: string = ''): Promise<number> {
        const resp = await this.http.get('/clients', {
            params: {
                clientSearchType: 'FULL_NAME',
                searchQuery: query || 'А',
                deleted: false,
                page: 0,
                size: 1,
            },
        });
        return resp.data?.totalElements || 0;
    }

    /** Get client info by ID */
    async getClient(clientId: number): Promise<ItigrisClient> {
        const resp = await this.http.get(`/clients/${clientId}`);
        return resp.data;
    }

    /** Get client phones */
    async getClientPhones(clientId: number): Promise<{ tel1?: string; tel2?: string }> {
        const resp = await this.http.get(`/clients/${clientId}/phones`);
        return resp.data;
    }

    /** Get client orders history (paginated response) */
    async getClientOrders(clientId: number): Promise<ItigrisOrder[]> {
        const resp = await this.http.get(`/clients/${clientId}/orders`);
        // Paginated response
        if (resp.data?.content) return resp.data.content;
        if (Array.isArray(resp.data)) return resp.data;
        return [];
    }

    /**
     * Get clients changed since a given date (incremental sync).
     * Response is paginated ({ content, last, totalPages, ... }) and items are
     * SUMMARIES (id, fullName) — callers must fetch full info via getClient(id).
     * Iterates all pages.
     */
    async getClientChanges(since: string): Promise<ItigrisClient[]> {
        const all: ItigrisClient[] = [];
        let page = 0;
        // hard page cap as a safety net against unbounded loops
        while (page < 200) {
            const resp = await this.http.get('/clients/changes', {
                params: { since, page, size: 100 },
            });
            const data = resp.data;
            const content: ItigrisClient[] = Array.isArray(data) ? data : (data?.content || []);
            all.push(...content);
            if (Array.isArray(data) || data?.last === true || content.length === 0) break;
            page++;
        }
        return all;
    }

    // ----- Clients: WRITE (two-way sync, LensFlow → ITIGRIS) -----

    /**
     * Create a client in ITIGRIS. Returns the new client id.
     * NOTE: per the API, a client created this way is always `deleted: true`
     * (no PD-processing consent is collected), so it stays hidden in the clients
     * journal until consent is signed. Use createClientWithConsent() for the
     * full flow, or call signPdAgreement() yourself afterwards.
     */
    async createClient(payload: ItigrisClientInput): Promise<number> {
        const resp = await this.http.post('/clients', payload);
        return resp.data?.id ?? resp.data;
    }

    /**
     * Collect a PERSONAL_DATA_PROCESSING agreement so the client becomes
     * visible (not deleted) in the journal. Two-step: prepare text, then sign.
     */
    async signPdAgreement(clientId: number): Promise<void> {
        const body = {
            agreementType: 'PERSONAL_DATA_PROCESSING',
            collectionMethod: 'QUESTIONNAIRE',
        };
        await this.http.post(`/clients/${clientId}/agreements/prepare-text`, body);
        await this.http.post(`/clients/${clientId}/agreements`, body);
    }

    /**
     * Create a client AND collect PD consent so they are visible in ITIGRIS.
     * Returns the new client id. If the agreement step fails, the client exists
     * but stays hidden — the error is surfaced so the caller can retry consent.
     */
    async createClientWithConsent(payload: ItigrisClientInput): Promise<number> {
        const id = await this.createClient(payload);
        try {
            await this.signPdAgreement(id);
        } catch (err: any) {
            throw new Error(`Клиент ${id} создан, но согласие на ПД не подписано: ${err.message}`);
        }
        return id;
    }

    /**
     * Update a client in ITIGRIS.
     * IMPORTANT: this is a PUT that REPLACES the whole object. Pass the full
     * client object with only the fields you want changed. Prefer
     * updateClientPartial() which merges your patch over the current record.
     */
    async updateClient(clientId: number, fullClient: ItigrisClientInput): Promise<void> {
        await this.http.put(`/clients/${clientId}`, fullClient);
    }

    /**
     * Safe partial update: fetch the current client, merge the patch over it,
     * and PUT the whole object back so no fields are dropped (as the docs advise).
     */
    async updateClientPartial(clientId: number, patch: Partial<ItigrisClientInput>): Promise<void> {
        const current = await this.getClient(clientId);
        const merged: any = { ...current, ...patch };
        await this.updateClient(clientId, merged);
    }

    // ----- Departments -----

    /** Get all departments for this company */
    async getDepartments(): Promise<ItigrisDepartment[]> {
        const resp = await this.http.get('/departments', { params: { page: 0, size: 100 } });
        if (resp.data?.content) return resp.data.content;
        if (Array.isArray(resp.data)) return resp.data;
        return [];
    }

    /**
     * Re-authenticate with a different departmentId.
     * Needed to access orders registered in other departments.
     */
    async signInToDepartment(departmentId: number): Promise<boolean> {
        try {
            const resp = await this.http.post('/sign/in', {
                company: this.config.company,
                login: this.config.login,
                password: this.config.password,
                departmentId,
            });
            this.tokens = resp.data;
            this.tokenExpiresAt = new Date(resp.data.expiresAt);
            this.config = { ...this.config, departmentId };
            return true;
        } catch {
            return false;
        }
    }

    // ----- Orders -----

    /**
     * Get all orders across all clients.
     * Uses per-client iteration since /orders path doesn't have a journal endpoint.
     */
    async getAllOrders(clientIds: number[]): Promise<ItigrisOrder[]> {
        const allOrders: ItigrisOrder[] = [];
        for (const clientId of clientIds) {
            try {
                const orders = await this.getClientOrders(clientId);
                allOrders.push(...orders);
            } catch {
                // Client may not have orders — skip
            }
        }
        return allOrders;
    }

    /** Get single order details */
    async getOrder(orderId: number): Promise<ItigrisOrder> {
        const resp = await this.http.get(`/orders/${orderId}`);
        return resp.data;
    }

    /**
     * Get FULL order detail including prescription, lens params, frame.
     * IMPORTANT: Must be signed in with the same departmentId as the order.
     * Returns null if order belongs to a different department (409 error).
     */
    async getOrderFull(orderId: number): Promise<ItigrisOrderFull | null> {
        try {
            const resp = await this.http.get(`/orders/${orderId}/full`);
            return resp.data;
        } catch (err: any) {
            // 409 = order belongs to different department
            if (err.response?.status === 409) return null;
            throw err;
        }
    }

    /**
     * Get orders for current department (paginated).
     * Returns GLASSES orders with basic info.
     */
    async getDepartmentOrders(page: number = 0, size: number = 50): Promise<{ content: ItigrisOrder[]; totalElements: number }> {
        const resp = await this.http.get('/orders', { params: { page, size } });
        return {
            content: resp.data?.content || [],
            totalElements: resp.data?.totalElements || 0,
        };
    }

    // ----- Prescriptions -----

    /** Get prescriptions for a client */
    async getClientPrescriptions(clientId: number): Promise<ItigrisPrescription[]> {
        const resp = await this.http.get(`/clients/${clientId}/prescriptions`);
        return resp.data || [];
    }

    // ----- Registry (Appointments) -----
    // Note: Appointments are in legacy API, but journal is in v2

    /** Get registry records (appointment journal). Requires appointmentFrom/appointmentTo (ISO). */
    async getRegistryRecords(params?: {
        appointmentFrom?: string;
        appointmentTo?: string;
        departmentId?: number;
    }): Promise<any[]> {
        const resp = await this.http.get('/registry-records', { params });
        const d = resp.data;
        return Array.isArray(d) ? d : (d?.content || []);
    }

    // ----- Stock / Remains -----

    /** Get stock remains (API v.2) */
    async getRemains(params?: { departmentId?: number }): Promise<any[]> {
        const resp = await this.http.get('/remains', { params });
        return resp.data || [];
    }
}

/** Create ITIGRIS client from stored config */
export function createItigrisClient(config: ItigrisConfig): ItigrisApiClient {
    return new ItigrisApiClient(config);
}
