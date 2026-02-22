# Бэкенд АИС «Быть воином — жить вечно»

Node.js + Express + PostgreSQL

## Установка

```bash
cd backend
npm install
```

## Настройка PostgreSQL

1. Создайте базу данных:
```sql
CREATE DATABASE hero_memorial;
```

2. Выполните схему:
```bash
psql -U postgres -d hero_memorial -f database/schema.sql
```

3. Настройте `.env`:
```bash
cp .env.example .env
# Отредактируйте .env с вашими данными
```

## Запуск

```bash
npm run dev
```

API будет доступен на http://localhost:3000

## API Endpoints

- `GET /api/dictionaries/ranks` - Справочник званий
- `GET /api/dictionaries/localities` - Справочник населённых пунктов
- `GET /api/dictionaries/service-places` - Справочник мест службы
- `POST /api/applications` - Создание заявки (multipart/form-data)
- `GET /api/applications` - Список заявок
- `PATCH /api/applications/:id/status` - Изменение статуса заявки
- `GET /api/admin/cloud-storage` - Настройки облачного хранилища
- `POST /api/admin/cloud-storage` - Обновление настроек
- `POST /api/subscription/send-code` - Отправка кода подтверждения
- `POST /api/subscription/verify` - Проверка кода и подписка
