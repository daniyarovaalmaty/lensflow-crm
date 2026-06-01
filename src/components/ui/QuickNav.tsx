'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Package, Warehouse, ShoppingCart, Banknote, LayoutDashboard, Users, BarChart3, Link2, Building2, ChevronDown, Check } from 'lucide-react';
import FullscreenButton from '@/components/ui/FullscreenButton';

const baseNavItems = [
    { href: '/optic/dashboard', label: 'Заказы', icon: LayoutDashboard, color: 'text-gray-500' },
    { href: '/optic/catalog', label: 'Каталог', icon: Package, color: 'text-blue-500' },
    { href: '/optic/warehouse', label: 'Склад', icon: Warehouse, color: 'text-amber-500' },
    { href: '/optic/pos', label: 'Касса', icon: ShoppingCart, color: 'text-green-500' },
    { href: '/optic/cash-shifts', label: 'Смены', icon: Banknote, color: 'text-purple-500' },
    { href: '/optic/patients', label: 'Пациенты', icon: Users, color: 'text-emerald-500' },
    { href: '/optic/analytics', label: 'Аналитика', icon: BarChart3, color: 'text-violet-500' },
];

const managerNavItems = [
    { href: '/clinic-manager/dashboard', label: 'Клиника', icon: Building2, color: 'text-indigo-500' },
    { href: '/clinic-manager/itigris', label: 'ITIGRIS', icon: Link2, color: 'text-orange-500' },
    { href: '/optic/branches', label: 'Филиалы', icon: Building2, color: 'text-teal-500' },
];

interface Branch {
    id: string;
    name: string;
}

export default function QuickNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const subRole = (session?.user as any)?.subRole;
    const orgType = (session?.user as any)?.orgType;
    const isManager = subRole === 'optic_manager';
    const isHQ = orgType === 'headquarters';

    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        if (isManager && isHQ) {
            fetch('/api/branches')
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data?.branches) setBranches(data.branches);
                })
                .catch(() => {});
        }
    }, [isManager, isHQ]);

    useEffect(() => {
        const saved = localStorage.getItem('lf_selected_branch');
        if (saved) setSelectedBranch(saved);
    }, []);

    const handleBranchSelect = (branchId: string) => {
        setSelectedBranch(branchId);
        localStorage.setItem('lf_selected_branch', branchId);
        setShowDropdown(false);
        window.dispatchEvent(new CustomEvent('branch-changed', { detail: { branchId } }));
    };

    const selectedLabel = selectedBranch === 'all'
        ? 'Все филиалы'
        : branches.find(b => b.id === selectedBranch)?.name || 'Все';

    const allItems = isManager ? [...baseNavItems, ...managerNavItems] : baseNavItems;

    return (
        <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5 overflow-x-auto py-2 scrollbar-hide -mx-1">
                        {allItems.map(item => {
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
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {/* Branch Switcher */}
                        {isManager && isHQ && branches.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 transition-colors whitespace-nowrap"
                                >
                                    <Building2 className="w-3 h-3" />
                                    {selectedLabel}
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                                {showDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                                        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 min-w-[200px] py-1.5 overflow-hidden">
                                            <button
                                                onClick={() => handleBranchSelect('all')}
                                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${selectedBranch === 'all' ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-gray-700'}`}
                                            >
                                                Все филиалы
                                                {selectedBranch === 'all' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                            </button>
                                            <div className="border-t border-gray-100 my-1" />
                                            {branches.map(b => (
                                                <button
                                                    key={b.id}
                                                    onClick={() => handleBranchSelect(b.id)}
                                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${selectedBranch === b.id ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-gray-700'}`}
                                                >
                                                    {b.name}
                                                    {selectedBranch === b.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        <FullscreenButton className="!p-1.5 !rounded-lg !border-0 !shadow-none !bg-transparent hover:!bg-gray-100" />
                    </div>
                </div>
            </div>
        </nav>
    );
}
