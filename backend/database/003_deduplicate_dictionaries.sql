-- Удаление дубликатов в справочниках (оставляем по одной записи на каждое имя — с минимальным id).
-- Перед удалением перенаправляем ссылки в heroes на оставляемую запись.
-- Запуск: psql -U postgres -d hero_memorial -f database/003_deduplicate_dictionaries.sql
SET client_encoding TO 'UTF8';

-- ranks: перенаправить heroes.rank_id на оставляемый id, затем удалить дубликаты
UPDATE heroes h SET rank_id = k.keep_id
FROM (SELECT r.id AS dup_id, (SELECT MIN(r2.id) FROM ranks r2 WHERE r2.name = r.name) AS keep_id FROM ranks r) k
WHERE h.rank_id = k.dup_id AND k.dup_id <> k.keep_id;
DELETE FROM ranks r1 USING ranks r2 WHERE r1.name = r2.name AND r1.id > r2.id;

-- localities: перенаправить heroes.birth_locality_id
UPDATE heroes h SET birth_locality_id = k.keep_id
FROM (SELECT r.id AS dup_id, (SELECT MIN(r2.id) FROM localities r2 WHERE r2.name = r.name) AS keep_id FROM localities r) k
WHERE h.birth_locality_id = k.dup_id AND k.dup_id <> k.keep_id;
DELETE FROM localities r1 USING localities r2 WHERE r1.name = r2.name AND r1.id > r2.id;

-- service_places: перенаправить heroes.service_place_id
UPDATE heroes h SET service_place_id = k.keep_id
FROM (SELECT r.id AS dup_id, (SELECT MIN(r2.id) FROM service_places r2 WHERE r2.name = r.name) AS keep_id FROM service_places r) k
WHERE h.service_place_id = k.dup_id AND k.dup_id <> k.keep_id;
DELETE FROM service_places r1 USING service_places r2 WHERE r1.name = r2.name AND r1.id > r2.id;
