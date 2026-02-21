import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-surface to-primary-50">
            <div className="max-w-4xl mx-auto px-6 py-12 text-center">
                {/* Logo/Title */}
                <div className="mb-12">
                    <h1 className="text-6xl font-bold text-gray-900 mb-4">
                        Lens<span className="text-primary-500">Flow</span>
                    </h1>
                    <p className="text-xl text-gray-600">
                        CRM система для оптик и лабораторий производства линз
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                    <div className="card card-hover">
                        <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center mb-4 mx-auto">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Оптика / Конструктор заказов</h3>
                        <p className="text-sm text-gray-600">
                            Создание заказов на линзы, отслеживание статусов, управление пациентами
                        </p>
                    </div>

                    <div className="card card-hover">
                        <div className="w-12 h-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mb-4 mx-auto">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Лаборатория / Производство</h3>
                        <p className="text-sm text-gray-600">
                            Управление очередью заказов, контроль качества, учёт браков и отгрузка
                        </p>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
                    <Link
                        href="/login?role=optic"
                        className="btn btn-primary text-base px-8 py-3 w-full sm:w-auto"
                    >
                        🏪 Вход для Оптики
                    </Link>
                    <Link
                        href="/login?role=laboratory"
                        className="btn text-base px-8 py-3 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors"
                    >
                        🏭 Вход для Лаборатории
                    </Link>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link
                        href="/register"
                        className="btn btn-secondary text-base px-8 py-3 w-full sm:w-auto"
                    >
                        📝 Регистрация
                    </Link>
                    <Link
                        href="/demo"
                        className="btn text-base px-8 py-3 w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors"
                    >
                        🚀 Демо-версия
                    </Link>
                </div>

                {/* Footer Info */}
                <div className="mt-16 text-sm text-gray-500">
                    <p>LensFlow CRM • Управление заказами линз от создания до доставки</p>
                </div>
            </div>
        </div>
    );
}
