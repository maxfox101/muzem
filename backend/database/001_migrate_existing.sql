-- Миграция для существующих БД. Запускать после schema.sql или если что-то не работает.
-- Выполнить: psql -U postgres -d hero_memorial -f database/001_migrate_existing.sql
SET client_encoding TO 'UTF8';

-- 1. Таблица support_contacts (контакты поддержки для админа)
CREATE TABLE IF NOT EXISTS support_contacts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(50)
);
INSERT INTO support_contacts (id, email, phone) VALUES
    (1, 'support@sambek-museum.ru', '+7 (863) 123-45-67')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('support_contacts', 'id'), (SELECT COALESCE(MAX(id), 1) FROM support_contacts));

-- 2. Колонка phone в users (если старая схема без неё)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 3. Строка в cloud_storage_config (id=1 для админки)
INSERT INTO cloud_storage_config (id, enabled, link, max_size_mb) VALUES
    (1, FALSE, '', 50)
ON CONFLICT (id) DO NOTHING;

-- 4. Колонка cloud_link в applications (для ссылки на облако)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cloud_link VARCHAR(500);

-- 5. Последовательность users.id (чтобы не было конфликта при вставке тестовых пользователей)
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM users));
