import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';

export default async function HomePage() {
    const session = await auth();
    if (session?.user) {
        const role = session.user.role;
        if (role === 'laboratory') redirect('/laboratory/production');
        else if (role === 'optic' || role === 'doctor') redirect('/optic/dashboard');
    }

    const features = [
        {
            icon: '🔬',
            title: 'Конструктор заказов',
            desc: 'Удобное оформление заказов на ортокератологические линзы с полной параметризацией',
        },
        {
            icon: '🏭',
            title: 'Производственный хаб',
            desc: 'Канбан-доска, контроль качества, учёт браков и отслеживание всех этапов',
        },
        {
            icon: '📊',
            title: 'Аналитика и отчёты',
            desc: 'Дашборды с KPI, графики выручки, экспорт в Excel для бухгалтерии',
        },
        {
            icon: '🚚',
            title: 'Логистика и доставка',
            desc: 'Отслеживание отгрузок, статусы доставки и интеграция с курьерскими службами',
        },
        {
            icon: '👥',
            title: 'Управление персоналом',
            desc: 'Роли для врачей, бухгалтеров, инженеров, логистов — каждый видит только своё',
        },
        {
            icon: '💰',
            title: 'Финансовый модуль',
            desc: 'Контроль оплат, частичная оплата, счета-фактуры и финансовая отчётность',
        },
    ];

    const stats = [
        { value: '2', label: 'Модуля' },
        { value: '8+', label: 'Ролей' },
        { value: '∞', label: 'Заказов' },
        { value: '24/7', label: 'Доступ' },
    ];

    const roles = [
        { role: 'Руководитель клиники', desc: 'Полный контроль: заказы, сотрудники, профиль компании, аналитика' },
        { role: 'Врач клиники', desc: 'Создание и отслеживание заказов, работа с пациентами' },
        { role: 'Бухгалтер клиники', desc: 'Финансовая отчётность и контроль оплат' },
        { role: 'Руководитель лаборатории', desc: 'Дашборд, производство, каталог, персонал, аналитика' },
        { role: 'Инженер', desc: 'Работа с заказами на производстве, канбан-доска' },
        { role: 'Контроль качества', desc: 'Проверка готовых линз, регистрация браков' },
        { role: 'Логист', desc: 'Отгрузка и отслеживание доставки заказов' },
        { role: 'Бухгалтер лаборатории', desc: 'Управление платежами, экспорт финансовых отчётов' },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                    <div className="text-2xl font-bold tracking-tight">
                        Lens<span className="text-blue-400">Flow</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                            Войти
                        </Link>
                        <Link href="/register" className="px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors">
                            Регистрация
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-32 pb-24 px-6">
                {/* Glow */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute top-40 right-1/4 w-[300px] h-[300px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-8">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        CRM для производства ортокератологических линз
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
                        Управляйте
                        <br />
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            производством линз
                        </span>
                        <br />
                        от заказа до доставки
                    </h1>

                    <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        LensFlow объединяет оптики и лаборатории в единую систему.
                        Конструктор заказов, канбан-доска, аналитика и финансы — всё в одном месте.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/register" className="group px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2">
                            Начать бесплатно
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                        <Link href="/login" className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2">
                            🔑 Войти в систему
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-16 px-6 border-y border-white/5">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((s, i) => (
                        <div key={i} className="text-center">
                            <div className="text-4xl font-extrabold bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">{s.value}</div>
                            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Всё, что нужно для <span className="text-blue-400">бизнеса</span></h2>
                        <p className="text-gray-500 max-w-xl mx-auto">Полный цикл управления заказами — от оформления в оптике до отгрузки из лаборатории</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((f, i) => (
                            <div key={i} className="group p-6 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
                                <div className="text-3xl mb-4">{f.icon}</div>
                                <h3 className="font-semibold text-lg text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-24 px-6 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Два модуля — <span className="text-blue-400">одна система</span></h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Optic Module */}
                        <div className="p-8 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-3xl">
                            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-5">
                                <span className="text-2xl">👁️</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Модуль оптики</h3>
                            <ul className="space-y-2.5 text-gray-400 text-sm">
                                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Конструктор заказов с полной параметризацией линз</li>
                                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Управление пациентами и историей заказов</li>
                                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Отслеживание статусов в реальном времени</li>
                                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Управление сотрудниками и ролями (врач, бухгалтер)</li>
                                <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Профиль компании с реквизитами</li>
                            </ul>
                        </div>
                        {/* Lab Module */}
                        <div className="p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-3xl">
                            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-5">
                                <span className="text-2xl">🏭</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Производственный хаб</h3>
                            <ul className="space-y-2.5 text-gray-400 text-sm">
                                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✓</span> Канбан-доска с drag-and-drop управлением</li>
                                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✓</span> Контроль качества и регистрация браков</li>
                                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✓</span> Управление каталогом продукции</li>
                                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✓</span> Финансы: оплаты, счета, экспорт в Excel</li>
                                <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✓</span> Дашборд с KPI, выручкой и аналитикой</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Roles */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Роли и <span className="text-blue-400">доступы</span></h2>
                        <p className="text-gray-500 max-w-xl mx-auto">Каждый сотрудник видит только тот функционал, который нужен для его работы</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {roles.map((r, i) => (
                            <div key={i} className="p-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] transition-colors">
                                <h4 className="font-semibold text-white text-sm mb-1.5">{r.role}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">{r.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="p-12 bg-gradient-to-br from-blue-600/20 to-purple-600/10 border border-blue-500/20 rounded-3xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5" />
                        <div className="relative z-10">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Готовы начать?</h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">Зарегистрируйтесь как руководитель оптики и начните управлять заказами уже сегодня</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/register" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25">
                                    📝 Зарегистрироваться
                                </Link>
                                <Link href="/login" className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold text-lg transition-all">
                                    Войти
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 px-6">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xl font-bold">
                        Lens<span className="text-blue-400">Flow</span>
                        <span className="text-xs text-gray-600 ml-2 font-normal">CRM</span>
                    </div>
                    <p className="text-sm text-gray-600">
                        © {new Date().getFullYear()} LensFlow. Управление заказами линз от создания до доставки.
                    </p>
                </div>
            </footer>
        </div>
    );
}
