-- PostgreSQL схема для АИС «Быть воином — жить вечно»
-- В Windows cmd для нормального отображения сообщений: chcp 65001 перед запуском или используйте run_schema_utf8.bat
-- INSERT 0 0 при повторном запуске — нормально (данные уже есть).
SET client_encoding TO 'UTF8';

-- Справочник званий
CREATE TABLE IF NOT EXISTS ranks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Справочник населённых пунктов
CREATE TABLE IF NOT EXISTS localities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    region VARCHAR(255) DEFAULT 'Ростовская область',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_localities_name ON localities(name);

-- Справочник мест службы
CREATE TABLE IF NOT EXISTS service_places (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) DEFAULT 'sender',
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Герои (погибшие участники СВО)
CREATE TABLE IF NOT EXISTS heroes (
    id SERIAL PRIMARY KEY,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    birth_date DATE NOT NULL,
    birth_locality_id INTEGER REFERENCES localities(id),
    death_date DATE,
    rank_id INTEGER REFERENCES ranks(id) NOT NULL,
    service_place_id INTEGER REFERENCES service_places(id),
    extra_info TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_heroes_name_birth ON heroes(last_name, first_name, birth_date);
CREATE INDEX IF NOT EXISTS idx_heroes_locality ON heroes(birth_locality_id);

-- Заявки
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    hero_id INTEGER REFERENCES heroes(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'draft',
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    moderator_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    moderator_comments TEXT,
    sender_full_name VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);

-- Медиафайлы
CREATE TABLE IF NOT EXISTS hero_media (
    id SERIAL PRIMARY KEY,
    hero_id INTEGER REFERENCES heroes(id) ON DELETE CASCADE,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    thumbnail_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Журнал аудита
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- Подписки на новости
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    verification_code VARCHAR(6),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Настройки облачного хранилища (админ)
CREATE TABLE IF NOT EXISTS cloud_storage_config (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE,
    link VARCHAR(500),
    max_size_mb INTEGER DEFAULT 50,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Контакты поддержки (админ редактирует)
CREATE TABLE IF NOT EXISTS support_contacts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(50)
);
INSERT INTO support_contacts (id, email, phone) VALUES
    (1, 'support@sambek-museum.ru', '+7 (863) 123-45-67')
ON CONFLICT (id) DO NOTHING;

-- Вставка начальных данных
INSERT INTO ranks (name) VALUES
    ('Рядовой'), ('Ефрейтор'), ('Младший сержант'), ('Сержант'),
    ('Старший сержант'), ('Старшина'), ('Прапорщик'), ('Старший прапорщик'),
    ('Младший лейтенант'), ('Лейтенант'), ('Старший лейтенант'), ('Капитан'),
    ('Майор'), ('Подполковник'), ('Полковник'),
    ('Генерал-майор'), ('Генерал-лейтенант'), ('Генерал-полковник')
ON CONFLICT (name) DO NOTHING;

INSERT INTO localities (name)
SELECT v.name FROM (VALUES
    ('Ростов-на-Дону'), ('Таганрог'), ('Шахты'), ('Новочеркасск'), ('Волгодонск'),
    ('Батайск'), ('Новошахтинск'), ('Азов'), ('Каменск-Шахтинский'), ('Гуково')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM localities l WHERE l.name = v.name);

INSERT INTO service_places (name)
SELECT v.name FROM (VALUES
    ('Сухопутные войска'), ('Военно-морской флот'), ('Воздушно-космические силы'),
    ('Воздушно-десантные войска'), ('Ракетные войска стратегического назначения'),
    ('Войска национальной гвардии'), ('Пограничная служба'), ('Другое')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM service_places s WHERE s.name = v.name);

INSERT INTO cloud_storage_config (id, enabled, link, max_size_mb) VALUES
    (1, FALSE, '', 50)
ON CONFLICT (id) DO NOTHING;

-- Пользователь по умолчанию (для заявок без авторизации)
INSERT INTO users (id, name, email, password_hash, role) VALUES
    (1, 'Система', 'system@hero.local', 'unused', 'admin')
ON CONFLICT (email) DO NOTHING;
