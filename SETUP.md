# 🚀 Инструкция по запуску проекта

## Шаг 1: Установка PostgreSQL

1. Скачайте и установите PostgreSQL: https://www.postgresql.org/download/
2. Запомните пароль для пользователя `postgres`

## Шаг 2: Создание базы данных

Откройте pgAdmin или psql и выполните:

```sql
CREATE DATABASE hero_memorial;
```

Затем выполните схему:

```bash
cd backend
psql -U postgres -d hero_memorial -f database/schema.sql
```

## Шаг 3: Настройка бэкенда

```bash
cd backend
npm install
cp .env.example .env
```

Отредактируйте `.env`:
```
DB_USER=postgres
DB_PASSWORD=ваш_пароль
DB_NAME=hero_memorial
DB_HOST=localhost
DB_PORT=5432
```

## Шаг 4: Запуск бэкенда

```bash
cd backend
npm run dev
```

Бэкенд будет доступен на http://localhost:3000

## Шаг 5: Настройка фронтенда

```bash
cd ..
npm install
cp .env.example .env
```

## Шаг 6: Запуск фронтенда

```bash
npm run dev
```

Фронтенд будет доступен на http://localhost:5173

## ✅ Готово!

Откройте браузер: http://localhost:5173

## 📱 Мобильная версия

Проект полностью адаптивен. Откройте DevTools (F12) → Toggle device toolbar (Ctrl+Shift+M) и проверьте на разных размерах экрана (320px+).

## 🎨 Проверка доступности

Все элементы соответствуют WCAG 2.1 AA:
- Контрастность текста: минимум 4.5:1
- Touch targets: минимум 44×44px
- Фокусные состояния: border-2px, ring-4px
- Клавиатурная навигация работает
