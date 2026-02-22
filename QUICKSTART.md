# ⚡ Быстрый старт (локально)

## 1. Установка зависимостей

```bash
# Фронтенд
npm install

# Бэкенд
cd backend
npm install
cd ..
```

## 2. PostgreSQL (если ещё не установлен)

Скачайте: https://www.postgresql.org/download/windows/

После установки создайте БД:
```sql
CREATE DATABASE hero_memorial;
```

Выполните схему:
```bash
cd backend
psql -U postgres -d hero_memorial -f database/schema.sql
```

## 3. Настройка .env

**backend/.env:**
```
DB_USER=postgres
DB_PASSWORD=ваш_пароль_postgres
DB_NAME=hero_memorial
DB_HOST=localhost
DB_PORT=5432
```

**.env (в корне проекта):**
```
VITE_API_URL=http://localhost:3000/api
```

## 4. Запуск

**Терминал 1 (бэкенд):**
```bash
cd backend
npm run dev
```

**Терминал 2 (фронтенд):**
```bash
npm run dev
```

## 5. Откройте браузер

http://localhost:5173

---

## ✅ Что работает

- ✅ Форма заявки с валидацией
- ✅ Автокоррекция ФИО (первая буква БОЛЬШАЯ)
- ✅ Календарь для дат
- ✅ Админ-панель (настройки облачного хранилища)
- ✅ Модерация (3 действия: принять/отклонить/уточнить)
- ✅ Подписка на акции (отправка кода)
- ✅ Мобильная версия (от 320px)
- ✅ WCAG 2.1 AA (контрастность, фокусы, рамки)

## 📱 Проверка мобильной версии

1. Откройте DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Выберите размер: iPhone SE (320px) или другой

## 🎨 Проверка доступности

- Все инпуты имеют `border-2`
- Все кнопки минимум 44×44px
- Контрастность текста: минимум 4.5:1
- Фокусные состояния: `ring-4` + `border-2`
