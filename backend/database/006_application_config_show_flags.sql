SET client_encoding TO 'UTF8';

ALTER TABLE application_submission_config
ADD COLUMN IF NOT EXISTS show_photo BOOLEAN DEFAULT TRUE;

ALTER TABLE application_submission_config
ADD COLUMN IF NOT EXISTS show_cloud_link BOOLEAN DEFAULT TRUE;

UPDATE application_submission_config SET show_photo = TRUE WHERE show_photo IS NULL;
UPDATE application_submission_config SET show_cloud_link = TRUE WHERE show_cloud_link IS NULL;
