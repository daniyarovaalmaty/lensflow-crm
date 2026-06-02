import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import DistributorNav from '@/components/layout/DistributorNav';

export default async function DistributorLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'distributor') {
        redirect('/unauthorized');
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <DistributorNav />
            <main>{children}</main>
        </div>
    );
}
