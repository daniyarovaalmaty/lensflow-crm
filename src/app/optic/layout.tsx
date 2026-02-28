import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Force dynamic rendering so auth runs on every request
export const dynamic = 'force-dynamic';

export default async function OpticLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    // Redirect to login if not authenticated
    if (!session?.user) {
        redirect('/login');
    }

    // Redirect if not a doctor/optic user
    if (session.user.role !== 'doctor' && session.user.role !== 'optic') {
        redirect('/unauthorized');
    }

    return <>{children}</>;
}
