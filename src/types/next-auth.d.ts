import 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        role: 'doctor' | 'optic' | 'laboratory';
        subRole: string;
        organizationId?: string | null;
        profile: {
            fullName: string;
            phone?: string | null;
            clinic?: string;
            opticName?: string;
            labName?: string;
        };
    }

    interface Session {
        user: User & {
            id: string;
            role: 'doctor' | 'optic' | 'laboratory';
            subRole: string;
            organizationId?: string | null;
            profile: {
                fullName: string;
                phone?: string | null;
                clinic?: string;
                opticName?: string;
                labName?: string;
            };
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: 'doctor' | 'optic' | 'laboratory';
        subRole: string;
        organizationId?: string | null;
        profile: {
            fullName: string;
            phone?: string | null;
            clinic?: string;
            opticName?: string;
            labName?: string;
        };
    }
}
