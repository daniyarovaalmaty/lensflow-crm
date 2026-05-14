import { auth } from '@/auth';
import Link from 'next/link';
import { Microscope, Factory, BarChart2, Truck, Users, Banknote, Key, Eye, Check, FileEdit, MessageSquare, ShoppingCart, Scan, UserCheck, Stethoscope, Package, Shield, Smartphone, Bot, CalendarDays, PieChart, Warehouse, Globe, Link2, Zap, Gift, ArrowRight } from 'lucide-react';

export default async function HomePage() {
    const session = await auth();

    let dashboardUrl = '';
    if (session?.user) {
        const role = session.user.role;
        if (role === 'laboratory') dashboardUrl = '/laboratory/production';
        else if (role === 'optic' || role === 'doctor') dashboardUrl = '/optic/dashboard';
    }
    const isLoggedIn = !!session?.user;

    const features = [
        {
            icon: <Microscope className="w-8 h-8 text-blue-400" />,
            title: 'Конструктор заказов',
            desc: 'Полная параметризация ортокератологических линз: OD/OS, радиусы, диаметры, дизайны',
        },
        {
            icon: <Factory className="w-8 h-8 text-purple-400" />,
            title: 'Производственный хаб',
            desc: 'Канбан-доска с drag-and-drop, контроль качества, учёт браков на каждом этапе',
        },
        {
            icon: <MessageSquare className="w-8 h-8 text-green-400" />,
            title: 'WhatsApp CRM',
            desc: 'Каждая клиника подключает свой WhatsApp через QR. Лиды, воронка продаж, чат-бот',
        },
        {
            icon: <Stethoscope className="w-8 h-8 text-cyan-400" />,
            title: 'Пациенты и рецепты',
            desc: 'Карточки пациентов, история рецептов, привязка к заказам, автодедупликация',
        },
        {
            icon: <ShoppingCart className="w-8 h-8 text-orange-400" />,
            title: 'POS-терминал',
            desc: 'Кассовый модуль для оптик: продажа товаров, чеки, история продаж',
        },
        {
            icon: <Warehouse className="w-8 h-8 text-amber-400" />,
            title: 'Склад и товары',
            desc: 'Управление остатками, приход/расход, каталог товаров с ценами по ролям',
        },
        {
            icon: <BarChart2 className="w-8 h-8 text-emerald-400" />,
            title: 'Аналитика и дашборды',
            desc: 'KPI, графики выручки, топ-клиники, ремейки, экспорт в Excel',
        },
        {
            icon: <Bot className="w-8 h-8 text-violet-400" />,
            title: 'Чат-бот и автоворонка',
            desc: 'Автоматические сценарии в WhatsApp: приветствие, запись, напоминания',
        },
        {
            icon: <Smartphone className="w-8 h-8 text-rose-400" />,
            title: 'Вход через WhatsApp',
            desc: 'Авторизация по номеру телефона с OTP — без паролей, быстро и удобно',
        },
        {
            icon: <Scan className="w-8 h-8 text-teal-400" />,
            title: 'Сканер штрих-кодов',
            desc: 'Сканирование заказов камерой телефона для быстрого поиска и отгрузки',
        },
        {
            icon: <Banknote className="w-8 h-8 text-yellow-400" />,
            title: 'Финансовый модуль',
            desc: 'Оплаты, частичная оплата, счета-фактуры, отчётность для бухгалтера',
        },
        {
            icon: <Shield className="w-8 h-8 text-indigo-400" />,
            title: '10+ ролей доступа',
            desc: 'Врач, менеджер, инженер, бухгалтер, логист, QC — каждый видит только своё',
        },
    ];

    const stats = [
        { value: '3', label: 'Модуля' },
        { value: '30+', label: 'Клиник' },
        { value: '10+', label: 'Ролей' },
        { value: '24/7', label: 'Доступ' },
    ];

    const modules = {
        optic: [
            'Конструктор заказов с параметрами линз OD/OS',
            'Карточки пациентов и история рецептов',
            'Дашборд с аналитикой по клинике',
            'Каталог продукции с ценами',
            'POS-терминал для продаж',
            'Склад: остатки, приход, расход',
            'Управление персоналом клиники',
        ],
        lab: [
            'Канбан-доска производства (drag-and-drop)',
            'Контроль качества и регистрация браков',
            'Управление каталогом и ценообразованием',
            'Бухгалтерия: оплаты, счета, Excel-экспорт',
            'Дашборд с KPI и аналитикой',
            'Контрагенты и управление клиниками',
            'Настройки лаборатории',
        ],
        sales: [
            'WhatsApp-интеграция через QR-код',
            'Воронка продаж (канбан лидов)',
            'Автоматический чат-бот с сценариями',
            'Календарь записей и консультаций',
            'Удержание: повторные визиты и напоминания',
            'Тарифы и подписки для клиник',
        ],
    };

    const roles = [
        { role: 'Руководитель клиники', desc: 'Полный контроль: заказы, персонал, пациенты, аналитика, склад' },
        { role: 'Врач', desc: 'Создание заказов, рецепты, карточки пациентов' },
        { role: 'Бухгалтер клиники', desc: 'Финансовая отчётность и контроль оплат' },
        { role: 'Руководитель лаборатории', desc: 'Дашборд, производство, каталог, персонал, аналитика' },
        { role: 'Инженер', desc: 'Производство линз, канбан-доска, параметры' },
        { role: 'Контроль качества', desc: 'Проверка готовых линз, регистрация браков' },
        { role: 'Логист', desc: 'Отгрузка и отслеживание доставки заказов' },
        { role: 'Бухгалтер лаборатории', desc: 'Управление платежами, экспорт отчётов' },
        { role: 'Менеджер продаж', desc: 'WhatsApp-лиды, воронка, календарь записей' },
        { role: 'Администратор', desc: 'Настройка бота, тарифов, сценариев автоворонки' },
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
                        {isLoggedIn ? (
                            <Link href={dashboardUrl} className="px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors">
                                Перейти в систему →
                            </Link>
                        ) : (
                            <>
                                <Link href="/login" className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                    Войти
                                </Link>
                                <Link href="/register" className="px-5 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors">
                                    Регистрация
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-32 pb-24 px-6">
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute top-40 right-1/4 w-[300px] h-[300px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-60 left-1/4 w-[250px] h-[250px] bg-green-600/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-8">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        CRM + WhatsApp + Производство для оптик и лабораторий
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
                        Управляйте
                        <br />
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            клиникой и производством
                        </span>
                        <br />
                        в одной системе
                    </h1>

                    <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        LensFlow объединяет оптики, лаборатории и продажи.
                        WhatsApp-бот, конструктор заказов, канбан, пациенты, аналитика и финансы — всё в одном месте.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/register" className="group px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2">
                            Начать бесплатно
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                        <Link href="/login" className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2">
                            <Key className="w-5 h-5" /> Войти в систему
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

            {/* Features Grid */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Всё, что нужно для <span className="text-blue-400">бизнеса</span></h2>
                        <p className="text-gray-500 max-w-xl mx-auto">12 модулей для полного управления оптикой, лабораторией и продажами</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((f, i) => (
                            <div key={i} className="group p-6 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
                                <div className="mb-4">{f.icon}</div>
                                <h3 className="font-semibold text-lg text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Three Modules */}
            <section className="py-24 px-6 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Три модуля — <span className="text-blue-400">одна система</span></h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Optic */}
                        <div className="p-8 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-3xl">
                            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-5 text-blue-400">
                                <Eye className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Модуль оптики</h3>
                            <ul className="space-y-2.5 text-gray-400 text-sm">
                                {modules.optic.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {/* Lab */}
                        <div className="p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-3xl">
                            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-5 text-purple-400">
                                <Factory className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Производственный хаб</h3>
                            <ul className="space-y-2.5 text-gray-400 text-sm">
                                {modules.lab.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {/* Sales */}
                        <div className="p-8 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-3xl">
                            <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mb-5 text-green-400">
                                <MessageSquare className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Продажи и WhatsApp</h3>
                            <ul className="space-y-2.5 text-gray-400 text-sm">
                                {modules.sales.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> {item}
                                    </li>
                                ))}
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
                    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {roles.map((r, i) => (
                            <div key={i} className="p-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] transition-colors">
                                <h4 className="font-semibold text-white text-sm mb-1.5">{r.role}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">{r.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* WhatsApp Integration Highlight */}
            <section className="py-24 px-6 bg-gradient-to-b from-transparent via-green-950/15 to-transparent">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-6">
                                <MessageSquare className="w-4 h-4" /> Новинка
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                                Свой <span className="text-green-400">WhatsApp</span> для каждой клиники
                            </h2>
                            <p className="text-gray-400 mb-8 leading-relaxed">
                                Каждая клиника сканирует QR-код и подключает свой WhatsApp.
                                Все сообщения попадают в CRM, менеджеры отвечают прямо из системы.
                                Чат-бот автоматически приветствует, записывает и напоминает о визитах.
                            </p>
                            <ul className="space-y-3 text-gray-400">
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-400" /> Подключение через QR за 30 секунд</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-400" /> Воронка продаж с этапами</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-400" /> Автоматические сценарии бота</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-400" /> Календарь записей и напоминания</li>
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/10 rounded-3xl blur-2xl" />
                            <div className="relative p-8 bg-white/[0.03] border border-green-500/20 rounded-3xl">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-xl">
                                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">📱</div>
                                        <div>
                                            <div className="text-sm font-medium">Новый лид из WhatsApp</div>
                                            <div className="text-xs text-gray-500">Автоматическое создание карточки</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-xl">
                                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">🤖</div>
                                        <div>
                                            <div className="text-sm font-medium">Бот отвечает автоматически</div>
                                            <div className="text-xs text-gray-500">Приветствие, меню, запись на приём</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl">
                                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">📊</div>
                                        <div>
                                            <div className="text-sm font-medium">Лид в воронке продаж</div>
                                            <div className="text-xs text-gray-500">Перемещение по этапам конверсии</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Integrations: ITIGRIS + MedMundus */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Интеграции с <span className="text-blue-400">экосистемой</span></h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">LensFlow работает в связке с ведущими платформами для максимальной эффективности вашей клиники</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* ITIGRIS */}
                        <div className="p-8 bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-3xl">
                            <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-5 text-orange-400">
                                <Link2 className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Интеграция с ITIGRIS</h3>
                            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                                Если ваша клиника уже работает в ITIGRIS — данные автоматически синхронизируются с LensFlow.
                                Заказы, пациенты и рецепты переносятся без ручного ввода.
                            </p>
                            <ul className="space-y-2.5 text-gray-400 text-sm">
                                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" /> Автоимпорт заказов из ITIGRIS</li>
                                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" /> Синхронизация карточек пациентов</li>
                                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" /> Единый поток данных между системами</li>
                                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" /> Нет дублирования — работайте в привычной среде</li>
                            </ul>
                        </div>
                        {/* MedMundus */}
                        <div className="p-8 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 rounded-3xl">
                            <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-5 text-cyan-400">
                                <Globe className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">MedMundus — трафик пациентов</h3>
                            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                                Ваши врачи появятся на портале MedMundus — крупнейшей медицинской платформе.
                                Пациенты находят вашу клинику, записываются онлайн, а лиды попадают прямо в LensFlow CRM.
                            </p>
                            <ul className="space-y-2.5 text-gray-400 text-sm">
                                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" /> Профиль врача на MedMundus с рейтингом</li>
                                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" /> Пациенты записываются онлайн</li>
                                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" /> Бесплатный входящий трафик для клиники</li>
                                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" /> Единый вход: один аккаунт для LensFlow и MedMundus</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Free trial banner */}
            <section className="py-12 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="p-8 bg-gradient-to-r from-emerald-600/20 via-green-600/15 to-teal-600/20 border border-green-500/30 rounded-3xl flex flex-col md:flex-row items-center gap-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center shrink-0">
                            <Gift className="w-8 h-8 text-green-400" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-2xl font-bold mb-2">3 месяца <span className="text-green-400">бесплатно</span></h3>
                            <p className="text-gray-400">Зарегистрируйтесь сейчас и получите полный доступ ко всем модулям LensFlow на 3 месяца — без оплаты, без ограничений</p>
                        </div>
                        <Link href="/register" className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-green-500/25 flex items-center gap-2 shrink-0">
                            Попробовать <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="p-12 bg-gradient-to-br from-blue-600/20 to-purple-600/10 border border-blue-500/20 rounded-3xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5" />
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/15 border border-green-500/30 rounded-full text-green-400 text-sm font-semibold mb-6">
                                <Zap className="w-4 h-4" /> 3 месяца бесплатно при регистрации
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Готовы начать?</h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">Подключите свою клинику к LensFlow, получите трафик с MedMundus и начните принимать заказы уже сегодня</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/register" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 flex items-center gap-2">
                                    <FileEdit className="w-5 h-5" /> Зарегистрироваться бесплатно
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
                        © {new Date().getFullYear()} LensFlow. CRM для оптик и лабораторий ортокератологических линз.
                    </p>
                </div>
            </footer>
        </div>
    );
}
