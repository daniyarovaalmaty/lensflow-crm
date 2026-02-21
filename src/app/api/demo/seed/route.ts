import { NextResponse } from 'next/server';

declare global {
    var orders: any[] | undefined;
}

/**
 * POST /api/demo/seed - Seed demo orders for testing
 */
export async function POST() {
    try {
        if (!global.orders) {
            global.orders = [];
        }

        // Don't duplicate if already seeded
        if (global.orders.length > 0) {
            return NextResponse.json({
                message: 'Demo orders already exist',
                count: global.orders.length,
            });
        }

        const now = new Date();
        const demoOrders = [
            // 1. New order
            {
                order_id: 'LX-DEMO001',
                meta: {
                    optic_id: 'user-2',
                    optic_name: 'Оптика на Невском',
                    doctor: 'Доктор Иванов И.И.',
                    created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                },
                patient: {
                    name: 'Петрова Анна Сергеевна',
                    phone: '+7 900 111 22 33',
                    email: 'petrova@mail.ru',
                },
                config: {
                    type: 'medilens',
                    eyes: {
                        od: {
                            characteristic: 'toric',
                            km: 7.8,
                            tp: -3.5,
                            dia: 10.6,
                            e1: 0.5,
                            e2: 0.4,
                            tor: 1.25,
                            dk: '100',
                            color: 'Синий',
                            qty: 2,
                            trial: false,
                            myorthok: true,
                        },
                        os: {
                            characteristic: 'toric',
                            km: 7.9,
                            tp: -2.75,
                            dia: 10.6,
                            e1: 0.45,
                            e2: 0.35,
                            tor: 1.0,
                            dk: '100',
                            color: 'Синий',
                            qty: 2,
                            trial: false,
                            myorthok: true,
                        },
                    },
                },
                status: 'new',
                delivery_method: 'СДЭК',
                delivery_address: 'г. Алматы, ул. Абая 150, оф. 312',
                notes: 'Срочный заказ, пациент ждёт',
                payment_status: 'unpaid',
            },
            // 2. In production order
            {
                order_id: 'LX-DEMO002',
                meta: {
                    optic_id: 'user-2',
                    optic_name: 'Оптика на Невском',
                    doctor: 'Доктор Сидоров А.П.',
                    created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
                },
                patient: {
                    name: 'Козлов Дмитрий Владимирович',
                    phone: '+7 900 444 55 66',
                },
                config: {
                    type: 'medilens',
                    eyes: {
                        od: {
                            characteristic: 'spherical',
                            km: 8.0,
                            tp: -4.0,
                            dia: 10.8,
                            e1: 0.6,
                            dk: '125',
                            color: 'Зелёный',
                            qty: 1,
                            trial: true,
                        },
                        os: {
                            characteristic: 'spherical',
                            km: 7.85,
                            tp: -3.25,
                            dia: 10.8,
                            e1: 0.55,
                            dk: '125',
                            color: 'Зелёный',
                            qty: 1,
                            trial: true,
                        },
                    },
                },
                status: 'in_production',
                production_started_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
                delivery_method: 'Самовывоз',
                notes: 'Пробные линзы для подбора',
                payment_status: 'partial',
            },
            // 3. Ready order
            {
                order_id: 'LX-DEMO003',
                meta: {
                    optic_id: 'user-2',
                    optic_name: 'Оптика на Невском',
                    doctor: 'Доктор Иванов И.И.',
                    created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                },
                patient: {
                    name: 'Смирнова Елена Александровна',
                    phone: '+7 900 777 88 99',
                    email: 'smirnova@gmail.com',
                },
                config: {
                    type: 'medilens',
                    eyes: {
                        od: {
                            characteristic: 'rgp',
                            km: 7.7,
                            tp: -5.0,
                            dia: 10.4,
                            e1: 0.7,
                            e2: 0.6,
                            dk: '180',
                            color: 'Голубой',
                            qty: 3,
                            myorthok: false,
                        },
                        os: {
                            characteristic: 'rgp',
                            km: 7.65,
                            tp: -4.5,
                            dia: 10.4,
                            e1: 0.65,
                            e2: 0.55,
                            dk: '180',
                            color: 'Голубой',
                            qty: 3,
                            myorthok: false,
                        },
                    },
                },
                status: 'ready',
                production_started_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                production_completed_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                delivery_method: 'Казпочта',
                delivery_address: 'г. Астана, пр. Назарбаева 44',
                company: 'ТОО "Оптика Плюс"',
                inn: '123456789012',
                payment_status: 'paid',
            },
            // 4. Shipped order
            {
                order_id: 'LX-DEMO004',
                meta: {
                    optic_id: 'user-2',
                    optic_name: 'Оптика на Невском',
                    doctor: 'Доктор Кузнецова М.В.',
                    created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                },
                patient: {
                    name: 'Волков Артём Игоревич',
                    phone: '+7 900 333 22 11',
                },
                config: {
                    type: 'medilens',
                    eyes: {
                        od: {
                            characteristic: 'toric',
                            km: 7.95,
                            tp: -2.0,
                            dia: 10.6,
                            e1: 0.4,
                            tor: 0.75,
                            dk: '50',
                            color: 'Тёмно-синий',
                            qty: 2,
                        },
                        os: {
                            characteristic: 'spherical',
                            km: 8.1,
                            tp: -1.75,
                            dia: 10.6,
                            e1: 0.38,
                            dk: '50',
                            color: 'Тёмно-синий',
                            qty: 2,
                        },
                    },
                },
                status: 'shipped',
                tracking_number: 'KZ1234567890',
                production_started_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                production_completed_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                shipped_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                delivery_method: 'СДЭК',
                delivery_address: 'г. Шымкент, ул. Тауке хана 88',
                payment_status: 'paid',
            },
            // 5. Order with defect
            {
                order_id: 'LX-DEMO005',
                meta: {
                    optic_id: 'user-2',
                    optic_name: 'Оптика на Невском',
                    doctor: 'Доктор Сидоров А.П.',
                    created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
                },
                patient: {
                    name: 'Новикова Мария Петровна',
                    phone: '+7 900 555 66 77',
                },
                config: {
                    type: 'medilens',
                    eyes: {
                        od: {
                            characteristic: 'spherical',
                            km: 7.75,
                            tp: -6.0,
                            dia: 10.5,
                            e1: 0.8,
                            dk: '100',
                            color: 'Фиолетовый',
                            qty: 2,
                            apical_clearance: 2,
                            compression_factor: -1.5,
                        },
                        os: {
                            characteristic: 'spherical',
                            km: 7.7,
                            tp: -5.5,
                            dia: 10.5,
                            e1: 0.75,
                            dk: '100',
                            color: 'Фиолетовый',
                            qty: 2,
                            apical_clearance: 1.5,
                            compression_factor: -1.0,
                        },
                    },
                },
                status: 'rework',
                production_started_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Переделка после обнаружения дефекта',
                payment_status: 'unpaid',
                defects: [
                    {
                        id: 'DEF-DEMO001',
                        qty: 1,
                        date: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
                        note: 'Царапина на поверхности OD линзы, обнаружена при финальной проверке качества',
                        archived: false,
                    },
                ],
            },
        ];

        global.orders.push(...demoOrders);

        return NextResponse.json({
            message: 'Demo orders seeded successfully',
            count: demoOrders.length,
        });
    } catch (error) {
        console.error('Seed demo orders error:', error);
        return NextResponse.json(
            { error: 'Failed to seed demo orders' },
            { status: 500 }
        );
    }
}
