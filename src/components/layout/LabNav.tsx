'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BarChart3, Columns3, FileText, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { SubRoleLabels } from '@/types/user';
import type { SubRole } from '@/types/user';

const navItems = [
    { href: '/laboratory/dashboard', label: 'Дашборд', icon: BarChart3, subRoles: ['lab_head', 'lab_admin'] },
    { href: '/laboratory/production', label: 'Производство', icon: Columns3, subRoles: ['lab_head', 'lab_admin', 'lab_engineer', 'lab_quality', 'lab_logistics'] },
    { href: '/laboratory/accountant', label: 'Финансы', icon: FileText, subRoles: ['lab_head', 'lab_admin', 'lab_accountant'] },
];

export default function LabNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const subRole = (session?.user?.subRole || 'lab_admin') as SubRole;

    const visibleItems = navItems.filter(item => item.subRoles.includes(subRole));

    if (visibleItems.length <= 1) return null;

    return (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    {/* Logo */}
                    <span className="text-lg font-bold text-blue-600 mr-4 hidden sm:block">LensFlow</span>

                    {/* Nav items */}
                    {visibleItems.map(item => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors
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

                {/* Right side: role + logout */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 hidden sm:block">
                        {SubRoleLabels[subRole]}
                    </span>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors py-2 px-2 rounded-lg hover:bg-red-50"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Выйти</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
