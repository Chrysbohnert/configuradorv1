-- ============================================
-- SCRIPT COMPLETO: Atualizar Configuração de Lanças
-- ============================================
-- Este script atualiza a coluna peso_kg com a configuração de lanças
-- baseado nos dados da planilha fornecida
-- Execute no Supabase SQL Editor
-- Data: 12/10/2025

-- ============================================
-- MÉTODO 1: Atualização por padrão no nome/modelo
-- ============================================
-- Este método busca pela configuração no próprio nome ou modelo do guindaste

UPDATE guindastes 
SET peso_kg = '2H1M' 
WHERE (modelo ILIKE '%2H1M%' OR subgrupo ILIKE '%2H1M%')
  AND (peso_kg IS NULL OR peso_kg = '' OR peso_kg != '2H1M');

UPDATE guindastes 
SET peso_kg = '3H1M' 
WHERE (modelo ILIKE '%3H1M%' OR subgrupo ILIKE '%3H1M%')
  AND (peso_kg IS NULL OR peso_kg = '' OR peso_kg != '3H1M');

UPDATE guindastes 
SET peso_kg = '4H0M' 
WHERE (modelo ILIKE '%4H0M%' OR subgrupo ILIKE '%4H0M%')
  AND (peso_kg IS NULL OR peso_kg = '' OR peso_kg != '4H0M');

UPDATE guindastes 
SET peso_kg = '3H0M' 
WHERE (modelo ILIKE '%3H0M%' OR subgrupo ILIKE '%3H0M%')
  AND (peso_kg IS NULL OR peso_kg = '' OR peso_kg != '3H0M');

UPDATE guindastes 
SET peso_kg = '3H2M' 
WHERE (modelo ILIKE '%3H2M%' OR subgrupo ILIKE '%3H2M%')
  AND (peso_kg IS NULL OR peso_kg = '' OR peso_kg != '3H2M');

UPDATE guindastes 
SET peso_kg = '4H1M' 
WHERE (modelo ILIKE '%4H1M%' OR subgrupo ILIKE '%4H1M%')
  AND (peso_kg IS NULL OR peso_kg = '' OR peso_kg != '4H1M');

UPDATE guindastes 
SET peso_kg = '4H2M' 
WHERE (modelo ILIKE '%4H2M%' OR subgrupo ILIKE '%4H2M%')
  AND (peso_kg IS NULL OR peso_kg = '' OR peso_kg != '4H2M');

-- ============================================
-- MÉTODO 2: Verificar e listar guindastes sem configuração
-- ============================================
-- Use esta query para ver quais guindastes ainda não têm configuração

SELECT 
  id,
  subgrupo,
  modelo,
  peso_kg AS configuracao_atual
FROM guindastes
WHERE peso_kg IS NULL OR peso_kg = ''
ORDER BY subgrupo;

-- ============================================
-- MÉTODO 3: Atualização manual para casos específicos
-- ============================================
-- Se alguns guindastes não foram pegos pelo MÉTODO 1, 
-- use as queries abaixo ajustando os IDs ou nomes

-- Exemplo: Atualizar por ID específico
-- UPDATE guindastes SET peso_kg = '2H1M' WHERE id = 1;
-- UPDATE guindastes SET peso_kg = '3H1M' WHERE id = 2;

-- Exemplo: Atualizar por modelo ou subgrupo exato
-- UPDATE guindastes SET peso_kg = '2H1M' WHERE modelo = 'CR 3000';
-- UPDATE guindastes SET peso_kg = '3H1M' WHERE subgrupo = 'Guindaste CR 5000';

-- ============================================
-- RELATÓRIO: Verificar resultado final
-- ============================================

-- 1. Contagem por configuração
SELECT 
  COALESCE(peso_kg, 'SEM CONFIGURAÇÃO') AS configuracao_lancas,
  COUNT(*) AS quantidade
FROM guindastes
GROUP BY peso_kg
ORDER BY 
  CASE 
    WHEN peso_kg IS NULL THEN 'ZZZZ'
    ELSE peso_kg 
  END;

-- 2. Lista completa ordenada por configuração
SELECT 
  peso_kg AS configuracao,
  subgrupo,
  modelo,
  id
FROM guindastes
ORDER BY 
  CASE 
    WHEN peso_kg = '2H1M' THEN 1
    WHEN peso_kg = '3H0M' THEN 2
    WHEN peso_kg = '3H1M' THEN 3
    WHEN peso_kg = '3H2M' THEN 4
    WHEN peso_kg = '4H0M' THEN 5
    WHEN peso_kg = '4H1M' THEN 6
    WHEN peso_kg = '4H2M' THEN 7
    ELSE 99
  END,
  subgrupo;

-- 3. Guindastes que podem precisar de ajuste manual
SELECT 
  id,
  subgrupo,
  modelo,
  peso_kg AS configuracao_atual,
  CASE
    WHEN subgrupo ILIKE '%2H1M%' OR modelo ILIKE '%2H1M%' THEN 'Deveria ser 2H1M'
    WHEN subgrupo ILIKE '%3H1M%' OR modelo ILIKE '%3H1M%' THEN 'Deveria ser 3H1M'
    WHEN subgrupo ILIKE '%4H0M%' OR modelo ILIKE '%4H0M%' THEN 'Deveria ser 4H0M'
    WHEN subgrupo ILIKE '%3H0M%' OR modelo ILIKE '%3H0M%' THEN 'Deveria ser 3H0M'
    WHEN subgrupo ILIKE '%3H2M%' OR modelo ILIKE '%3H2M%' THEN 'Deveria ser 3H2M'
    WHEN subgrupo ILIKE '%4H1M%' OR modelo ILIKE '%4H1M%' THEN 'Deveria ser 4H1M'
    WHEN subgrupo ILIKE '%4H2M%' OR modelo ILIKE '%4H2M%' THEN 'Deveria ser 4H2M'
    ELSE 'Verificar manualmente'
  END AS sugestao
FROM guindastes
WHERE peso_kg IS NULL OR peso_kg = ''
ORDER BY subgrupo;

-- ============================================
-- RESUMO DAS CONFIGURAÇÕES
-- ============================================

-- Baseado na imagem fornecida:
-- 
-- Configuração | Descrição                    | Quantidade Esperada
-- -------------|------------------------------|--------------------
-- 2H1M         | 2 Hidráulicas + 1 Manual     | Múltiplos modelos
-- 3H0M         | 3 Hidráulicas + 0 Manual     | Múltiplos modelos
-- 3H1M         | 3 Hidráulicas + 1 Manual     | Múltiplos modelos (mais comum)
-- 3H2M         | 3 Hidráulicas + 2 Manuais    | Alguns modelos
-- 4H0M         | 4 Hidráulicas + 0 Manual     | Múltiplos modelos
-- 4H1M         | 4 Hidráulicas + 1 Manual     | Alguns modelos
-- 4H2M         | 4 Hidráulicas + 2 Manuais    | Alguns modelos
--
-- Cores na planilha original (não afetam o SQL):
-- - Verde: Modelo destacado/principal
-- - Amarelo: Modelo especial/atenção
-- - Branco: Modelo padrão

-- ============================================
-- INSTRUÇÕES DE USO
-- ============================================
-- 
-- PASSO 1: Execute o MÉTODO 1 (todas as queries UPDATE)
-- PASSO 2: Execute o RELATÓRIO para verificar o resultado
-- PASSO 3: Se houver guindastes sem configuração, use o MÉTODO 3 para ajuste manual
-- PASSO 4: Execute novamente o RELATÓRIO para confirmar

