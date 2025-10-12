-- ============================================
-- VERIFICAR ESTRUTURA DA TABELA GUINDASTES
-- ============================================
-- Execute este script no Supabase SQL Editor para entender a estrutura

-- 1. Ver todas as colunas da tabela
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'guindastes'
ORDER BY ordinal_position;

-- 2. Ver alguns registros completos para entender os dados
SELECT *
FROM guindastes
LIMIT 10;

-- 3. Ver os valores únicos de 'grupo' (se existir)
SELECT DISTINCT grupo
FROM guindastes
ORDER BY grupo;

-- 4. Ver exemplos de cada coluna importante
SELECT 
  id,
  subgrupo,
  modelo,
  grupo,
  peso_kg,
  configuração
FROM guindastes
ORDER BY id
LIMIT 20;

-- 5. Verificar se já existe algum padrão nos dados
SELECT 
  grupo,
  COUNT(*) as quantidade,
  MIN(peso_kg) as peso_min,
  MAX(peso_kg) as peso_max
FROM guindastes
GROUP BY grupo
ORDER BY grupo;


