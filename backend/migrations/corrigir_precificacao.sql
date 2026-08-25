-- =====================================================
-- MIGRATION CORRETIVA: Simplifica precificação
-- DESCRIÇÃO: Remove estruturas por UF/impostos criadas na
--            migration anterior e mantém precificação por
--            equipamento/referência, com os campos realmente
--            necessários. Executar manualmente no PostgreSQL
--            de produção.
-- =====================================================

-- 0. REMOVE OBJETOS ANTIGOS DA MODELAGEM ANTERIOR
--    (tabelas/funções/view novas que ainda não alimentam
--     o fluxo de produção)
DROP VIEW IF EXISTS public.view_precificacao_guindaste_uf;
DROP FUNCTION IF EXISTS public.calcular_preco_venda(BIGINT, TEXT);
DROP FUNCTION IF EXISTS public.get_regra_precificacao(TEXT);
DROP TABLE IF EXISTS public.precos_venda_guindaste_uf;
DROP TABLE IF EXISTS public.regras_precificacao;

-- =====================================================
-- 1. CAMPOS DE CUSTO EM GUINDASTES (mantidos)
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

COMMENT ON TABLE public.precificacao IS 'Regras percentuais de precificação por equipamento/referência. Frete e instalação continuam vindo das fontes já utilizadas no sistema.';
COMMENT ON COLUMN public.precificacao.custo_fixo_percent IS 'Percentual de custo fixo sobre o subtotal de custos (MP + MO)';
COMMENT ON COLUMN public.precificacao.comissao_percent IS 'Percentual de comissão sobre o subtotal de custos';
COMMENT ON COLUMN public.precificacao.assistencia_percent IS 'Percentual de assistência técnica sobre o subtotal de custos';
COMMENT ON COLUMN public.precificacao.margem_lucro_percent IS 'Percentual de margem de lucro sobre custo + variáveis';

-- Garante função utilitária de updated_at
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
-- 3. FUNÇÃO DE CÁLCULO SIMPLIFICADA POR EQUIPAMENTO
--    Fórmula: preco = (mp + mo) * (1 + (custo_fixo + comissao + assistencia)/100)
--             * (1 + margem/100)
--    Não inclui impostos nem frete/instalação (esses são
--    mantidos nas fontes atuais do sistema).
-- =====================================================
CREATE OR REPLACE FUNCTION public.calcular_preco_base(p_guindaste_id BIGINT)
RETURNS NUMERIC(18, 4)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_mp NUMERIC(18, 4);
  v_mo NUMERIC(18, 4);
  v_custo_fixo NUMERIC(10, 4);
  v_comissao NUMERIC(10, 4);
  v_assistencia NUMERIC(10, 4);
  v_margem NUMERIC(10, 4);
  v_subtotal NUMERIC(18, 4);
  v_variaveis NUMERIC(18, 4);
  v_preco NUMERIC(18, 4);
BEGIN
  SELECT
    COALESCE(g.custo_mp, 0),
    COALESCE(g.custo_mo, 0),
    COALESCE(p.custo_fixo_percent, 0),
    COALESCE(p.comissao_percent, 0),
    COALESCE(p.assistencia_percent, 0),
    COALESCE(p.margem_lucro_percent, 0)
  INTO v_mp, v_mo, v_custo_fixo, v_comissao, v_assistencia, v_margem
  FROM public.guindastes g
  LEFT JOIN public.precificacao p ON p.guindaste_id = g.id
  WHERE g.id = p_guindaste_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_subtotal := v_mp + v_mo;
  v_variaveis := v_subtotal * (v_custo_fixo + v_comissao + v_assistencia) / 100;
  v_preco := (v_subtotal + v_variaveis) * (1 + v_margem / 100);

  RETURN ROUND(v_preco, 4);
END;
$$;

-- =====================================================
-- 4. VIEW SIMPLIFICADA PARA CONSUMO FUTURO
-- =====================================================
CREATE OR REPLACE VIEW public.view_precificacao AS
SELECT
  g.id AS guindaste_id,
  g.codigo_referencia,
  g.subgrupo,
  g.modelo,
  g.custo_mp,
  g.custo_mo,
  p.id AS precificacao_id,
  p.custo_fixo_percent,
  p.comissao_percent,
  p.assistencia_percent,
  p.margem_lucro_percent,
  public.calcular_preco_base(g.id) AS preco_base_calculado
FROM public.guindastes g
LEFT JOIN public.precificacao p ON p.guindaste_id = g.id;

-- =====================================================
-- 5. VERIFICAÇÃO
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guindastes' AND column_name = 'custo_mp'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guindastes' AND column_name = 'custo_mo'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'precificacao'
  ) THEN
    RAISE NOTICE '✅ Estrutura de precificação simplificada criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro: estrutura de precificação incompleta.';
  END IF;
END $$;
