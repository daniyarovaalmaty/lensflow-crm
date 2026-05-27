'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Warehouse, ShoppingCart, Banknote, LayoutDashboard, Users } from 'lucide-react';
import FullscreenButton from '@/components/ui/FullscreenButton';

const navItems = [
    { href: '/optic/dashboard', label: 'Заказы', icon: LayoutDashboard },
    { href: '/optic/catalog', label: 'Каталог', icon: Package },
    { href: '/optic/warehouse', label: 'Склад', icon: Warehouse },
    { href: '/optic/pos', label: 'Касса', icon: ShoppingCart },
    { href: '/optic/cash-shifts', label: 'Смены', icon: Banknote },
    { href: '/optic/patients', label: 'Пациенты', icon: Users },
];

export default function QuickNav() {
    const pathname = usePathname();

    return (
        <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1">
            {navItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                            isActive
                                ? 'bg-white text-primary-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                        }`}
                    >
                        <item.icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                        {item.label}
                    </Link>
                );
            })}
            <div className="ml-1">
                <FullscreenButton className="!p-1.5 !rounded-lg" />
            </div>
        </div>
    );
}
