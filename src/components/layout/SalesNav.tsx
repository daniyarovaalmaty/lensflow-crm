'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Target, BarChart3, MessageCircle, Settings, ArrowLeft, LogOut, User, Menu, X, Calendar, CreditCard, Heart } from 'lucide-react';
import { signOut } from 'next-auth/react';

const navItems = [
    { href: '/sales/leads', label: 'Новые лиды', icon: Target },
    { href: '/sales/retention', label: 'Постоянные', icon: Heart },
    { href: '/sales/calendar', label: 'Календарь', icon: Calendar },
    { href: '/sales/analytics', label: 'Аналитика', icon: BarChart3 },
    { href: '/sales/billing', label: 'Тарифы', icon: CreditCard },
];

export default function SalesNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    // Determine "back" link based on user role
    const backHref = session?.user?.role === 'laboratory'
        ? '/laboratory/dashboard'
        : session?.user?.role === 'optic'
            ? '/optic/dashboard'
            : '/';

    const handleLogout = async () => {
        setLoggingOut(true);
        await signOut({ callbackUrl: '/login' });
    };

    return (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 flex items-center justify-between">
                {/* Logo + Back */}
                <div className="flex items-center gap-3 shrink-0">
                    <Link
                        href={backHref}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Назад"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <Link href="/sales/pipeline" className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">LensFlow</span>
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">CRM</span>
                    </Link>
                </div>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center flex-1 ml-6">
                    {navItems.map(item => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex items-center gap-1.5 px-3 py-3.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap
                                    ${isActive
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                                    }
                                `}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Right side */}
                <div className="hidden md:flex items-center shrink-0 ml-auto gap-1">
                    {session?.user && (
                        <span className="text-xs text-gray-400 mr-2">
                            {(session.user as any).profile?.fullName || session.user.email}
                        </span>
                    )}
                    <Link
                        href="/profile"
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50"
                        title="Профиль"
                    >
                        <User className="w-4 h-4" />
                    </Link>
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        title="Выйти"
                    >
                        {loggingOut ? (
                            <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
                        ) : (
                            <LogOut className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
                    <div className="px-4 py-2 space-y-1">
                        <Link
                            href={backHref}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-50"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Назад к панели
                        </Link>
                        {navItems.map(item => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                        ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
                                    `}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
