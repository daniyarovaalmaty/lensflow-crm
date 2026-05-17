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
    departmentId?: number;
    createdAt?: string;
    updatedAt?: string;
    comment?: string;
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
            // Skip auth header for sign-in endpoint
            if (reqConfig.url?.includes('/sign/in')) return reqConfig;

            const token = await this.getValidToken();
            if (token) {
                reqConfig.headers.Authorization = `Bearer ${token}`;
            }
            return reqConfig;
        });

        // Interceptor: auto-refresh on 401
        this.http.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const original = error.config;
                if (error.response?.status === 401 && original && !(original as any)._retried) {
                    (original as any)._retried = true;
                    await this.refreshAccessToken();
                    const token = this.tokens?.accessToken;
                    if (token && original.headers) {
                        original.headers.Authorization = `Bearer ${token}`;
                    }
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
     * clientSearchType: FIO | PHONE | CARD_NUMBER | PRESCRIPTIONS
     */
    async searchClients(query: string, searchType: 'FIO' | 'PHONE' | 'CARD_NUMBER' = 'FIO'): Promise<ItigrisClient[]> {
        const resp = await this.http.get('/clients/list', {
            params: {
                clientSearchType: searchType,
                searchQuery: query,
            },
        });
        return resp.data || [];
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

    /** Get client orders history */
    async getClientOrders(clientId: number): Promise<ItigrisOrder[]> {
        const resp = await this.http.get(`/clients/${clientId}/orders`);
        return resp.data || [];
    }

    /**
     * Get changed clients since a given date.
     * Useful for incremental sync.
     */
    async getClientChanges(since: string): Promise<ItigrisClient[]> {
        const resp = await this.http.get('/clients/changes', {
            params: { since },
        });
        return resp.data || [];
    }

    // ----- Orders -----

    /** Get orders journal with filters */
    async getOrdersJournal(params?: ItigrisOrderJournalParams): Promise<ItigrisOrder[]> {
        const resp = await this.http.get('/orders/journal', { params });
        return resp.data || [];
    }

    /** Get single order details */
    async getOrder(orderId: number): Promise<ItigrisOrder> {
        const resp = await this.http.get(`/orders/${orderId}`);
        return resp.data;
    }

    /** Get order statuses dictionary */
    async getOrderStatuses(): Promise<Array<{ id: number; name: string }>> {
        const resp = await this.http.get('/orders/statuses');
        return resp.data || [];
    }

    /** Get order types dictionary */
    async getOrderTypes(): Promise<Array<{ id: number; name: string }>> {
        const resp = await this.http.get('/orders/types');
        return resp.data || [];
    }

    // ----- Prescriptions -----

    /** Get prescriptions for a client */
    async getClientPrescriptions(clientId: number): Promise<ItigrisPrescription[]> {
        const resp = await this.http.get(`/clients/${clientId}/prescriptions`);
        return resp.data || [];
    }

    // ----- Registry (Appointments) -----
    // Note: Appointments are in legacy API, but journal is in v2

    /** Get registry records (appointment journal) */
    async getRegistryRecords(params?: {
        dateFrom?: string;
        dateTo?: string;
        departmentId?: number;
    }): Promise<any[]> {
        const resp = await this.http.get('/registry-records', { params });
        return resp.data || [];
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
