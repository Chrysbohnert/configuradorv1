-- =====================================================
-- SCRIPT DE MIGRAÇÃO - NOVA ESTRUTURA DE REGIÕES
-- =====================================================
-- 
-- Este script atualiza a estrutura de regiões conforme novo padrão:
-- 1. Norte-Nordeste (unificado)
-- 2. Centro Oeste
-- 3. Sul-Sudeste (unificado)
-- 4. RS com Inscrição Estadual
-- 5. RS sem Inscrição Estadual
--
-- IMPORTANTE: Execute este script no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PASSO 1: ATUALIZAR REGIÃO DO VENDEDOR HUGO
-- =====================================================
-- Atualiza a região do vendedor Hugo (ou qualquer vendedor do RS) 
-- de 'sul' para 'rio grande do sul'

UPDATE users 
SET regiao = 'rio grande do sul' 
WHERE nome ILIKE '%hugo%' 
  AND regiao = 'sul';

-- Se houver outros vendedores do Rio Grande do Sul, atualize-os também:
-- UPDATE users 
-- SET regiao = 'rio grande do sul' 
-- WHERE id = 'ID_DO_VENDEDOR';

-- =====================================================
-- PASSO 2: BACKUP DOS PREÇOS ANTIGOS (OPCIONAL)
-- =====================================================
-- Cria uma tabela temporária com backup dos preços antes da migração

CREATE TABLE IF NOT EXISTS precos_guindaste_regiao_backup AS 
SELECT * FROM precos_guindaste_regiao;

-- =====================================================
-- PASSO 3: MIGRAR PREÇOS PARA NOVA ESTRUTURA
-- =====================================================

-- 3.1 Migrar preços de 'norte' e 'nordeste' para 'norte-nordeste'
-- Inserir novos registros com região 'norte-nordeste' baseado nos preços de 'norte'
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
SELECT DISTINCT ON (guindaste_id) 
  guindaste_id, 
  'norte-nordeste' as regiao, 
  preco
FROM precos_guindaste_regiao
WHERE regiao IN ('norte', 'nordeste')
ON CONFLICT (guindaste_id, regiao) DO UPDATE
SET preco = EXCLUDED.preco;

-- 3.2 Migrar preços de 'sul' e 'sudeste' para 'sul-sudeste'
-- Usar a média ou o maior valor entre sul e sudeste (ajuste conforme necessário)
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
SELECT DISTINCT ON (guindaste_id)
  guindaste_id,
  'sul-sudeste' as regiao,
  COALESCE(AVG(preco), MAX(preco)) as preco
FROM precos_guindaste_regiao
WHERE regiao IN ('sul', 'sudeste')
GROUP BY guindaste_id
ON CONFLICT (guindaste_id, regiao) DO UPDATE
SET preco = EXCLUDED.preco;

-- 3.3 Criar preços para 'rs-com-ie' e 'rs-sem-ie' baseado no preço 'sul' antigo
-- Preço COM IE (pode ser o mesmo do sul antigo)
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
SELECT 
  guindaste_id,
  'rs-com-ie' as regiao,
  preco
FROM precos_guindaste_regiao
WHERE regiao = 'sul'
ON CONFLICT (guindaste_id, regiao) DO UPDATE
SET preco = EXCLUDED.preco;

-- Preço SEM IE (pode ser um valor diferente - ajuste conforme necessário)
-- Por padrão, estou copiando o mesmo preço, mas você pode ajustar com uma porcentagem
INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
SELECT 
  guindaste_id,
  'rs-sem-ie' as regiao,
  preco * 1.0 as preco  -- Ajuste o multiplicador conforme necessário
FROM precos_guindaste_regiao
WHERE regiao = 'sul'
ON CONFLICT (guindaste_id, regiao) DO UPDATE
SET preco = EXCLUDED.preco;

-- =====================================================
-- PASSO 4: LIMPAR REGIÕES ANTIGAS (OPCIONAL)
-- =====================================================
-- ATENÇÃO: Só execute este passo DEPOIS de confirmar que tudo está funcionando
-- e que não há vendedores usando as regiões antigas

-- DELETE FROM precos_guindaste_regiao 
-- WHERE regiao IN ('norte', 'nordeste', 'sul', 'sudeste');

-- =====================================================
-- PASSO 5: VERIFICAR RESULTADOS
-- =====================================================

-- Verificar quantos preços existem por região
SELECT 
  regiao, 
  COUNT(*) as total_guindastes,
  MIN(preco) as preco_minimo,
  MAX(preco) as preco_maximo,
  AVG(preco) as preco_medio
FROM precos_guindaste_regiao
GROUP BY regiao
ORDER BY regiao;

-- Verificar vendedores e suas regiões
SELECT 
  id,
  nome,
  email,
  regiao,
  tipo
FROM users
WHERE tipo = 'vendedor'
ORDER BY regiao, nome;

-- =====================================================
-- ROLLBACK (EM CASO DE PROBLEMAS)
-- =====================================================
-- Se algo der errado, você pode restaurar os dados do backup:

-- RESTAURAR PREÇOS:
-- TRUNCATE precos_guindaste_regiao;
-- INSERT INTO precos_guindaste_regiao 
-- SELECT * FROM precos_guindaste_regiao_backup;

-- RESTAURAR REGIÃO DO HUGO:
-- UPDATE users 
-- SET regiao = 'sul' 
-- WHERE nome ILIKE '%hugo%';

-- DELETAR BACKUP:
-- DROP TABLE precos_guindaste_regiao_backup;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Os preços para RS com IE e sem IE foram criados iguais inicialmente.
--    Ajuste-os manualmente conforme necessário após a migração.
--
-- 2. A unificação de Sul-Sudeste usa a média dos preços. Se preferir
--    usar o maior valor ou outro critério, ajuste o script no PASSO 3.2
--
-- 3. As regiões antigas (norte, nordeste, sul, sudeste) foram MANTIDAS
--    no banco para compatibilidade. Delete-as apenas quando confirmar
--    que tudo está funcionando corretamente.
--
-- 4. Teste o sistema completamente antes de executar o PASSO 4.
-- =====================================================

