SET client_encoding TO 'UTF8';

CREATE TABLE IF NOT EXISTS application_access_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    label TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
