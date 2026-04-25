import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import SalesNav from '@/components/layout/SalesNav';

export const dynamic = 'force-dynamic';

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    // CRM доступен для всех аутентифицированных пользователей
    // (владелец, lab_head, lab_admin, sales_manager, doctor, optic)

    return (
        <>
            <SalesNav />
            <div className="min-h-[calc(100vh-57px)] bg-gray-50">
                {children}
            </div>
        </>
    );
}
