import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.MOYSKLAD_API_TOKEN;

    // Проверяем, что токен подтянулся из файла .env
    if (!token || token.includes('тестовый_токен')) {
      return NextResponse.json(
        { error: 'Укажите реальный токен в файле .env' },
        { status: 401 }
      );
    }

    // Официальный URL API МойСклад для получения ассортимента и остатков
    const url = 'https://api.moysklad.ru/api/remap/1.2/entity/assortment?stockMode=all';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Получаем данные в реальном времени, без кэширования
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        success: false, 
        error: `Ошибка МойСклад API: ${response.status}`, 
        details: errorText 
      }, { status: response.status });
    }

    const json = await response.json();

    // Форматируем полученные от МойСклад товары для нашей CRM
    const realProducts = (json.rows || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.salePrice ? item.salePrice / 100 : 0, // Переводим из копеек в нормальную валюту
      code: item.code || '—',
      stock: typeof item.stock !== 'undefined' ? item.stock : 0 // Доступный остаток
    }));

    return NextResponse.json({
      success: true,
      source: 'Реальная синхронизация с МойСклад API',
      lastSync: new Date().toISOString(),
      productsCount: realProducts.length,
      data: realProducts
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера CRM', 
      details: error.message 
    }, { status: 500 });
  }
}