-- ============================================
-- MIGRATIONS E UPDATES
-- Scripts para atualizar banco de dados existente
-- ============================================
-- 
-- Use estes scripts quando precisar atualizar um banco
-- de dados JÁ EXISTENTE sem perder os dados
-- 
-- ⚠️ SEMPRE FAÇA BACKUP ANTES DE EXECUTAR MIGRATIONS!
-- ============================================

-- ============================================
-- MIGRATION 001: Adicionar campos de auditoria
-- Data: Outubro 2025
-- ============================================

-- Verificar se os campos já existem antes de adicionar
DO $$
BEGIN
  -- Adicionar created_at em tabelas que não têm
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guindastes' AND column_name = 'created_at') THEN
    ALTER TABLE guindastes ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guindastes' AND column_name = 'updated_at') THEN
    ALTER TABLE guindastes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  -- Adicionar em outras tabelas conforme necessário
  -- (repetir padrão acima)
  
  RAISE NOTICE '✅ Migration 001 concluída: Campos de auditoria adicionados';
END $$;

-- ============================================
-- MIGRATION 002: Adicionar campos descricao e nao_incluido em guindastes
-- Data: Outubro 2025
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guindastes' AND column_name = 'descricao') THEN
    ALTER TABLE guindastes ADD COLUMN descricao TEXT;
    RAISE NOTICE '✅ Campo descricao adicionado em guindastes';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guindastes' AND column_name = 'nao_incluido') THEN
    ALTER TABLE guindastes ADD COLUMN nao_incluido TEXT;
    RAISE NOTICE '✅ Campo nao_incluido adicionado em guindastes';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guindastes' AND column_name = 'imagens_adicionais') THEN
    ALTER TABLE guindastes ADD COLUMN imagens_adicionais JSONB;
    RAISE NOTICE '✅ Campo imagens_adicionais adicionado em guindastes';
  END IF;
END $$;

-- ============================================
-- MIGRATION 003: Adicionar tabela de fretes (se não existir)
-- Data: Outubro 2025
-- ============================================

CREATE TABLE IF NOT EXISTS fretes (
  id BIGSERIAL PRIMARY KEY,
  cidade VARCHAR(100) NOT NULL,
  oficina VARCHAR(200),
  valor_prioridade DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  valor_reaproveitamento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_valores_frete CHECK (valor_prioridade > 0 OR valor_reaproveitamento > 0),
  CONSTRAINT unique_frete_cidade_oficina UNIQUE (cidade, oficina)
);

CREATE INDEX IF NOT EXISTS idx_fretes_cidade ON fretes(cidade);
CREATE INDEX IF NOT EXISTS idx_fretes_oficina ON fretes(oficina);

-- ============================================
-- MIGRATION 004: Adicionar campo regiao "rio grande do sul" em users
-- Data: Outubro 2025
-- ============================================

-- Este campo permite que vendedores do RS tenham tratamento especial (IE)
-- Não precisa alterar constraint, TEXT aceita qualquer valor

DO $$
BEGIN
  -- Verificar se já existem vendedores do RS
  IF EXISTS (SELECT 1 FROM users WHERE regiao = 'sul') THEN
    RAISE NOTICE '⚠️ Existem vendedores com região "sul". Considere migrar para "rio grande do sul" se aplicável.';
  END IF;
  
  RAISE NOTICE '✅ Migration 004: Campo regiao aceita "rio grande do sul"';
END $$;

-- ============================================
-- MIGRATION 005: Migrar preços de regiões antigas para novas
-- Data: Outubro 2025
-- ============================================
-- 
-- Sistema antigo:
--   - norte, nordeste, sul, sudeste, centro-oeste
-- Sistema novo:
--   - norte-nordeste, sul-sudeste, centro-oeste, rs-com-ie, rs-sem-ie
-- 
-- ⚠️ IMPORTANTE: Execute somente se estiver migrando do sistema antigo!

DO $$
DECLARE
  total_migrados INTEGER := 0;
BEGIN
  -- Criar backup da tabela de preços
  DROP TABLE IF EXISTS precos_guindaste_regiao_backup;
  CREATE TABLE precos_guindaste_regiao_backup AS 
  SELECT * FROM precos_guindaste_regiao;
  
  RAISE NOTICE '📦 Backup criado: precos_guindaste_regiao_backup';
  
  -- Migrar Norte para Norte-Nordeste (se existir)
  IF EXISTS (SELECT 1 FROM precos_guindaste_regiao WHERE regiao = 'norte' LIMIT 1) THEN
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    SELECT guindaste_id, 'norte-nordeste', preco
    FROM precos_guindaste_regiao
    WHERE regiao = 'norte'
    ON CONFLICT (guindaste_id, regiao) DO UPDATE SET preco = EXCLUDED.preco;
    
    GET DIAGNOSTICS total_migrados = ROW_COUNT;
    RAISE NOTICE '✅ Migrados % preços de norte → norte-nordeste', total_migrados;
  END IF;
  
  -- Migrar Nordeste para Norte-Nordeste (média com Norte se ambos existirem)
  IF EXISTS (SELECT 1 FROM precos_guindaste_regiao WHERE regiao = 'nordeste' LIMIT 1) THEN
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    SELECT 
      guindaste_id, 
      'norte-nordeste',
      preco
    FROM precos_guindaste_regiao
    WHERE regiao = 'nordeste'
    ON CONFLICT (guindaste_id, regiao) DO UPDATE 
    SET preco = (EXCLUDED.preco + precos_guindaste_regiao.preco) / 2;
    
    GET DIAGNOSTICS total_migrados = ROW_COUNT;
    RAISE NOTICE '✅ Migrados % preços de nordeste → norte-nordeste', total_migrados;
  END IF;
  
  -- Migrar Sul para Sul-Sudeste
  IF EXISTS (SELECT 1 FROM precos_guindaste_regiao WHERE regiao = 'sul' LIMIT 1) THEN
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    SELECT guindaste_id, 'sul-sudeste', preco
    FROM precos_guindaste_regiao
    WHERE regiao = 'sul'
    ON CONFLICT (guindaste_id, regiao) DO UPDATE SET preco = EXCLUDED.preco;
    
    GET DIAGNOSTICS total_migrados = ROW_COUNT;
    RAISE NOTICE '✅ Migrados % preços de sul → sul-sudeste', total_migrados;
  END IF;
  
  -- Migrar Sudeste para Sul-Sudeste (média se ambos existirem)
  IF EXISTS (SELECT 1 FROM precos_guindaste_regiao WHERE regiao = 'sudeste' LIMIT 1) THEN
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    SELECT 
      guindaste_id, 
      'sul-sudeste',
      preco
    FROM precos_guindaste_regiao
    WHERE regiao = 'sudeste'
    ON CONFLICT (guindaste_id, regiao) DO UPDATE 
    SET preco = (EXCLUDED.preco + precos_guindaste_regiao.preco) / 2;
    
    GET DIAGNOSTICS total_migrados = ROW_COUNT;
    RAISE NOTICE '✅ Migrados % preços de sudeste → sul-sudeste', total_migrados;
  END IF;
  
  -- Criar preços para RS (5% desconto em rs-com-ie, base em rs-sem-ie)
  IF EXISTS (SELECT 1 FROM precos_guindaste_regiao WHERE regiao = 'sul-sudeste' LIMIT 1) THEN
    -- RS com IE (5% desconto)
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    SELECT guindaste_id, 'rs-com-ie', preco * 0.95
    FROM precos_guindaste_regiao
    WHERE regiao = 'sul-sudeste'
    ON CONFLICT (guindaste_id, regiao) DO NOTHING;
    
    -- RS sem IE (preço base)
    INSERT INTO precos_guindaste_regiao (guindaste_id, regiao, preco)
    SELECT guindaste_id, 'rs-sem-ie', preco
    FROM precos_guindaste_regiao
    WHERE regiao = 'sul-sudeste'
    ON CONFLICT (guindaste_id, regiao) DO NOTHING;
    
    RAISE NOTICE '✅ Criados preços para RS (com/sem IE)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 005 concluída!';
  RAISE NOTICE '📋 Backup disponível em: precos_guindaste_regiao_backup';
  RAISE NOTICE '⚠️ Revise os preços migrados antes de limpar dados antigos';
END $$;

-- ============================================
-- MIGRATION 006: Adicionar campo dados_completos em pedidos
-- Data: Outubro 2025
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pedidos' AND column_name = 'dados_completos') THEN
    ALTER TABLE pedidos ADD COLUMN dados_completos JSONB;
    RAISE NOTICE '✅ Campo dados_completos adicionado em pedidos';
  END IF;
END $$;

-- ============================================
-- MIGRATION 007: Atualizar constraints de status em pedidos
-- Data: Outubro 2025
-- ============================================

DO $$
BEGIN
  -- Remover constraint antiga se existir
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'pedidos_status_check' 
             AND table_name = 'pedidos') THEN
    ALTER TABLE pedidos DROP CONSTRAINT pedidos_status_check;
  END IF;
  
  -- Adicionar nova constraint com status atualizados
  ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check 
    CHECK (status IN ('pendente', 'aprovado', 'em_andamento', 'concluido', 'cancelado'));
  
  RAISE NOTICE '✅ Constraints de status atualizadas em pedidos';
END $$;

-- ============================================
-- MIGRATION 008: Adicionar índices de performance
-- Data: Outubro 2025
-- ============================================

-- Índices compostos para queries frequentes
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor_status ON pedidos(vendedor_id, status);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_created ON pedidos(cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_tipo_ativo ON users(tipo, ativo);
CREATE INDEX IF NOT EXISTS idx_precos_guindaste_regiao_lookup ON precos_guindaste_regiao(guindaste_id, regiao);

-- Índice para busca full-text em guindastes
CREATE INDEX IF NOT EXISTS idx_guindastes_busca 
  ON guindastes USING gin(to_tsvector('portuguese', subgrupo || ' ' || modelo));

-- Índice para clientes por UF
CREATE INDEX IF NOT EXISTS idx_clientes_uf_cidade ON clientes(uf, cidade);

-- ============================================
-- MIGRATION 009: Criar views úteis
-- Data: Outubro 2025
-- ============================================

-- View de pedidos completos
CREATE OR REPLACE VIEW vw_pedidos_completos AS
SELECT 
  p.id,
  p.numero_pedido,
  p.status,
  p.valor_total,
  p.created_at,
  p.observacoes,
  c.nome AS cliente_nome,
  c.email AS cliente_email,
  c.telefone AS cliente_telefone,
  c.documento AS cliente_documento,
  c.cidade AS cliente_cidade,
  c.uf AS cliente_uf,
  v.nome AS vendedor_nome,
  v.email AS vendedor_email,
  v.regiao AS vendedor_regiao,
  cam.marca AS caminhao_marca,
  cam.modelo AS caminhao_modelo,
  cam.tipo AS caminhao_tipo,
  cam.placa AS caminhao_placa
FROM pedidos p
INNER JOIN clientes c ON p.cliente_id = c.id
INNER JOIN users v ON p.vendedor_id = v.id
INNER JOIN caminhoes cam ON p.caminhao_id = cam.id;

-- View de guindastes com preços
CREATE OR REPLACE VIEW vw_guindastes_precos AS
SELECT 
  g.id,
  g.subgrupo,
  g.modelo,
  g.peso_kg,
  g.configuracao,
  g.codigo_referencia,
  g.tem_contr,
  p.regiao,
  p.preco,
  g.imagem_url,
  g.grafico_carga_url
FROM guindastes g
LEFT JOIN precos_guindaste_regiao p ON g.id = p.guindaste_id
ORDER BY g.subgrupo, g.modelo, p.regiao;

-- ============================================
-- MIGRATION 010: Criar triggers para updated_at
-- Data: Outubro 2025
-- ============================================

-- Função genérica
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas (se ainda não existirem)
DO $$
BEGIN
  -- Users
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- Guindastes
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_guindastes_updated_at') THEN
    CREATE TRIGGER update_guindastes_updated_at BEFORE UPDATE ON guindastes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- Clientes
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clientes_updated_at') THEN
    CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- Caminhões
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_caminhoes_updated_at') THEN
    CREATE TRIGGER update_caminhoes_updated_at BEFORE UPDATE ON caminhoes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- Pedidos
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pedidos_updated_at') THEN
    CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- Preços
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_precos_updated_at') THEN
    CREATE TRIGGER update_precos_updated_at BEFORE UPDATE ON precos_guindaste_regiao
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- Fretes
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_fretes_updated_at') THEN
    CREATE TRIGGER update_fretes_updated_at BEFORE UPDATE ON fretes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- Gráficos
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_graficos_updated_at') THEN
    CREATE TRIGGER update_graficos_updated_at BEFORE UPDATE ON graficos_carga
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- Eventos
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_eventos_updated_at') THEN
    CREATE TRIGGER update_eventos_updated_at BEFORE UPDATE ON eventos_logistica
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- Pronta entrega
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pronta_entrega_updated_at') THEN
    CREATE TRIGGER update_pronta_entrega_updated_at BEFORE UPDATE ON pronta_entrega
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  RAISE NOTICE '✅ Triggers de updated_at configurados';
END $$;

-- ============================================
-- UTILITÁRIOS: Limpar regiões antigas após migração
-- ============================================
-- 
-- ⚠️ CUIDADO! Só execute após confirmar que a migração funcionou!
-- ⚠️ Faça backup antes!
-- 

/*
-- Verificar se há pedidos usando regiões antigas
SELECT COUNT(*) FROM pedidos p
INNER JOIN users v ON p.vendedor_id = v.id
WHERE v.regiao IN ('norte', 'nordeste', 'sul', 'sudeste');

-- Se a contagem acima for 0, é seguro deletar
DELETE FROM precos_guindaste_regiao 
WHERE regiao IN ('norte', 'nordeste', 'sul', 'sudeste');

-- Dropar backup (após confirmar que tudo funciona)
DROP TABLE IF EXISTS precos_guindaste_regiao_backup;
*/

-- ============================================
-- UTILITÁRIOS: Verificar status da migração
-- ============================================

-- Verificar campos importantes nas tabelas
SELECT 
  'users' AS tabela,
  COUNT(*) AS registros,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') 
    THEN '✅' ELSE '❌' END AS tem_created_at,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') 
    THEN '✅' ELSE '❌' END AS tem_updated_at
FROM users

UNION ALL

SELECT 
  'guindastes',
  COUNT(*),
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guindastes' AND column_name = 'descricao') 
    THEN '✅' ELSE '❌' END,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guindastes' AND column_name = 'nao_incluido') 
    THEN '✅' ELSE '❌' END
FROM guindastes

UNION ALL

SELECT 
  'pedidos',
  COUNT(*),
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'dados_completos') 
    THEN '✅' ELSE '❌' END,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pedidos' AND column_name = 'status') 
    THEN '✅' ELSE '❌' END
FROM pedidos;

-- Verificar distribuição de preços por região
SELECT 
  regiao,
  COUNT(*) AS quantidade_precos,
  ROUND(AVG(preco), 2) AS preco_medio,
  MIN(preco) AS preco_min,
  MAX(preco) AS preco_max
FROM precos_guindaste_regiao
GROUP BY regiao
ORDER BY regiao;

-- Verificar vendedores por região
SELECT 
  regiao,
  COUNT(*) AS quantidade_vendedores
FROM users
WHERE tipo = 'vendedor'
GROUP BY regiao
ORDER BY regiao;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATIONS EXECUTADAS COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Verifique os logs acima para possíveis avisos';
  RAISE NOTICE '2. Teste o sistema com usuários de cada região';
  RAISE NOTICE '3. Revise os preços migrados se aplicável';
  RAISE NOTICE '4. Considere limpar dados antigos (após confirmação)';
  RAISE NOTICE '';
  RAISE NOTICE '💾 BACKUP: Sempre mantenha backups antes de migrations!';
  RAISE NOTICE '';
END $$;

