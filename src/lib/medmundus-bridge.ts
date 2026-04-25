/**
 * MedMundus Bridge — Server-to-server authentication verification
 * 
 * When a user logs into Lens Flow, if their credentials are not found locally,
 * this module calls the MedMundus Django API to verify them.
 * On success, it returns the user's profile so we can JIT-provision them.
 */

export interface MedMundusProfile {
    medmundus_user_id: number;
    username: string;       // phone number in MedMundus
    email: string;
    phone: string;
    user_type: string;      // 'doctor' | 'clinic' | 'patient'
    fullName: string;
    role: 'doctor' | 'clinic';
    avatar?: string | null;
    clinic?: {
        medmundus_clinic_id: number;
        name: string;
        lensflow_id: string | null;   // pre-linked Lens Flow org ID
        phone: string;
        email: string;
        city: string;
    };
}

/**
 * Verify user credentials against MedMundus Django API.
 * Returns profile data on success, null on failure.
 */
export async function verifyViaMedMundus(
    username: string,
    password: string
): Promise<MedMundusProfile | null> {
    const apiUrl = process.env.MEDMUNDUS_API_URL;
    const bridgeKey = process.env.LENSFLOW_BRIDGE_KEY;

    if (!apiUrl || !bridgeKey) {
        console.warn('[MedMundus Bridge] MEDMUNDUS_API_URL or LENSFLOW_BRIDGE_KEY not configured');
        return null;
    }

    try {
        const response = await fetch(
            `${apiUrl}/api/v1/account/lensflow/verify`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bridge-Key': bridgeKey,
                },
                body: JSON.stringify({ username, password }),
            }
        );

        if (!response.ok) {
            console.log(`[MedMundus Bridge] Verification failed: ${response.status}`);
            return null;
        }

        const data: MedMundusProfile = await response.json();
        return data;
    } catch (error) {
        console.error('[MedMundus Bridge] Network error:', error);
        return null;
    }
}
