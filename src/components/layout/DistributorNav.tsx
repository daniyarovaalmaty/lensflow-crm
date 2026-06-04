'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
    LayoutDashboard, ShoppingCart, Users, Settings,
    LogOut, Truck, ChevronDown, User, Package
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { href: '/distributor', label: 'Дашборд', icon: LayoutDashboard, exact: true, roles: ['dist_head', 'dist_admin', 'dist_manager', 'dist_accountant'] },
    { href: '/distributor/counterparties', label: 'Контрагенты', icon: Users, roles: ['dist_head', 'dist_admin', 'dist_manager'] },
    { href: '/distributor/catalog', label: 'Каталог', icon: Package, roles: ['dist_head', 'dist_admin', 'dist_manager', 'dist_accountant'] },
    { href: '/distributor/staff', label: 'Сотрудники', icon: User, roles: ['dist_head', 'dist_admin'] },
    { href: '/distributor/settings', label: 'Настройки', icon: Settings, roles: ['dist_head'] },
];

export default function DistributorNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [profileOpen, setProfileOpen] = useState(false);

    const subRole = (session?.user as any)?.subRole || '';

    const isActive = (item: typeof navItems[0]) =>
        item.exact ? pathname === item.href : pathname.startsWith(item.href);

    const visibleItems = navItems.filter(item => item.roles.includes(subRole));

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Truck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-900 leading-none">LensFlow</div>
                            <div className="text-xs text-indigo-500 font-medium">Дистрибьютор</div>
                        </div>
                    </div>

                    {/* Nav links */}
                    <div className="flex items-center gap-1">
                        {visibleItems.map(item => {
                            const Icon = item.icon;
                            const active = isActive(item);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        active
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Profile */}
                    <div className="relative">
                        <button
                            onClick={() => setProfileOpen(o => !o)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="text-left hidden sm:block">
                                <div className="text-sm font-medium text-gray-900 leading-none">
                                    {(session?.user as any)?.profile?.fullName || session?.user?.email}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                    {subRole === 'dist_head' ? 'Руководитель' :
                                     subRole === 'dist_admin' ? 'Администратор' :
                                     subRole === 'dist_manager' ? 'Менеджер' :
                                     subRole === 'dist_accountant' ? 'Бухгалтер' : subRole}
                                </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                                <button
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Выйти
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
