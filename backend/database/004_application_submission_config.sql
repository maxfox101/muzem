SET client_encoding TO 'UTF8';

CREATE TABLE IF NOT EXISTS application_submission_config (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT TRUE,
    disabled_message TEXT DEFAULT '',
    custom_form_fields JSONB DEFAULT '[]'::jsonb
);

INSERT INTO application_submission_config (id, is_enabled, disabled_message, custom_form_fields)
VALUES (1, TRUE, '', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

ALTER TABLE application_submission_config
ADD COLUMN IF NOT EXISTS custom_form_fields JSONB DEFAULT '[]'::jsonb;
