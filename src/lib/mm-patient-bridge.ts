/**
 * MedMundus ↔ LensFlow Patient Sync Bridge
 * Server-to-server client for the LensFlow bridge API on MedMundus.
 */

const MM_API = process.env.MEDMUNDUS_API_URL || 'https://backend.mmundus.com';
const BRIDGE_KEY = process.env.LENSFLOW_BRIDGE_KEY || 'lf-mm-bridge-2026-secret-key';

const headers = {
    'Content-Type': 'application/json',
    'X-Bridge-Key': BRIDGE_KEY,
};

export interface MMPatient {
    medmundus_patient_id: number;
    name: string;
    surname: string;
    first_name: string;
    patronymic: string;
    phone: string;
    email: string;
    birthDate: string | null;
    gender: string;
    city: string;
    avatar: string | null;
    doctor: {
        medmundus_user_id: number;
        fullName: string;
        phone: string;
    } | null;
    notes?: MMPatientNote[];
}

export interface MMPatientNote {
    id: number;
    date: string;
    symptoms: string;
    appointment: string;
    doctor_name: string | null;
}

// ─── READ ───────────────────────────────────────────────────────────────────

/** Fetch all patients from MedMundus (optionally filtered by doctor phone) */
export async function mmGetPatients(doctorPhone?: string, q?: string): Promise<MMPatient[]> {
    const params = new URLSearchParams({ limit: '200' });
    if (doctorPhone) params.set('doctor_phone', doctorPhone);
    if (q) params.set('q', q);

    const res = await fetch(`${MM_API}/api/v1/lensflow/patients/?${params}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.patients || [];
}

/** Fetch single patient from MedMundus */
export async function mmGetPatient(mmId: number): Promise<MMPatient | null> {
    const res = await fetch(`${MM_API}/api/v1/lensflow/patients/${mmId}/`, { headers });
    if (!res.ok) return null;
    return res.json();
}

/** Fetch doctor's patients from MedMundus by phone */
export async function mmGetDoctorPatients(doctorPhone: string): Promise<MMPatient[]> {
    const params = new URLSearchParams({ phone: doctorPhone });
    const res = await fetch(`${MM_API}/api/v1/lensflow/doctor-patients/?${params}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.patients || [];
}

// ─── WRITE ──────────────────────────────────────────────────────────────────

/** Create patient in MedMundus, returns medmundus_patient_id */
export async function mmCreatePatient(payload: {
    name: string;
    phone?: string;
    email?: string;
    birthDate?: string;
    gender?: string;
    city?: string;
    doctorPhone?: string;
}): Promise<number | null> {
    const res = await fetch(`${MM_API}/api/v1/lensflow/patients/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        console.error('[MMBridge] Create patient failed:', res.status, await res.text());
        return null;
    }
    const data = await res.json();
    return data.medmundus_patient_id || null;
}

/** Update patient in MedMundus */
export async function mmUpdatePatient(mmId: number, payload: {
    name?: string;
    phone?: string;
    email?: string;
    birthDate?: string;
    gender?: string;
    city?: string;
}): Promise<boolean> {
    const res = await fetch(`${MM_API}/api/v1/lensflow/patients/${mmId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
    });
    return res.ok;
}

// ─── NOTES / PRESCRIPTIONS ──────────────────────────────────────────────────

/** Get patient notes from MedMundus */
export async function mmGetPatientNotes(mmId: number): Promise<MMPatientNote[]> {
    const res = await fetch(`${MM_API}/api/v1/lensflow/patients/${mmId}/notes/`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.notes || [];
}

/** Push a LensFlow prescription as a note to MedMundus */
export async function mmPushPrescription(mmId: number, payload: {
    doctorPhone?: string;
    date?: string;
    rxType?: string;
    od?: { sph?: number; cyl?: number; ax?: number; add?: number; pd?: number };
    os?: { sph?: number; cyl?: number; ax?: number; add?: number; pd?: number };
    pdTotal?: number;
    symptoms?: string;
    appointment?: string;
}): Promise<boolean> {
    const res = await fetch(`${MM_API}/api/v1/lensflow/patients/${mmId}/notes/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });
    return res.ok;
}

/** Helper: convert MMPatient to LensFlow Patient format for display */
export function mmPatientToLF(mm: MMPatient) {
    return {
        medmundusId: mm.medmundus_patient_id,
        name: mm.name.trim() || [mm.surname, mm.first_name, mm.patronymic].filter(Boolean).join(' '),
        phone: mm.phone,
        email: mm.email || null,
        birthDate: mm.birthDate || null,
        gender: mm.gender === 'male' || mm.gender === 'M' ? 'male'
            : mm.gender === 'female' || mm.gender === 'F' ? 'female' : null,
        city: mm.city || null,
        avatar: mm.avatar || null,
    };
}
