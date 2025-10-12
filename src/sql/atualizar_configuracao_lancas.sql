-- Script SQL para atualizar a coluna peso_kg (configuração de lanças) dos guindastes
-- Execute este script no Supabase SQL Editor
-- Data: 12/10/2025

-- IMPORTANTE: A coluna 'peso_kg' na verdade armazena a configuração de lanças (ex: 2H1M, 3H1M, etc)

-- Limpar dados antigos (opcional - descomente se quiser resetar)
-- UPDATE guindastes SET peso_kg = NULL;

-- ============================================
-- ATUALIZAR CONFIGURAÇÕES DE LANÇAS
-- ============================================

-- Modelos 2H1M
UPDATE guindastes SET peso_kg = '2H1M' WHERE modelo LIKE '%2H1M%' OR subgrupo LIKE '%2H1M%';

-- Modelos 3H1M
UPDATE guindastes SET peso_kg = '3H1M' WHERE modelo LIKE '%3H1M%' OR subgrupo LIKE '%3H1M%';

-- Modelos 4H0M
UPDATE guindastes SET peso_kg = '4H0M' WHERE modelo LIKE '%4H0M%' OR subgrupo LIKE '%4H0M%';

-- Modelos 3H0M
UPDATE guindastes SET peso_kg = '3H0M' WHERE modelo LIKE '%3H0M%' OR subgrupo LIKE '%3H0M%';

-- Modelos 3H2M
UPDATE guindastes SET peso_kg = '3H2M' WHERE modelo LIKE '%3H2M%' OR subgrupo LIKE '%3H2M%';

-- Modelos 3H2M
UPDATE guindastes SET peso_kg = '3H2M' WHERE modelo LIKE '%3H2M%' OR subgrupo LIKE '%3H2M%';

-- Modelos 4H1M
UPDATE guindastes SET peso_kg = '4H1M' WHERE modelo LIKE '%4H1M%' OR subgrupo LIKE '%4H1M%';

-- Modelos 4H2M
UPDATE guindastes SET peso_kg = '4H2M' WHERE modelo LIKE '%4H2M%' OR subgrupo LIKE '%4H2M%';

-- ============================================
-- VERIFICAR RESULTADO
-- ============================================

-- Contar configurações por tipo
SELECT 
  peso_kg AS configuracao_lancas,
  COUNT(*) AS quantidade
FROM guindastes
WHERE peso_kg IS NOT NULL
GROUP BY peso_kg
ORDER BY peso_kg;

-- Ver guindastes sem configuração
SELECT 
  id,
  subgrupo,
  modelo,
  peso_kg
FROM guindastes
WHERE peso_kg IS NULL OR peso_kg = ''
ORDER BY subgrupo;

-- Ver todos os guindastes com suas configurações
SELECT 
  id,
  subgrupo,
  modelo,
  peso_kg AS configuracao_lancas
FROM guindastes
ORDER BY peso_kg, subgrupo;

-- ============================================
-- COMENTÁRIOS E OBSERVAÇÕES
-- ============================================

-- Baseado na imagem fornecida, as configurações são:
-- - 2H1M: 2 Hidráulicas + 1 Manual
-- - 3H1M: 3 Hidráulicas + 1 Manual
-- - 4H0M: 4 Hidráulicas + 0 Manual
-- - 3H0M: 3 Hidráulicas + 0 Manual
-- - 3H2M: 3 Hidráulicas + 2 Manuais
-- - 4H1M: 4 Hidráulicas + 1 Manual
-- - 4H2M: 4 Hidráulicas + 2 Manuais

-- As cores (verde, amarelo, branco) na planilha original provavelmente indicam:
-- - Verde: Modelo principal/mais vendido
-- - Amarelo: Modelo especial/destaque
-- - Branco: Modelo padrão

-- ATENÇÃO: Se a coluna peso_kg já tiver dados de peso real,
-- considere criar uma nova coluna 'configuracao_lancas' ao invés de sobrescrever.

