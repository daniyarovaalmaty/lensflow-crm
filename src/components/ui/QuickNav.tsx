'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Warehouse, ShoppingCart, Banknote, LayoutDashboard, Users } from 'lucide-react';
import FullscreenButton from '@/components/ui/FullscreenButton';

const navItems = [
    { href: '/optic/dashboard', label: 'Заказы', icon: LayoutDashboard, color: 'text-gray-500' },
    { href: '/optic/catalog', label: 'Каталог', icon: Package, color: 'text-blue-500' },
    { href: '/optic/warehouse', label: 'Склад', icon: Warehouse, color: 'text-amber-500' },
    { href: '/optic/pos', label: 'Касса', icon: ShoppingCart, color: 'text-green-500' },
    { href: '/optic/cash-shifts', label: 'Смены', icon: Banknote, color: 'text-purple-500' },
    { href: '/optic/patients', label: 'Пациенты', icon: Users, color: 'text-emerald-500' },
];

export default function QuickNav() {
    const pathname = usePathname();

    return (
        <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5 overflow-x-auto py-2 scrollbar-hide -mx-1">
                        {navItems.map(item => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                        isActive
                                            ? 'bg-primary-50 text-primary-700 font-semibold'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <item.icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : item.color}`} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="flex-shrink-0 ml-2">
                        <FullscreenButton className="!p-1.5 !rounded-lg !border-0 !shadow-none !bg-transparent hover:!bg-gray-100" />
                    </div>
                </div>
            </div>
        </nav>
    );
}
