'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { Package, Warehouse, ShoppingCart, Banknote, LayoutDashboard, Users, BarChart3, Link2, Building2, ChevronDown, Check, Settings, LogOut, User, PackageCheck, Truck, ArrowLeftRight, ChevronLeft, ChevronRight, ClipboardList, Newspaper } from 'lucide-react';
import FullscreenButton from '@/components/ui/FullscreenButton';

const baseNavItems = [
    { href: '/optic/dashboard', label: 'Заказы', icon: LayoutDashboard, color: 'text-gray-500' },
    { href: '/optic/issue', label: 'Выдать заказ', icon: PackageCheck, color: 'text-teal-500' },
    { href: '/optic/catalog', label: 'Каталог', icon: Package, color: 'text-blue-500' },
    { href: '/optic/warehouse', label: 'Склад', icon: Warehouse, color: 'text-amber-500' },
    { href: '/optic/supplier-orders', label: 'Закуп', icon: Truck, color: 'text-indigo-500' },
    { href: '/optic/transfers', label: 'Трансферы', icon: ArrowLeftRight, color: 'text-sky-500' },
    { href: '/optic/pos', label: 'Касса', icon: ShoppingCart, color: 'text-green-500' },
    { href: '/optic/cash-shifts', label: 'Смены', icon: Banknote, color: 'text-purple-500' },
    { href: '/optic/patients', label: 'Пациенты', icon: Users, color: 'text-emerald-500' },
    { href: '/optic/tasks', label: 'Задания', icon: ClipboardList, color: 'text-fuchsia-500' },
    { href: '/optic/news', label: 'Новости', icon: Newspaper, color: 'text-rose-500' },
    { href: '/optic/analytics', label: 'Аналитика', icon: BarChart3, color: 'text-violet-500' },
];

const procurementNavItems = [
    { href: '/optic/procurement', label: 'Заказы', icon: LayoutDashboard, color: 'text-gray-500' },
    { href: '/optic/partners', label: 'Партнеры', icon: Building2, color: 'text-blue-500' },
    { href: '/optic/settings', label: 'Настройки', icon: Settings, color: 'text-violet-500' },
];

const managerNavItems = [
    { href: '/optic/staff', label: 'Сотрудники', icon: Users, color: 'text-rose-500' },
    { href: '/clinic-manager/dashboard', label: 'Клиника', icon: Building2, color: 'text-indigo-500' },
    { href: '/clinic-manager/itigris', label: 'ITIGRIS', icon: Link2, color: 'text-orange-500' },
    { href: '/optic/partners', label: 'Партнеры', icon: Building2, color: 'text-blue-500' },
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
    const role = (session?.user as any)?.role;
    const orgName = (session?.user as any)?.organizationName || '';
    const userName = (session?.user as any)?.name || '';
    const isManager = subRole === 'optic_manager';
    const isHQ = orgType === 'headquarters';
    const isProcurement = subRole === 'optic_procurement';

    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [showDropdown, setShowDropdown] = useState(false);
    const [newsUnread, setNewsUnread] = useState(0);

    // Horizontal scroll arrows for the nav (many tabs overflow on narrower screens).
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);
    const updateArrows = () => {
        const el = scrollRef.current;
        if (!el) { setCanLeft(false); setCanRight(false); return; }
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    const scrollNav = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
    useEffect(() => {
        const t = setTimeout(updateArrows, 150);
        window.addEventListener('resize', updateArrows);
        return () => { clearTimeout(t); window.removeEventListener('resize', updateArrows); };
    }, [branches.length, isManager, isProcurement]);

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

    // Unread news badge («Новости (+N)»). Refetched on navigation so it clears
    // right after the user opens the feed (which marks everything read).
    useEffect(() => {
        if (role === 'distributor') return;
        let active = true;
        fetch('/api/optic/news/unread')
            .then(r => (r.ok ? r.json() : { unread: 0 }))
            .then(d => { if (active) setNewsUnread(d?.unread || 0); })
            .catch(() => {});
        return () => { active = false; };
    }, [pathname, role]);

    if (role === 'distributor') return null;

    const handleBranchSelect = (branchId: string) => {
        setSelectedBranch(branchId);
        localStorage.setItem('lf_selected_branch', branchId);
        setShowDropdown(false);
        window.dispatchEvent(new CustomEvent('branch-changed', { detail: { branchId } }));
    };

    const selectedLabel = selectedBranch === 'all'
        ? 'Все филиалы'
        : branches.find(b => b.id === selectedBranch)?.name || 'Все';

    const allItems = isProcurement ? procurementNavItems : (isManager ? [...baseNavItems, ...managerNavItems] : baseNavItems);

    return (
        <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: nav links — horizontally scrollable with arrows */}
                    <div className="flex-1 min-w-0 flex items-center">
                        {canLeft && (
                            <button onClick={() => scrollNav(-1)} aria-label="Прокрутить меню влево" className="flex-shrink-0 mr-1 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}
                        <div ref={scrollRef} onScroll={updateArrows} className="flex-1 min-w-0 flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-hide">
                        {isProcurement && (
                            <div className="flex items-center gap-2 mr-3 flex-shrink-0">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">ОН</span>
                                </div>
                                <div className="hidden sm:block">
                                    <div className="text-xs font-bold text-gray-900 leading-tight">Оптика Народная</div>
                                    <div className="text-[10px] text-gray-400 leading-tight">Отдел закупа</div>
                                </div>
                                <div className="w-px h-5 bg-gray-200 ml-1" />
                            </div>
                        )}
                        {allItems.map(item => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                        isActive
                                            ? 'bg-primary-50 text-primary-700 font-semibold'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <item.icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : item.color}`} />
                                    {item.label}
                                    {item.href === '/optic/news' && newsUnread > 0 && (
                                        <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full">{newsUnread}</span>
                                    )}
                                </Link>
                            );
                        })}
                        </div>
                        {canRight && (
                            <button onClick={() => scrollNav(1)} aria-label="Прокрутить меню вправо" className="flex-shrink-0 ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {/* Branch Switcher — only for manager HQ */}
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

                        {/* Procurement: user chip + logout */}
                        {isProcurement && (
                            <div className="flex items-center gap-2">
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center">
                                        <User className="w-3 h-3 text-violet-600" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-700 max-w-[140px] truncate">
                                        {userName || 'Пользователь'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    title="Выйти"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline">Выйти</span>
                                </button>
                            </div>
                        )}

                        <FullscreenButton className="!p-1.5 !rounded-lg !border-0 !shadow-none !bg-transparent hover:!bg-gray-100" />
                    </div>
                </div>
            </div>
        </nav>
    );
}
