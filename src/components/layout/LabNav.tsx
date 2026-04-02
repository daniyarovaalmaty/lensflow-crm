'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { BarChart3, Columns3, FileText, LogOut, User, Package, Users, Building2, Menu, X, Settings, Archive, MessageSquarePlus } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';

const navItems = [
    { href: '/laboratory/dashboard', label: 'Дашборд', icon: BarChart3, subRoles: ['lab_head'] },
    { href: '/laboratory/production', label: 'Производство', icon: Columns3, subRoles: ['lab_head', 'lab_admin', 'lab_engineer', 'lab_quality', 'lab_logistics'] },
    { href: '/laboratory/catalog', label: 'Каталог', icon: Package, subRoles: ['lab_head'] },
    { href: '/laboratory/accountant', label: 'Финансы', icon: FileText, subRoles: ['lab_head', 'lab_admin', 'lab_accountant'] },
    { href: '/laboratory/analytics', label: 'Старые заказы', icon: Archive, subRoles: ['lab_head', 'lab_admin'] },
    { href: '/laboratory/counterparties', label: 'Контрагенты', icon: Building2, subRoles: ['lab_head', 'lab_admin'] },
    { href: '/laboratory/staff', label: 'Сотрудники', icon: Users, subRoles: ['lab_head'] },
    { href: '/laboratory/settings', label: 'Настройки', icon: Settings, subRoles: ['lab_head'] },
    { href: '/support', label: 'Поддержка', icon: MessageSquarePlus, subRoles: ['lab_head', 'lab_admin', 'lab_engineer', 'lab_quality', 'lab_logistics', 'lab_accountant'] },
];

export default function LabNav() {
    const pathname = usePathname();
    const { data: session, status: sessionStatus } = useSession();
    const subRole = (session?.user?.subRole || 'lab_admin') as SubRole;
    const [mobileOpen, setMobileOpen] = useState(false);

    const visibleItems = navItems.filter(item => item.subRoles.includes(subRole));
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        await signOut({ callbackUrl: '/login' });
    };

    return (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 flex items-center justify-between">
                {/* Logo */}
                <span className="text-lg font-bold text-blue-600 mr-2 shrink-0">LensFlow</span>

                {/* Desktop nav — all items in one scrollable row */}
                <div className="hidden md:flex items-center flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                    {visibleItems.map(item => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    px-2 xl:px-3 py-3.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap
                                    ${isActive
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                                    }
                                `}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                    {/* Separator + Profile & Logout inside scroll */}
                    <span className="mx-1 w-px h-5 bg-gray-200 shrink-0 self-center" />
                    <Link
                        href="/profile"
                        className="px-2 py-3.5 text-[13px] font-medium border-b-2 border-transparent text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors whitespace-nowrap flex items-center gap-1"
                    >
                        <User className="w-3.5 h-3.5" />
                        Профиль
                    </Link>
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="px-2 py-3.5 text-[13px] font-medium border-b-2 border-transparent text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors whitespace-nowrap flex items-center gap-1"
                    >
                        {loggingOut ? (
                            <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
                        ) : (
                            <LogOut className="w-3.5 h-3.5" />
                        )}
                        {loggingOut ? 'Выход...' : 'Выйти'}
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

            {/* Mobile dropdown menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
                    <div className="px-4 py-2 space-y-1">
                        {visibleItems.map(item => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                        ${isActive
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                        <div className="border-t border-gray-100 pt-2 mt-2 flex items-center gap-3">
                            <Link
                                href="/profile"
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 flex-1"
                            >
                                <User className="w-4 h-4" />
                                Профиль
                            </Link>
                            <button
                                onClick={() => { setMobileOpen(false); handleLogout(); }}
                                disabled={loggingOut}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50"
                            >
                                {loggingOut ? (
                                    <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <LogOut className="w-4 h-4" />
                                )}
                                {loggingOut ? 'Выход...' : 'Выйти'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
