import { NextResponse } from 'next/server';

// Имитация базы данных или ответа от МойСклад
const mockProductsFromMoySклад = [
  { id: '1', name: 'Оправа Ray-Ban Aviator', stock: 15, price: 55000 },
  { id: '2', name: 'Линзы Crizal Alize 1.5', stock: 42, price: 12000 },
  { id: '3', name: 'Солнцезащитные очки Polaroid', stock: 8, price: 28000 },
];

export async function GET() {
  try {
    // Читаем токен из нашего защищенного файла .env
    const token = process.env.MOYSKLAD_API_TOKEN;

    // Проверяем, есть ли доступ (симуляция безопасности)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No API Token' }, { status: 401 });
    }

    // Возвращаем данные в формате JSON
    return NextResponse.json({
      success: true,
      source: 'МойСклад DEV-Среда',
      lastSync: new Date().toISOString(),
      productsCount: mockProductsFromMoySклад.length,
      data: mockProductsFromMoySклад
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}