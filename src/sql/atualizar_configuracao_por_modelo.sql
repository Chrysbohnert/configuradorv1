-- ============================================
-- ATUALIZAR CONFIGURAÇÃO DE LANÇAS POR MODELO
-- ============================================
-- Este script mapeia cada modelo/capacidade para sua configuração de lanças
-- Baseado na planilha fornecida pelo usuário
-- Execute no Supabase SQL Editor

-- ============================================
-- IMPORTANTE: Este script substitui peso_kg (números) pelas configurações de lanças
-- ============================================

-- ============================================
-- GSI - Guindastes Stark Industrial
-- ============================================

-- GSI 6.5 → 2H1M
UPDATE guindastes 
SET peso_kg = '2H1M' 
WHERE grupo = 'GSI' 
  AND (modelo LIKE 'GSI 6.5%' OR subgrupo LIKE '%GSI 6.5%')
  AND peso_kg != '2H1M';

-- GSI 8.0 → 3H1M
UPDATE guindastes 
SET peso_kg = '3H1M' 
WHERE grupo = 'GSI' 
  AND (modelo LIKE 'GSI 8.0%' OR subgrupo LIKE '%GSI 8.0%')
  AND peso_kg != '3H1M';

-- GSI 10.8 → 4H0M
UPDATE guindastes 
SET peso_kg = '4H0M' 
WHERE grupo = 'GSI' 
  AND (modelo LIKE 'GSI 10.8%' OR subgrupo LIKE '%GSI 10.8%')
  AND peso_kg != '4H0M';

-- ============================================
-- GSE - Guindastes Stark Especiais
-- ============================================

-- GSE 6.5 → 2H1M
UPDATE guindastes 
SET peso_kg = '2H1M' 
WHERE grupo = 'GSE' 
  AND (modelo LIKE 'GSE 6.5%' OR subgrupo LIKE '%GSE 6.5%')
  AND peso_kg != '2H1M';

-- GSE 8.0 → 3H1M
UPDATE guindastes 
SET peso_kg = '3H1M' 
WHERE grupo = 'GSE' 
  AND (modelo LIKE 'GSE 8.0%' OR subgrupo LIKE '%GSE 8.0%')
  AND peso_kg != '3H1M';

-- GSE 10.8 → 3H0M
UPDATE guindastes 
SET peso_kg = '3H0M' 
WHERE grupo = 'GSE' 
  AND (modelo LIKE 'GSE 10.8%' OR subgrupo LIKE '%GSE 10.8%')
  AND peso_kg != '3H0M';

-- GSE 12.8 → 3H2M
UPDATE guindastes 
SET peso_kg = '3H2M' 
WHERE grupo = 'GSE' 
  AND (modelo LIKE 'GSE 12.8%' OR subgrupo LIKE '%GSE 12.8%')
  AND peso_kg != '3H2M';

-- GSE 13.0 → 4H1M
UPDATE guindastes 
SET peso_kg = '4H1M' 
WHERE grupo = 'GSE' 
  AND (modelo LIKE 'GSE 13.0%' OR subgrupo LIKE '%GSE 13.0%')
  AND peso_kg != '4H1M';

-- GSE 15.0 → 4H2M
UPDATE guindastes 
SET peso_kg = '4H2M' 
WHERE grupo = 'GSE' 
  AND (modelo LIKE 'GSE 15.0%' OR subgrupo LIKE '%GSE 15.0%')
  AND peso_kg != '4H2M';

-- GSE 15.8 → 4H2M
UPDATE guindastes 
SET peso_kg = '4H2M' 
WHERE grupo = 'GSE' 
  AND (modelo LIKE 'GSE 15.8%' OR subgrupo LIKE '%GSE 15.8%')
  AND peso_kg != '4H2M';

-- ============================================
-- VERIFICAR RESULTADO
-- ============================================

-- 1. Ver quantos foram atualizados por configuração
SELECT 
  peso_kg AS configuracao,
  COUNT(*) AS quantidade
FROM guindastes
WHERE peso_kg IN ('2H1M', '3H0M', '3H1M', '3H2M', '4H0M', '4H1M', '4H2M')
GROUP BY peso_kg
ORDER BY peso_kg;

-- 2. Ver guindastes que ainda não foram atualizados (têm valores numéricos)
SELECT 
  id,
  subgrupo,
  modelo,
  grupo,
  peso_kg
FROM guindastes
WHERE peso_kg NOT IN ('2H1M', '3H0M', '3H1M', '3H2M', '4H0M', '4H1M', '4H2M')
  AND peso_kg IS NOT NULL
ORDER BY grupo, modelo;

-- 3. Ver resultado completo por grupo
SELECT 
  grupo,
  modelo,
  peso_kg AS configuracao,
  COUNT(*) AS quantidade
FROM guindastes
WHERE peso_kg IN ('2H1M', '3H0M', '3H1M', '3H2M', '4H0M', '4H1M', '4H2M')
GROUP BY grupo, modelo, peso_kg
ORDER BY grupo, modelo;

-- 4. Ver todos os GSI atualizados
SELECT 
  id,
  subgrupo,
  modelo,
  peso_kg AS configuracao
FROM guindastes
WHERE grupo = 'GSI'
ORDER BY modelo, id;

-- 5. Ver todos os GSE atualizados
SELECT 
  id,
  subgrupo,
  modelo,
  peso_kg AS configuracao
FROM guindastes
WHERE grupo = 'GSE'
ORDER BY modelo, id;

-- ============================================
-- MAPEAMENTO USADO
-- ============================================
-- 
-- GSI (Guindastes Stark Industrial):
-- - GSI 6.5  → 2H1M (2 Hidráulicas + 1 Manual)
-- - GSI 8.0  → 3H1M (3 Hidráulicas + 1 Manual)
-- - GSI 10.8 → 4H0M (4 Hidráulicas + 0 Manual)
-- 
-- GSE (Guindastes Stark Especiais):
-- - GSE 6.5  → 2H1M (2 Hidráulicas + 1 Manual)
-- - GSE 8.0  → 3H1M (3 Hidráulicas + 1 Manual)
-- - GSE 10.8 → 3H0M (3 Hidráulicas + 0 Manual)
-- - GSE 12.8 → 3H2M (3 Hidráulicas + 2 Manuais)
-- - GSE 13.0 → 4H1M (4 Hidráulicas + 1 Manual)
-- - GSE 15.0 → 4H2M (4 Hidráulicas + 2 Manuais)
-- - GSE 15.8 → 4H2M (4 Hidráulicas + 2 Manuais)


