import 'next-auth';
import 'next-auth/jwt';
import type { UserRole, UserProfile, SubRole } from '@/types/user';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            role: UserRole;
            subRole: SubRole;
            profile: UserProfile;
        };
    }

    interface User {
        id: string;
        email: string;
        role: UserRole;
        subRole: SubRole;
        profile: UserProfile;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: UserRole;
        subRole: SubRole;
        profile: UserProfile;
    }
}
