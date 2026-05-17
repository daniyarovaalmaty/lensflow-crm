/**
 * ITIGRIS Optima REST API v2 — Integration Client
 *
 * This module handles communication between LensFlow CRM and ITIGRIS Optima,
 * the leading CRM/ERP system for optical clinics in CIS region.
 *
 * ITIGRIS API docs: provided per-tenant by ITIGRIS support
 * Base URL pattern: https://{tenant}.itigris.cloud/api/v2/
 *
 * Data flow:
 *   ITIGRIS (patients, orders, prescriptions) → LensFlow CRM
 *   LensFlow CRM (order status updates) → ITIGRIS
 */

import axios, { AxiosInstance } from 'axios';

// ===================== Types =====================

export interface ItigrisConfig {
    baseUrl: string;        // e.g. https://myoptika.itigris.cloud/api/v2
    apiToken: string;       // Bearer token from ITIGRIS
    organizationId: string; // LensFlow org ID to link data to
    branchId?: string;      // ITIGRIS branch/salon ID (central office ID)
}

export interface ItigrisClient {
    id: number;
    firstName: string;
    lastName: string;
    middleName?: string;
    phone?: string;
    email?: string;
    birthDate?: string; // YYYY-MM-DD
    gender?: 'M' | 'F';
    cardNumber?: string;
    comment?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ItigrisOrder {
    id: number;
    number: string;
    clientId: number;
    status: string;
    type: 'glasses' | 'contacts' | 'repair' | 'other';
    totalAmount: number;
    paidAmount: number;
    createdAt: string;
    updatedAt: string;
    items: ItigrisOrderItem[];
    prescription?: ItigrisPrescription;
}

export interface ItigrisOrderItem {
    id: number;
    nomenclatureId: number;
    name: string;
    quantity: number;
    price: number;
    amount: number;
}

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
    bc?: number;
    dia?: number;
}

export interface ItigrisProduct {
    id: number;
    name: string;
    barcode?: string;
    category: string;
    price: number;
    quantity: number;
    unit: string;
}

export interface ItigrisSyncResult {
    entity: 'clients' | 'orders' | 'products' | 'prescriptions';
    created: number;
    updated: number;
    errors: number;
    details: string[];
}

// ===================== API Client =====================

export class ItigrisApiClient {
    private http: AxiosInstance;
    private config: ItigrisConfig;

    constructor(config: ItigrisConfig) {
        this.config = config;
        this.http = axios.create({
            baseURL: config.baseUrl,
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 15000,
        });

        // Log requests in development
        if (process.env.NODE_ENV === 'development') {
            this.http.interceptors.request.use((req) => {
                console.log(`[ITIGRIS] ${req.method?.toUpperCase()} ${req.url}`);
                return req;
            });
        }
    }

    // ----- Clients (Patients) -----

    async getClients(params?: {
        page?: number;
        limit?: number;
        updatedAfter?: string; // ISO date — for incremental sync
        search?: string;
    }): Promise<{ data: ItigrisClient[]; total: number }> {
        const resp = await this.http.get('/clients', {
            params: {
                page: params?.page || 1,
                per_page: params?.limit || 50,
                updated_after: params?.updatedAfter,
                search: params?.search,
            },
        });
        return {
            data: resp.data.data || resp.data,
            total: resp.data.meta?.total || resp.data.length,
        };
    }

    async getClient(id: number): Promise<ItigrisClient> {
        const resp = await this.http.get(`/clients/${id}`);
        return resp.data.data || resp.data;
    }

    async createClient(client: Partial<ItigrisClient>): Promise<ItigrisClient> {
        const resp = await this.http.post('/clients', {
            first_name: client.firstName,
            last_name: client.lastName,
            middle_name: client.middleName,
            phone: client.phone,
            email: client.email,
            birth_date: client.birthDate,
            gender: client.gender,
            comment: client.comment,
        });
        return resp.data.data || resp.data;
    }

    // ----- Orders -----

    async getOrders(params?: {
        page?: number;
        limit?: number;
        status?: string;
        clientId?: number;
        updatedAfter?: string;
    }): Promise<{ data: ItigrisOrder[]; total: number }> {
        const resp = await this.http.get('/orders', {
            params: {
                page: params?.page || 1,
                per_page: params?.limit || 50,
                status: params?.status,
                client_id: params?.clientId,
                updated_after: params?.updatedAfter,
            },
        });
        return {
            data: resp.data.data || resp.data,
            total: resp.data.meta?.total || resp.data.length,
        };
    }

    async getOrder(id: number): Promise<ItigrisOrder> {
        const resp = await this.http.get(`/orders/${id}`);
        return resp.data.data || resp.data;
    }

    async updateOrderStatus(id: number, status: string): Promise<void> {
        await this.http.patch(`/orders/${id}`, { status });
    }

    // ----- Products (Nomenclature) -----

    async getProducts(params?: {
        page?: number;
        limit?: number;
        category?: string;
        search?: string;
    }): Promise<{ data: ItigrisProduct[]; total: number }> {
        const resp = await this.http.get('/nomenclature', {
            params: {
                page: params?.page || 1,
                per_page: params?.limit || 100,
                category: params?.category,
                search: params?.search,
            },
        });
        return {
            data: resp.data.data || resp.data,
            total: resp.data.meta?.total || resp.data.length,
        };
    }

    // ----- Prescriptions -----

    async getPrescriptions(params?: {
        clientId?: number;
        updatedAfter?: string;
    }): Promise<{ data: ItigrisPrescription[]; total: number }> {
        const resp = await this.http.get('/prescriptions', {
            params: {
                client_id: params?.clientId,
                updated_after: params?.updatedAfter,
            },
        });
        return {
            data: resp.data.data || resp.data,
            total: resp.data.meta?.total || resp.data.length,
        };
    }

    // ----- Health Check -----

    async testConnection(): Promise<{ ok: boolean; message: string }> {
        try {
            await this.http.get('/clients', { params: { per_page: 1 } });
            return { ok: true, message: 'Подключение к ITIGRIS успешно' };
        } catch (error: any) {
            const msg = error.response?.status === 401
                ? 'Неверный API-токен'
                : error.response?.status === 404
                    ? 'Неверный URL ITIGRIS API'
                    : `Ошибка подключения: ${error.message}`;
            return { ok: false, message: msg };
        }
    }
}

// ===================== Helper: Create client from DB config =====================

export function createItigrisClient(config: ItigrisConfig): ItigrisApiClient {
    return new ItigrisApiClient(config);
}
