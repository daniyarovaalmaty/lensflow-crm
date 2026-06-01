import 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        role: 'doctor' | 'optic' | 'laboratory' | 'distributor';
        subRole: string;
        organizationId?: string | null;
        orgType?: 'standalone' | 'headquarters' | 'branch' | 'distributor';
        parentOrgId?: string | null;
        permissions?: any;
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
            role: 'doctor' | 'optic' | 'laboratory' | 'distributor';
            subRole: string;
            organizationId?: string | null;
            orgType?: 'standalone' | 'headquarters' | 'branch' | 'distributor';
            parentOrgId?: string | null;
            permissions?: any;
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
        role: 'doctor' | 'optic' | 'laboratory' | 'distributor';
        subRole: string;
        organizationId?: string | null;
        orgType?: 'standalone' | 'headquarters' | 'branch' | 'distributor';
        parentOrgId?: string | null;
        permissions?: any;
        profile: {
            fullName: string;
            phone?: string | null;
            clinic?: string;
            opticName?: string;
            labName?: string;
        };
    }
}
