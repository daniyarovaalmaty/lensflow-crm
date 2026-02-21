# LensFlow CRM

<div align="center">
  <h3>🛰 Логистическая CRM-система для оптик и лабораторий</h3>
  <p>Antigravity Edition - минималистичный дизайн без лишнего шума</p>
</div>

## 🎯 Описание проекта

LensFlow CRM — это бесшовная логистическая цепочка между **Оптиками** (заказчиками) и **Лабораториями** (производителями кастомных линз). Система построена на принципах Antigravity: чистота интерфейса, визуальная легкость, фокус на текущем действии.

### Ключевые возможности

- ✨ **Интерактивный конструктор заказов** с Progressive Disclosure
- 📊 **Production Hub** для управления очередью производства
- 🔄 **Интеграция МойСклад** для автоматической синхронизации каталога
- ⏱️ **Real-time мониторинг** статусов и таймеров производства
- 🎨 **Antigravity дизайн** с минималистичной эстетикой

## 🚀 Технологический стек

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS (кастомная дизайн-система)
- **State:** Zustand, React Query, React Hook Form
- **Animations:** Framer Motion
- **Validation:** Zod
- **Integrations:** МойСклад API
- **Database:** PostgreSQL (планируется)

## 📁 Структура проекта

```
ecliptic-space/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── orders/          # REST API для заказов
│   │   ├── optic/
│   │   │   ├── dashboard/       # Дашборд Оптики
│   │   │   └── orders/new/      # Конструктор заказов
│   │   ├── laboratory/
│   │   │   └── production/      # Production Hub
│   │   ├── layout.tsx
│   │   └── page.tsx             # Landing page
│   ├── components/
│   │   ├── order/               # Компоненты конструктора
│   │   └── production/          # Компоненты производства
│   ├── lib/
│   │   └── integrations/
│   │       └── moysklad.ts      # МойСклад API клиент
│   └── types/                   # TypeScript типы с Zod
├── package.json
└── README.md
```

## 🔧 Установка и запуск

### Предварительные требования

- Node.js 18+ и npm
- МойСклад аккаунт (для интеграции)

### Шаги установки

1. **Клонируйте репозиторий**
```bash
cd /Users/daniyarovaruslanovna/.gemini/antigravity/playground/ecliptic-space
```

2. **Установите зависимости**
```bash
npm install
```

3. **Настройте переменные окружения**
```bash
cp .env.example .env
```

Отредактируйте `.env` файл:
```env
# МойСклад credentials
MOYSKLAD_USERNAME=your_username
MOYSKLAD_PASSWORD=your_password

# Database (для production)
DATABASE_URL=postgresql://...
```

4. **Запустите dev сервер**
```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:3000`

## 📱 Основные интерфейсы

### 1. Конструктор заказа (Оптика)
- `/optic/orders/new`
- Progressive disclosure для разных типов линз
- OD/OS mirroring функционал
- Instant validation с Zod

### 2. Дашборд Оптики
- `/optic/dashboard`
- Статистика заказов
- Фильтрация по статусам
- История заказов

### 3. Production Hub (Лаборатория)
- `/laboratory/production`
- Kanban-доска (New → In Production → Ready → Shipped)
- Real-time таймеры производства
- Drag & drop управление (планируется)

## 🔌 Интеграция МойСклад

Система автоматически работает с МойСклад API:

1. **Импорт каталога** - синхронизация товаров при старте
2. **Экспорт заказов** - создание "Заказа покупателя"
3. **Обновление статусов** - синхронизация изменений
4. **Остатки** - периодическая проверка наличия

### API клиент

```typescript
import { getMoySkladClient } from '@/lib/integrations/moysklad';

const client = getMoySkladClient();
await client.syncCatalog(); // Синхронизация каталога
await client.createCustomerOrder(order); // Создание заказа
```

## 🎨 Дизайн-система Antigravity

Система использует кастомные Tailwind утилиты:

```tsx
// Кнопки
<button className="btn btn-primary">Создать</button>
<button className="btn btn-secondary">Отмена</button>
<button className="btn btn-ghost">Опции</button>

// Inputs
<input className="input" />

// Cards
<div className="card card-hover">...</div>

// Badges
<span className="badge badge-success">Готов</span>

// Skeletons (loading states)
<div className="skeleton h-20" />
```

## 🗺️ Roadmap

### ✅ Sprint 1 (Completed)
- [x] Order Constructor с Progressive Disclosure
- [x] Optic Dashboard
- [x] Laboratory Production Hub
- [x] МойСклад API интеграция

### 🔄 Sprint 2 (В разработке)
- [ ] Аутентификация и авторизация
- [ ] База данных пациентов
- [ ] Уведомления (Email, Telegram)
- [ ] Печать этикеток

### 📋 Sprint 3 (Планируется)
- [ ] Аналитика и отчеты
- [ ] Admin панель
- [ ] Export/Import данных
- [ ] Mobile приложение

## 🧪 Тестирование

```bash
# Unit тесты
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 API Documentation

### Orders API

**GET** `/api/orders`
- Query params: `status`, `optic_id`
- Response: `Order[]`

**POST** `/api/orders`
- Body: `CreateOrderDTO`
- Response: `Order`

**PATCH** `/api/orders/:id/status`
- Body: `{ status: OrderStatus }`
- Response: `Order`

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- **Product Design:** Antigravity Principles
- **Development:** LensFlow Team
- **Integration:** МойСклад API

---

<div align="center">
  Made with ❤️ using Next.js & TypeScript
</div>
