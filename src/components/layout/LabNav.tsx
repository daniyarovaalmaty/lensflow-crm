'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { BarChart3, Columns3, FileText, LogOut, User, Package, Users, Building2, Menu, X } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';

const navItems = [
    { href: '/laboratory/dashboard', label: 'Дашборд', icon: BarChart3, subRoles: ['lab_head', 'lab_admin'] },
    { href: '/laboratory/production', label: 'Производство', icon: Columns3, subRoles: ['lab_head', 'lab_admin', 'lab_engineer', 'lab_quality', 'lab_logistics'] },
    { href: '/laboratory/catalog', label: 'Каталог', icon: Package, subRoles: ['lab_head', 'lab_admin'] },
    { href: '/laboratory/accountant', label: 'Финансы', icon: FileText, subRoles: ['lab_head', 'lab_admin', 'lab_accountant'] },
    { href: '/laboratory/counterparties', label: 'Контрагенты', icon: Building2, subRoles: ['lab_head', 'lab_admin'] },
    { href: '/laboratory/staff', label: 'Сотрудники', icon: Users, subRoles: ['lab_head', 'lab_admin'] },
];

export default function LabNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const subRole = (session?.user?.subRole || 'lab_admin') as SubRole;
    const [mobileOpen, setMobileOpen] = useState(false);

    const visibleItems = navItems.filter(item => item.subRoles.includes(subRole));

    return (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 flex items-center justify-between">
                {/* Logo */}
                <span className="text-lg font-bold text-blue-600 mr-4 shrink-0">LensFlow</span>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-1 flex-1 min-w-0">
                    {visibleItems.map(item => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex items-center gap-2 px-3 lg:px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                                    ${isActive
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                                    }
                                `}
                            >
                                <item.icon className="w-4 h-4" />
                                <span className="hidden lg:inline">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Right side: role + logout (desktop) */}
                <div className="hidden md:flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400 hidden lg:block">
                        {SubRoleLabels[subRole]}
                    </span>
                    <Link
                        href="/profile"
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-500 transition-colors py-2 px-2 rounded-lg hover:bg-blue-50"
                    >
                        <User className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Профиль</span>
                    </Link>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors py-2 px-2 rounded-lg hover:bg-red-50"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Выйти</span>
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
                                onClick={() => { setMobileOpen(false); signOut({ callbackUrl: '/login' }); }}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50"
                            >
                                <LogOut className="w-4 h-4" />
                                Выйти
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
