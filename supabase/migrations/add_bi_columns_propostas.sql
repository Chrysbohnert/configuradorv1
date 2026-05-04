-- ============================================================
-- MIGRAÇÃO: Colunas de BI na tabela propostas
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. NOVAS COLUNAS INDEXADAS (extração BI sem depender do JSONB)
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS canal_venda       VARCHAR(50);
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS segmento_cliente  VARCHAR(50);
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS cliente_uf        VARCHAR(2);
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS cliente_cidade    VARCHAR(100);
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS produto_principal VARCHAR(200);
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS linha_produto     VARCHAR(10);

-- Comentários descritivos
COMMENT ON COLUMN propostas.canal_venda      IS 'Canal de venda: Vendedor Interno | Representante | Concessionária Nacional | Concessionária Internacional';
COMMENT ON COLUMN propostas.segmento_cliente IS 'Segmento do cliente: AGRO | Construção Civil | Serviços | Outros';
COMMENT ON COLUMN propostas.cliente_uf       IS 'UF do cliente (2 letras) para análise geográfica';
COMMENT ON COLUMN propostas.cliente_cidade   IS 'Cidade do cliente para análise geográfica';
COMMENT ON COLUMN propostas.produto_principal IS 'Nome do produto principal da proposta';
COMMENT ON COLUMN propostas.linha_produto    IS 'Linha do produto: GSI | GSE | Outros';

-- 2. ÍNDICES para queries de BI rápidas
CREATE INDEX IF NOT EXISTS idx_propostas_canal_venda      ON propostas(canal_venda);
CREATE INDEX IF NOT EXISTS idx_propostas_segmento_cliente ON propostas(segmento_cliente);
CREATE INDEX IF NOT EXISTS idx_propostas_cliente_uf       ON propostas(cliente_uf);
CREATE INDEX IF NOT EXISTS idx_propostas_linha_produto    ON propostas(linha_produto);
CREATE INDEX IF NOT EXISTS idx_propostas_data_canal       ON propostas(data DESC, canal_venda);
CREATE INDEX IF NOT EXISTS idx_propostas_data_uf          ON propostas(data DESC, cliente_uf);

-- 3. BACKFILL: preencher colunas para propostas existentes usando dados_serializados
UPDATE propostas
SET
  cliente_uf = COALESCE(
    dados_serializados->'clienteData'->>'uf',
    dados_serializados->'clienteData'->>'estado',
    NULL
  ),
  cliente_cidade = COALESCE(
    dados_serializados->'clienteData'->>'cidade',
    NULL
  ),
  linha_produto = CASE
    WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(dados_serializados->'carrinho', '[]'::jsonb)) AS item
      WHERE item->>'nome' ILIKE '%GSI%' OR item->>'subgrupo' ILIKE '%GSI%'
    ) THEN 'GSI'
    WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(dados_serializados->'carrinho', '[]'::jsonb)) AS item
      WHERE item->>'nome' ILIKE '%GSE%' OR item->>'subgrupo' ILIKE '%GSE%'
    ) THEN 'GSE'
    ELSE 'Outros'
  END,
  produto_principal = (
    SELECT item->>'nome'
    FROM jsonb_array_elements(COALESCE(dados_serializados->'carrinho', '[]'::jsonb)) AS item
    WHERE (item->>'tipo' = 'equipamento' OR item->>'tipo' = 'guindaste'
           OR item->>'nome' ILIKE '%GSI%' OR item->>'nome' ILIKE '%GSE%')
    LIMIT 1
  )
WHERE cliente_uf IS NULL OR linha_produto IS NULL;

-- 4. VIEW PARA EXTRAÇÃO BI (compatível com Metabase, Power BI, Looker, etc.)
CREATE OR REPLACE VIEW v_propostas_bi AS
SELECT
  p.id,
  p.numero_proposta,
  p.data::DATE                                        AS data_proposta,
  DATE_TRUNC('month', p.data)::DATE                  AS mes_proposta,
  DATE_TRUNC('year',  p.data)::DATE                  AS ano_proposta,
  EXTRACT(YEAR  FROM p.data)::INT                    AS ano,
  EXTRACT(MONTH FROM p.data)::INT                    AS mes,
  EXTRACT(DAY   FROM p.data)::INT                    AS dia,

  -- Identificação
  p.vendedor_id,
  p.vendedor_nome,
  p.cliente_nome,
  p.cliente_documento,

  -- Canal e segmento
  COALESCE(p.canal_venda, 'Não classificado')        AS canal_venda,
  COALESCE(p.segmento_cliente, 'Não classificado')   AS segmento_cliente,

  -- Produto
  COALESCE(p.linha_produto, 'Outros')                AS linha_produto,
  p.produto_principal,

  -- Geografia
  UPPER(COALESCE(p.cliente_uf, '??'))                AS cliente_uf,
  p.cliente_cidade,

  -- Valores
  p.valor_total,
  COALESCE(p.resultado_venda, 'em_aberto')           AS resultado_venda,
  p.motivo_perda,
  p.data_resultado_venda,

  -- Status
  p.status,
  p.tipo,
  p.concessionaria_id,

  -- Timestamps
  p.created_at,
  p.updated_at

FROM propostas p
WHERE p.status != 'excluido';

-- 5. VIEW DE AGREGAÇÃO POR CANAL (pronta para BI tools)
CREATE OR REPLACE VIEW v_kpi_por_canal AS
SELECT
  canal_venda,
  COUNT(*)                            AS total_propostas,
  SUM(valor_total)                    AS valor_total,
  AVG(valor_total)                    AS ticket_medio,
  COUNT(*) FILTER (WHERE resultado_venda = 'efetivada')  AS efetivadas,
  COUNT(*) FILTER (WHERE resultado_venda = 'perdida')    AS perdidas,
  DATE_TRUNC('month', data_proposta)::DATE     AS mes
FROM v_propostas_bi
GROUP BY canal_venda, DATE_TRUNC('month', data_proposta)::DATE
ORDER BY mes DESC, total_propostas DESC;

-- 6. VIEW DE AGREGAÇÃO POR ESTADO
CREATE OR REPLACE VIEW v_kpi_por_estado AS
SELECT
  cliente_uf                          AS estado,
  COUNT(*)                            AS total_propostas,
  SUM(valor_total)                    AS valor_total,
  AVG(valor_total)                    AS ticket_medio,
  COUNT(*) FILTER (WHERE resultado_venda = 'efetivada')  AS efetivadas,
  DATE_TRUNC('month', data_proposta)::DATE     AS mes
FROM v_propostas_bi
GROUP BY cliente_uf, DATE_TRUNC('month', data_proposta)::DATE
ORDER BY mes DESC, total_propostas DESC;

-- 7. VIEW DE AGREGAÇÃO POR SEGMENTO
CREATE OR REPLACE VIEW v_kpi_por_segmento AS
SELECT
  segmento_cliente                    AS segmento,
  linha_produto,
  COUNT(*)                            AS total_propostas,
  SUM(valor_total)                    AS valor_total,
  DATE_TRUNC('month', data_proposta)::DATE     AS mes
FROM v_propostas_bi
GROUP BY segmento_cliente, linha_produto, DATE_TRUNC('month', data_proposta)::DATE
ORDER BY mes DESC, total_propostas DESC;

-- 8. VIEW DE AGREGAÇÃO POR PRODUTO
CREATE OR REPLACE VIEW v_kpi_por_produto AS
SELECT
  produto_principal,
  linha_produto,
  COUNT(*)                            AS total_propostas,
  SUM(valor_total)                    AS valor_total,
  AVG(valor_total)                    AS ticket_medio
FROM v_propostas_bi
WHERE produto_principal IS NOT NULL
GROUP BY produto_principal, linha_produto
ORDER BY total_propostas DESC;

-- ============================================================
-- INSTRUÇÕES DE CONEXÃO PARA FERRAMENTAS BI EXTERNAS
-- ============================================================
-- String de conexão PostgreSQL (obter no Supabase → Settings → Database):
-- Host: db.<project-ref>.supabase.co
-- Port: 5432
-- Database: postgres
-- User: postgres (ou service role)
-- Password: <sua senha>
--
-- Views disponíveis para conectar ao BI:
--   v_propostas_bi      → linha a linha (para Power BI, Metabase, Looker)
--   v_kpi_por_canal     → agregado por canal + mês
--   v_kpi_por_estado    → agregado por UF + mês
--   v_kpi_por_segmento  → agregado por segmento + mês
--   v_kpi_por_produto   → agregado por produto
-- ============================================================
