-- 🔍 SCRIPT DE VERIFICAÇÃO - Sistema de Preços
-- Execute estes SQLs no Supabase para diagnosticar o problema

-- ============================================
-- 1. VERIFICAR VENDEDORES E SUAS REGIÕES
-- ============================================
SELECT 
  id, 
  nome, 
  email, 
  regiao,
  CASE 
    WHEN regiao IS NULL THEN '❌ REGIÃO NULA'
    WHEN regiao = '' THEN '❌ REGIÃO VAZIA'
    ELSE '✅ OK'
  END as status_regiao
FROM users 
WHERE tipo = 'vendedor'
ORDER BY nome;

-- Resultado esperado: Campo 'regiao' deve ter um dos valores:
-- 'Sul', 'Sudeste', 'Norte', 'Nordeste', 'Centro-Oeste', 'Rio Grande do Sul'


-- ============================================
-- 2. VERIFICAR SE TABELA DE PREÇOS EXISTE
-- ============================================
SELECT COUNT(*) as total_registros 
FROM precos_guindaste_regiao;

-- Resultado esperado: Número > 0


-- ============================================
-- 3. VER TODOS OS PREÇOS CADASTRADOS
-- ============================================
SELECT 
  p.id,
  p.guindaste_id,
  g.subgrupo as nome_guindaste,
  g.codigo_referencia,
  p.regiao,
  p.preco
FROM precos_guindaste_regiao p
LEFT JOIN guindastes g ON g.id = p.guindaste_id
ORDER BY g.subgrupo, p.regiao;

-- Resultado esperado: Para cada guindaste, deve haver 5 registros (uma para cada região)


-- ============================================
-- 4. GUINDASTES SEM PREÇOS CADASTRADOS
-- ============================================
SELECT 
  g.id,
  g.subgrupo,
  g.codigo_referencia,
  COUNT(p.id) as qtd_precos_cadastrados,
  CASE 
    WHEN COUNT(p.id) = 0 THEN '❌ SEM PREÇOS'
    WHEN COUNT(p.id) < 5 THEN '⚠️ PREÇOS INCOMPLETOS'
    ELSE '✅ COMPLETO'
  END as status
FROM guindastes g
LEFT JOIN precos_guindaste_regiao p ON p.guindaste_id = g.id
GROUP BY g.id, g.subgrupo, g.codigo_referencia
HAVING COUNT(p.id) < 5
ORDER BY g.subgrupo;

-- Resultado esperado: Vazio (sem resultados)
-- Se houver resultados, esses guindastes precisam ter preços cadastrados!


-- ============================================
-- 5. VERIFICAR REGIÕES CADASTRADAS
-- ============================================
SELECT 
  regiao,
  COUNT(*) as quantidade_guindastes
FROM precos_guindaste_regiao
GROUP BY regiao
ORDER BY regiao;

-- Resultado esperado: Deve ter exatamente 5 regiões:
-- 'norte-nordeste'
-- 'sul-sudeste'
-- 'centro-oeste'
-- 'rs-com-ie'
-- 'rs-sem-ie'


-- ============================================
-- 6. VERIFICAR PREÇOS DE UM GUINDASTE ESPECÍFICO
-- ============================================
-- Substitua 1 pelo ID do guindaste que você quer verificar
SELECT 
  g.id,
  g.subgrupo,
  p.regiao,
  p.preco
FROM guindastes g
LEFT JOIN precos_guindaste_regiao p ON p.guindaste_id = g.id
WHERE g.id = 1
ORDER BY p.regiao;

-- Resultado esperado: 5 linhas (uma para cada região)


-- ============================================
-- 7. VERIFICAR SE HÁ PREÇOS NULOS OU ZERO
-- ============================================
SELECT 
  g.subgrupo,
  p.regiao,
  p.preco
FROM precos_guindaste_regiao p
JOIN guindastes g ON g.id = p.guindaste_id
WHERE p.preco IS NULL OR p.preco <= 0
ORDER BY g.subgrupo;

-- Resultado esperado: Vazio (sem resultados)


-- ============================================
-- 8. TESTE DE BUSCA (SIMULAR O QUE O SISTEMA FAZ)
-- ============================================
-- Exemplo: Buscar preço para guindaste ID 1 na região sul-sudeste
SELECT preco 
FROM precos_guindaste_regiao 
WHERE guindaste_id = 1 
  AND regiao = 'sul-sudeste'
LIMIT 1;

-- Substitua os valores acima para testar com seu guindaste e região específicos


-- ============================================
-- 9. INSERIR PREÇOS DE EXEMPLO (SE NECESSÁRIO)
-- ============================================
-- ATENÇÃO: Execute apenas se não houver preços cadastrados!
-- Substitua os IDs dos guindastes pelos IDs reais do seu banco

/*
-- Exemplo: Cadastrar preços para guindaste ID 1
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco) VALUES
(1, 'norte-nordeste', 95000.00),
(1, 'sul-sudeste', 85000.00),
(1, 'centro-oeste', 90000.00),
(1, 'rs-com-ie', 88000.00),
(1, 'rs-sem-ie', 92000.00);

-- Exemplo: Cadastrar preços para guindaste ID 2
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco) VALUES
(2, 'norte-nordeste', 105000.00),
(2, 'sul-sudeste', 95000.00),
(2, 'centro-oeste', 100000.00),
(2, 'rs-com-ie', 98000.00),
(2, 'rs-sem-ie', 102000.00);
*/


-- ============================================
-- 10. CORRIGIR REGIÃO DE VENDEDORES (SE NECESSÁRIO)
-- ============================================
-- Execute apenas se o campo 'regiao' estiver incorreto

/*
-- Exemplo: Corrigir região de um vendedor específico
UPDATE users 
SET regiao = 'Sul' 
WHERE email = 'vendedor@email.com';

-- Ou atualizar vários vendedores de uma vez
UPDATE users 
SET regiao = 'Sul' 
WHERE tipo = 'vendedor' 
  AND (regiao IS NULL OR regiao = '');
*/


-- ============================================
-- DIAGNÓSTICO RÁPIDO
-- ============================================
-- Execute este comando para ter uma visão geral
SELECT 
  'Total de Guindastes' as metrica,
  COUNT(*) as valor
FROM guindastes
UNION ALL
SELECT 
  'Total de Preços Cadastrados',
  COUNT(*)
FROM precos_guindaste_regiao
UNION ALL
SELECT 
  'Guindastes SEM Preços',
  COUNT(DISTINCT g.id)
FROM guindastes g
LEFT JOIN precos_guindaste_regiao p ON p.guindaste_id = g.id
WHERE p.id IS NULL
UNION ALL
SELECT 
  'Guindastes COM Preços',
  COUNT(DISTINCT g.id)
FROM guindastes g
INNER JOIN precos_guindaste_regiao p ON p.guindaste_id = g.id
UNION ALL
SELECT 
  'Vendedores Sem Região',
  COUNT(*)
FROM users
WHERE tipo = 'vendedor' 
  AND (regiao IS NULL OR regiao = '');


-- ============================================
-- INTERPRETAÇÃO DOS RESULTADOS
-- ============================================
/*
✅ CENÁRIO IDEAL:
- Todos vendedores têm região definida
- Total de Preços = Total de Guindastes × 5
- Guindastes SEM Preços = 0
- Todas as 5 regiões aparecem na lista

❌ PROBLEMAS COMUNS:
1. "Guindastes SEM Preços" > 0
   → Admin precisa cadastrar preços para esses guindastes

2. "Vendedores Sem Região" > 0
   → Atualizar campo 'regiao' dos vendedores

3. Regiões com nomes diferentes (ex: 'sul' vs 'sul-sudeste')
   → A normalização pode não estar funcionando

4. Preços nulos ou zero
   → Atualizar com valores válidos
*/

