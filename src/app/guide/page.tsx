import Link from 'next/link';
import { ArrowLeft, Eye, Factory, MessageSquare, UserPlus, ClipboardList, Search, Truck, BarChart2, Users, ShoppingCart, Scan, Stethoscope, Smartphone, Settings, HelpCircle, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const metadata = {
    title: 'Руководство — LensFlow CRM',
    description: 'Инструкция по использованию LensFlow CRM для врачей и клиник',
};

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4">
            <div className="shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">{step}</div>
            <div className="flex-1 pb-8 border-l-2 border-white/10 pl-6 -ml-[21px] mt-5">
                <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
                <div className="text-gray-400 text-sm leading-relaxed space-y-2">{children}</div>
            </div>
        </div>
    );
}

function SectionBlock({ id, icon, title, badge, children }: { id: string; icon: React.ReactNode; title: string; badge?: string; children: React.ReactNode }) {
    return (
        <section id={id} className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">{icon}</div>
                <div>
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    {badge && <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{badge}</span>}
                </div>
            </div>
            <div className="pl-0 md:pl-4 space-y-4">{children}</div>
        </section>
    );
}

function Tip({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-300">
            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{children}</div>
        </div>
    );
}

function Warning({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{children}</div>
        </div>
    );
}

const tocItems = [
    { id: 'start', label: 'Начало работы', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'login', label: 'Вход в систему', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'dashboard', label: 'Дашборд', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'orders', label: 'Заказы линз', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'patients', label: 'Пациенты', icon: <Stethoscope className="w-4 h-4" /> },
    { id: 'catalog', label: 'Каталог товаров', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'pos', label: 'POS-терминал', icon: <Scan className="w-4 h-4" /> },
    { id: 'staff', label: 'Сотрудники', icon: <Users className="w-4 h-4" /> },
    { id: 'whatsapp', label: 'WhatsApp CRM', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'tracking', label: 'Отслеживание заказа', icon: <Search className="w-4 h-4" /> },
    { id: 'faq', label: 'Частые вопросы', icon: <HelpCircle className="w-4 h-4" /> },
];

export default function GuidePage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <span className="text-xl font-bold">Lens<span className="text-blue-400">Flow</span></span>
                            <span className="text-xs text-gray-500 ml-2">Руководство</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">Войти</Link>
                        <Link href="/register" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors">Регистрация</Link>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-12 flex gap-8">
                {/* Sidebar TOC — Desktop */}
                <aside className="hidden lg:block w-64 shrink-0">
                    <div className="sticky top-24">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Содержание</h3>
                        <nav className="space-y-1">
                            {tocItems.map((item) => (
                                <a key={item.id} href={`#${item.id}`} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    {item.icon}
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 max-w-3xl space-y-16">
                    {/* Hero */}
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">
                            Руководство по <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">LensFlow</span>
                        </h1>
                        <p className="text-lg text-gray-400 leading-relaxed mb-6">
                            Пошаговая инструкция для врачей, менеджеров и руководителей клиник.
                            Узнайте, как создавать заказы, управлять пациентами и использовать WhatsApp CRM.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <span className="px-3 py-1 text-xs bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400">Для врачей</span>
                            <span className="px-3 py-1 text-xs bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400">Для менеджеров</span>
                            <span className="px-3 py-1 text-xs bg-green-500/10 border border-green-500/20 rounded-full text-green-400">Для руководителей</span>
                        </div>
                    </div>

                    {/* 1. Getting Started */}
                    <SectionBlock id="start" icon={<UserPlus className="w-6 h-6 text-blue-400" />} title="Начало работы">
                        <StepCard step={1} title="Регистрация клиники">
                            <p>Перейдите на <Link href="/register" className="text-blue-400 hover:underline">страницу регистрации</Link>. Заполните:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Название клиники/оптики</li>
                                <li>Email руководителя</li>
                                <li>Номер телефона</li>
                                <li>Пароль</li>
                            </ul>
                            <p>После регистрации вы автоматически получаете роль <strong>руководителя клиники</strong> с полным доступом.</p>
                        </StepCard>
                        <StepCard step={2} title="Добавление сотрудников">
                            <p>В разделе <strong>«Сотрудники»</strong> добавьте врачей и менеджеров. Каждому сотруднику назначается роль:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li><strong>Врач</strong> — создаёт заказы, ведёт пациентов</li>
                                <li><strong>Менеджер</strong> — управляет продажами, складом</li>
                                <li><strong>Бухгалтер</strong> — видит финансы и оплаты</li>
                            </ul>
                        </StepCard>
                        <StepCard step={3} title="Настройка профиля">
                            <p>Перейдите в <strong>«Профиль»</strong> (иконка в правом верхнем углу). Загрузите аватар, укажите полное имя и контактный телефон.</p>
                        </StepCard>
                        <Tip>При регистрации сейчас вы получаете <strong>3 месяца бесплатного</strong> полного доступа ко всем модулям!</Tip>
                    </SectionBlock>

                    {/* 2. Login */}
                    <SectionBlock id="login" icon={<Smartphone className="w-6 h-6 text-green-400" />} title="Вход в систему" badge="WhatsApp OTP">
                        <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                            <p>Есть два способа входа:</p>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-green-400" /> Через WhatsApp
                                    </h4>
                                    <ol className="list-decimal list-inside space-y-1 text-xs">
                                        <li>Нажмите вкладку «Телефон»</li>
                                        <li>Введите номер телефона</li>
                                        <li>Получите код в WhatsApp</li>
                                        <li>Введите код — вы в системе!</li>
                                    </ol>
                                </div>
                                <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-blue-400" /> По Email
                                    </h4>
                                    <ol className="list-decimal list-inside space-y-1 text-xs">
                                        <li>Нажмите вкладку «Email»</li>
                                        <li>Введите email и пароль</li>
                                        <li>Нажмите «Войти»</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                        <Tip>Рекомендуем вход через WhatsApp — это быстрее и не нужно запоминать пароль!</Tip>
                    </SectionBlock>

                    {/* 3. Dashboard */}
                    <SectionBlock id="dashboard" icon={<BarChart2 className="w-6 h-6 text-emerald-400" />} title="Дашборд">
                        <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                            <p>После входа вы попадаете на <strong>дашборд клиники</strong>. Здесь отображается:</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {[
                                    'Общее количество заказов',
                                    'Заказы в работе / готовые',
                                    'Количество пациентов',
                                    'Сумма за период',
                                    'Последние заказы',
                                    'Статистика по типам линз',
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </SectionBlock>

                    {/* 4. Orders */}
                    <SectionBlock id="orders" icon={<ClipboardList className="w-6 h-6 text-blue-400" />} title="Создание заказа на линзы">
                        <StepCard step={1} title="Нажмите «Новый заказ»">
                            <p>В меню выберите <strong>«Заказы» → «Новый заказ»</strong>. Откроется конструктор заказа.</p>
                        </StepCard>
                        <StepCard step={2} title="Выберите пациента">
                            <p>Начните вводить имя или телефон — система предложит существующих пациентов. Если пациент новый — создайте карточку прямо из формы заказа.</p>
                        </StepCard>
                        <StepCard step={3} title="Заполните параметры линз">
                            <p>Укажите параметры для каждого глаза (OD / OS):</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Дизайн линзы (стандарт, торический и др.)</li>
                                <li>Базовая кривизна (BC), диаметр</li>
                                <li>Оптическая сила (Power)</li>
                                <li>Дополнительные параметры (SAG, зоны и т.д.)</li>
                            </ul>
                        </StepCard>
                        <StepCard step={4} title="Отправьте заказ">
                            <p>Проверьте данные и нажмите <strong>«Создать заказ»</strong>. Заказ поступит в лабораторию и появится на канбан-доске производства.</p>
                        </StepCard>
                        <Warning>Внимательно проверяйте параметры OD/OS перед отправкой. После создания заказ можно отредактировать только до начала производства.</Warning>
                    </SectionBlock>

                    {/* 5. Patients */}
                    <SectionBlock id="patients" icon={<Stethoscope className="w-6 h-6 text-cyan-400" />} title="Управление пациентами">
                        <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                            <p>Раздел <strong>«Пациенты»</strong> содержит:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li><strong>Карточка пациента</strong> — ФИО, телефон, дата рождения, заметки</li>
                                <li><strong>История рецептов</strong> — все назначенные рецепты с датами</li>
                                <li><strong>История заказов</strong> — все заказы линз, привязанные к пациенту</li>
                                <li><strong>Поиск</strong> — быстрый поиск по имени или телефону</li>
                            </ul>
                            <p>Система автоматически обнаруживает дубликаты пациентов и предлагает объединить карточки.</p>
                        </div>
                    </SectionBlock>

                    {/* 6. Catalog */}
                    <SectionBlock id="catalog" icon={<ShoppingCart className="w-6 h-6 text-orange-400" />} title="Каталог товаров">
                        <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                            <p>В разделе <strong>«Каталог»</strong> представлены все товары лаборатории:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Линзы различных дизайнов с ценами</li>
                                <li>Растворы и аксессуары</li>
                                <li>Фильтрация по категориям</li>
                            </ul>
                            <p>Цены зависят от вашей роли — руководители видят оптовые цены, врачи — розничные.</p>
                        </div>
                    </SectionBlock>

                    {/* 7. POS */}
                    <SectionBlock id="pos" icon={<Scan className="w-6 h-6 text-teal-400" />} title="POS-терминал" badge="Продажи">
                        <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                            <p>Кассовый модуль <strong>«POS»</strong> позволяет:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Продавать товары из каталога прямо из CRM</li>
                                <li>Сканировать штрих-коды камерой телефона</li>
                                <li>Формировать чеки</li>
                                <li>Просматривать историю продаж</li>
                            </ul>
                        </div>
                    </SectionBlock>

                    {/* 8. Staff */}
                    <SectionBlock id="staff" icon={<Users className="w-6 h-6 text-indigo-400" />} title="Управление сотрудниками">
                        <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                            <p>Раздел доступен только <strong>руководителям клиники</strong>:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Добавление новых сотрудников (email + роль)</li>
                                <li>Изменение ролей и статусов</li>
                                <li>Деактивация аккаунтов уволенных сотрудников</li>
                            </ul>
                        </div>
                        <Tip>Каждый сотрудник входит под своим аккаунтом и видит только тот функционал, который положен его роли.</Tip>
                    </SectionBlock>

                    {/* 9. WhatsApp */}
                    <SectionBlock id="whatsapp" icon={<MessageSquare className="w-6 h-6 text-green-400" />} title="WhatsApp CRM" badge="Новинка">
                        <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                            <p>Модуль <strong>«Продажи»</strong> позволяет подключить WhatsApp вашей клиники:</p>
                        </div>
                        <StepCard step={1} title="Подключите WhatsApp">
                            <p>Перейдите в <strong>«Бот» → «Подключить WhatsApp»</strong>. Отсканируйте QR-код с телефона клиники (как в WhatsApp Web).</p>
                        </StepCard>
                        <StepCard step={2} title="Настройте автоответы">
                            <p>В разделе <strong>«Бот»</strong> настройте сценарии:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Приветственное сообщение</li>
                                <li>Меню услуг</li>
                                <li>Автоматическая запись на приём</li>
                                <li>Напоминания о визите</li>
                            </ul>
                        </StepCard>
                        <StepCard step={3} title="Работайте с лидами">
                            <p>Все входящие сообщения автоматически создают карточку лида в <strong>воронке продаж</strong>. Перетаскивайте лиды между этапами: Новый → Связались → Записан → Пришёл → Конвертирован.</p>
                        </StepCard>
                    </SectionBlock>

                    {/* 10. Tracking */}
                    <SectionBlock id="tracking" icon={<Search className="w-6 h-6 text-purple-400" />} title="Отслеживание заказа">
                        <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                            <p>Каждый заказ проходит через этапы:</p>
                            <div className="flex flex-wrap gap-2">
                                {['Новый', 'В работе', 'Контроль качества', 'Готов', 'Отгружен', 'Доставлен'].map((status, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <span className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded-full">{status}</span>
                                        {i < 5 && <ChevronRight className="w-3 h-3 text-gray-600" />}
                                    </div>
                                ))}
                            </div>
                            <p>Вы видите текущий статус каждого заказа в списке заказов и получаете уведомления при смене статуса.</p>
                        </div>
                    </SectionBlock>

                    {/* 11. FAQ */}
                    <SectionBlock id="faq" icon={<HelpCircle className="w-6 h-6 text-yellow-400" />} title="Частые вопросы">
                        <div className="space-y-4">
                            {[
                                {
                                    q: 'Как поменять пароль?',
                                    a: 'Перейдите в «Профиль» → введите новый пароль. Или используйте вход через WhatsApp — пароль не нужен.',
                                },
                                {
                                    q: 'Можно ли отредактировать заказ после отправки?',
                                    a: 'Да, пока заказ находится в статусе «Новый». После начала производства редактирование недоступно.',
                                },
                                {
                                    q: 'Как подключить интеграцию с ITIGRIS?',
                                    a: 'Напишите в поддержку через раздел «Помощь» — мы настроим синхронизацию с вашим ITIGRIS.',
                                },
                                {
                                    q: 'Сколько сотрудников можно добавить?',
                                    a: 'Без ограничений. Добавляйте столько врачей и менеджеров, сколько нужно.',
                                },
                                {
                                    q: 'Как появиться на MedMundus?',
                                    a: 'При регистрации в LensFlow ваш профиль автоматически создаётся на MedMundus. Пациенты смогут найти вас и записаться онлайн.',
                                },
                                {
                                    q: 'Что будет после 3 бесплатных месяцев?',
                                    a: 'Мы свяжемся с вами и предложим гибкий тариф. Ваши данные сохранятся в любом случае.',
                                },
                            ].map((item, i) => (
                                <div key={i} className="p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                                    <h4 className="font-semibold text-white text-sm mb-2">{item.q}</h4>
                                    <p className="text-gray-500 text-sm">{item.a}</p>
                                </div>
                            ))}
                        </div>
                    </SectionBlock>

                    {/* Support CTA */}
                    <div className="p-8 bg-gradient-to-r from-blue-600/15 to-purple-600/10 border border-blue-500/20 rounded-3xl text-center">
                        <h3 className="text-xl font-bold mb-2">Остались вопросы?</h3>
                        <p className="text-gray-400 text-sm mb-6">Напишите нам — мы поможем настроить систему и ответим на любые вопросы</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link href="/support" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-sm transition-colors">
                                Написать в поддержку
                            </Link>
                            <a href="https://wa.me/77018325694" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2">
                                <MessageSquare className="w-4 h-4" /> WhatsApp
                            </a>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
