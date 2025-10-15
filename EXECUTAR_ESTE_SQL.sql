-- ⚠️ IMPORTANTE: Execute este comando no SQL Editor do Supabase
-- A coluna ID é uma IDENTITY column (auto-increment nativo)

-- 1. Ver o MAX ID atual na tabela
SELECT MAX(id) as max_id_atual FROM guindastes;

-- 2. Resetar a IDENTITY para o próximo ID disponível
-- RESTART WITH define o próximo valor que será usado
SELECT setval(pg_get_serial_sequence('guindastes', 'id'), (SELECT MAX(id) FROM guindastes) + 1);

-- OU use este comando alternativo (mais moderno para IDENTITY):
-- ALTER TABLE guindastes ALTER COLUMN id RESTART WITH 66;
