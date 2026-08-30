-- =====================================================
-- MIGRATION: Precificação v2 - módulo de teste isolado
-- DESCRIÇÃO: Consolida tabelas da nova Precificação
--            (equipamentos, tributação, condições,
--             parâmetros e histórico) sem alterar o
--            fluxo atual de propostas/pagamentos.
--            Executar manualmente no PostgreSQL.
-- =====================================================

-- =====================================================
-- 0. LIMPEZA DE OBJETOS ANTIGOS (NÃO UTILIZADOS)
-- =====================================================
DROP VIEW IF EXISTS public.view_precificacao_guindaste_uf;
DROP VIEW IF EXISTS public.view_precificacao;
DROP FUNCTION IF EXISTS public.calcular_preco_venda(BIGINT, TEXT);
DROP FUNCTION IF EXISTS public.calcular_preco_base(BIGINT);
DROP FUNCTION IF EXISTS public.get_regra_precificacao(TEXT);
DROP TABLE IF EXISTS public.precos_venda_guindaste_uf;
DROP TABLE IF EXISTS public.regras_precificacao;

-- =====================================================
-- 1. CAMPOS DE CUSTO NO CADASTRO DO EQUIPAMENTO
-- =====================================================
ALTER TABLE public.guindastes
  ADD COLUMN IF NOT EXISTS custo_mp NUMERIC(18, 4);

ALTER TABLE public.guindastes
  ADD COLUMN IF NOT EXISTS custo_mo NUMERIC(18, 4);

COMMENT ON COLUMN public.guindastes.custo_mp IS 'Valor da matéria-prima sem impostos';
COMMENT ON COLUMN public.guindastes.custo_mo IS 'Valor da mão-de-obra sem impostos';

-- =====================================================
-- 2. TABELA DE PRECIFICAÇÃO POR EQUIPAMENTO/REFERÊNCIA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.precificacao (
  id BIGSERIAL PRIMARY KEY,
  guindaste_id BIGINT NOT NULL REFERENCES public.guindastes(id) ON DELETE CASCADE,
  custo_fixo_percent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  comissao_percent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  assistencia_percent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  margem_lucro_percent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT precificacao_guindaste_unico UNIQUE (guindaste_id)
);

COMMENT ON TABLE public.precificacao IS 'Regras percentuais de precificação por equipamento/referência. Usada apenas pelo módulo de teste da nova Precificação.';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS precificacao_set_updated_at ON public.precificacao;
CREATE TRIGGER precificacao_set_updated_at
  BEFORE UPDATE ON public.precificacao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_precificacao_guindaste_id ON public.precificacao(guindaste_id);

-- =====================================================
-- 3. TRIBUTAÇÃO POR UF + NCM
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tributacao (
  id BIGSERIAL PRIMARY KEY,
  uf TEXT NOT NULL,
  ncm TEXT NOT NULL,
  icms_contribuinte_percent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  icms_nao_contribuinte_percent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  pis_cofins_percent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tributacao_uf_ncm_unico UNIQUE (uf, ncm)
);

COMMENT ON TABLE public.tributacao IS 'Regras tributárias por UF e NCM para simulações da nova Precificação.';

DROP TRIGGER IF EXISTS tributacao_set_updated_at ON public.tributacao;
CREATE TRIGGER tributacao_set_updated_at
  BEFORE UPDATE ON public.tributacao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tributacao_uf ON public.tributacao(uf);
CREATE INDEX IF NOT EXISTS idx_tributacao_ncm ON public.tributacao(ncm);

-- =====================================================
-- 4. CONDIÇÕES DE PAGAMENTO ISOLADAS (TESTES)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.precificacao_condicoes (
  id BIGSERIAL PRIMARY KEY,
  descricao TEXT,
  entrada_percent NUMERIC(10, 4) NOT NULL DEFAULT 0 CHECK (entrada_percent >= 0 AND entrada_percent <= 100),
  parcelas INTEGER NOT NULL DEFAULT 1 CHECK (parcelas >= 1 AND parcelas <= 12),
  taxa_mensal NUMERIC(10, 6) NOT NULL DEFAULT 0 CHECK (taxa_mensal >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.precificacao_condicoes IS 'Condições de pagamento isoladas para o simulador da nova Precificação. Não afeta payment_plan_items.';

DROP TRIGGER IF EXISTS precificacao_condicoes_set_updated_at ON public.precificacao_condicoes;
CREATE TRIGGER precificacao_condicoes_set_updated_at
  BEFORE UPDATE ON public.precificacao_condicoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_precificacao_condicoes_ativo ON public.precificacao_condicoes(ativo);

-- =====================================================
-- 5. PARÂMETROS GLOBAIS (REAPROVEITA configuracoes_globais)
-- =====================================================
-- As chaves abaixo são usadas pelo motor de precificação.
INSERT INTO public.configuracoes_globais (chave, valor_numero)
VALUES
  ('precificacao_comissao_base_vendedor', 0),
  ('precificacao_desconto_comercial_max', 0),
  ('precificacao_comissao_cedivel_max', 0),
  ('precificacao_irpj_csll', 0)
ON CONFLICT (chave) DO NOTHING;

-- =====================================================
-- 6. HISTÓRICO DE SIMULAÇÕES/PRECIFICAÇÕES (SNAPSHOTS)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.precificacao_historico (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT,
  usuario_nome TEXT,
  guindaste_id BIGINT,
  equipamento JSONB DEFAULT NULL,
  tributacao JSONB DEFAULT NULL,
  condicao_id BIGINT REFERENCES public.precificacao_condicoes(id) ON DELETE SET NULL,
  condicao JSONB DEFAULT NULL,
  parametros JSONB DEFAULT NULL,
  entrada JSONB DEFAULT NULL,
  resultado JSONB DEFAULT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.precificacao_historico IS 'Snapshots imutáveis de simulações da nova Precificação. Preserva regras e valores no momento do cálculo.';

CREATE INDEX IF NOT EXISTS idx_precificacao_historico_guindaste ON public.precificacao_historico(guindaste_id);
CREATE INDEX IF NOT EXISTS idx_precificacao_historico_created_at ON public.precificacao_historico(created_at DESC);

-- =====================================================
-- 7. VERIFICAÇÃO
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'precificacao'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tributacao'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'precificacao_condicoes'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'precificacao_historico'
  ) THEN
    RAISE NOTICE '✅ Estrutura v2 da Precificação criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro: estrutura v2 da Precificação incompleta.';
  END IF;
END $$;
