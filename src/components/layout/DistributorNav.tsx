'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { LayoutDashboard, Users, Settings, LogOut, User, Package, Menu, X, ShoppingBag, Banknote, Briefcase, BarChart3, Warehouse } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { getEffectiveDistributorPermissions } from '@/types/user';

const navItems = [
    { href: '/distributor', label: 'Дашборд', icon: LayoutDashboard, exact: true, permKey: 'canViewDashboard' },
    { href: '/distributor/counterparties', label: 'Контрагенты', icon: Users, permKey: 'canViewCounterparties' },
    { href: '/distributor/catalog', label: 'Каталог', icon: Package, permKey: 'canViewCatalog' },
    { href: '/distributor/wholesale', label: 'Продажи', icon: ShoppingBag, permKey: 'canViewWholesale' },
    { href: '/distributor/warehouse', label: 'Склад', icon: Warehouse, permKey: 'canViewWarehouse' },
    { href: '/distributor/staff', label: 'Сотрудники', icon: User, permKey: 'canViewStaff' },
    { href: '/distributor/settings', label: 'Настройки', icon: Settings, permKey: 'canViewSettings' },
];

export default function DistributorNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const subRole = (session?.user as any)?.subRole || '';

    const isActive = (item: typeof navItems[0]) =>
        (item as any).exact ? pathname === item.href : pathname.startsWith(item.href);

    const perms = getEffectiveDistributorPermissions((session?.user as any) || { subRole: '' });
    const visibleItems = navItems.filter(item => (perms as any)[item.permKey]);

    const handleLogout = async () => {
        setLoggingOut(true);
        await signOut({ callbackUrl: '/login' });
    };

    return (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 flex items-center justify-between">
                {/* Logo */}
                <span className="text-lg font-bold text-blue-600 mr-2 shrink-0">LensFlow</span>

                {/* Desktop nav — static, no scroll */}
                <div className="hidden md:flex items-center flex-1">
                    {visibleItems.map(item => {
                        const active = isActive(item);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    px-1.5 lg:px-2.5 py-3.5 text-[12px] lg:text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap
                                    ${active
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                                    }
                                `}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Right side: Profile & Logout — far right */}
                <div className="hidden md:flex items-center shrink-0 ml-auto gap-1">
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

            {/* Mobile dropdown menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
                    <div className="px-4 py-2 space-y-1">
                        {visibleItems.map(item => {
                            const active = isActive(item);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                        ${active
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
