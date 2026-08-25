-- =====================================================
-- MIGRATION: Precificação de Guindastes
-- DESCRIÇÃO: Prepara a estrutura para formação de preço
--            dos equipamentos sem alterar regras antigas.
--            Executar manualmente no PostgreSQL de
--            produção com um usuário administrativo.
-- =====================================================

-- As permissões de acesso/edição são controladas exclusivamente
-- pelo backend Node.js via JWT (rotas /api/precificacao).
-- Não há RLS/policies nesta migration.

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
-- 2. REGRAS DE PRECIFICAÇÃO POR UF (REGRA BASE QUANDO uf IS NULL)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.regras_precificacao (
  id BIGSERIAL PRIMARY KEY,
  uf TEXT NULL,
  descricao TEXT,

  -- Percentuais de markup sobre os custos do produto
  custo_fixo_percent NUMERIC(10, 4) DEFAULT 0,
  comissao_percent NUMERIC(10, 4) DEFAULT 0,
  assistencia_percent NUMERIC(10, 4) DEFAULT 0,
  margem_lucro_percent NUMERIC(10, 4) DEFAULT 0,

  -- Percentuais de impostos por UF (preparação para impostos/UF)
  icms_percent NUMERIC(10, 4) DEFAULT 0,
  ipi_percent NUMERIC(10, 4) DEFAULT 0,
  pis_percent NUMERIC(10, 4) DEFAULT 0,
  cofins_percent NUMERIC(10, 4) DEFAULT 0,
  outros_impostos_percent NUMERIC(10, 4) DEFAULT 0,

  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT regras_precificacao_uf_unico UNIQUE (uf)
);

COMMENT ON TABLE public.regras_precificacao IS 'Regras percentuais usadas na formação de preço dos guindastes por UF. uf NULL representa a regra padrão (fallback).';
COMMENT ON COLUMN public.regras_precificacao.uf IS 'UF das regras (ex: SP, RS). NULL indica regra base/padrão.';
COMMENT ON COLUMN public.regras_precificacao.custo_fixo_percent IS 'Percentual de custo fixo administrativo/operacional sobre o subtotal de custos';
COMMENT ON COLUMN public.regras_precificacao.comissao_percent IS 'Percentual de comissão sobre o subtotal de custos';
COMMENT ON COLUMN public.regras_precificacao.assistencia_percent IS 'Percentual de assistência técnica sobre o subtotal de custos';
COMMENT ON COLUMN public.regras_precificacao.margem_lucro_percent IS 'Percentual de margem de lucro desejada';
COMMENT ON COLUMN public.regras_precificacao.icms_percent IS 'Alíquota de ICMS para a UF';
COMMENT ON COLUMN public.regras_precificacao.ipi_percent IS 'Alíquota de IPI para a UF';
COMMENT ON COLUMN public.regras_precificacao.pis_percent IS 'Alíquota de PIS para a UF';
COMMENT ON COLUMN public.regras_precificacao.cofins_percent IS 'Alíquota de COFINS para a UF';

-- Trigger updated_at
DROP TRIGGER IF EXISTS regras_precificacao_set_updated_at ON public.regras_precificacao;
CREATE TRIGGER regras_precificacao_set_updated_at
  BEFORE UPDATE ON public.regras_precificacao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_regras_precificacao_uf ON public.regras_precificacao(uf);
CREATE INDEX IF NOT EXISTS idx_regras_precificacao_ativo ON public.regras_precificacao(ativo);

-- =====================================================
-- 3. TABELA DE PREÇOS DE VENDA CALCULADOS POR GUINDASTE/UF
--     Estrutura para cache/histórico dos preços calculados.
--     Pode ser populada manualmente ou por job futuro.
--     Não substitui as fontes atuais de frete/instalação.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.precos_venda_guindaste_uf (
  id BIGSERIAL PRIMARY KEY,
  guindaste_id BIGINT NOT NULL REFERENCES public.guindastes(id) ON DELETE CASCADE,
  uf TEXT NOT NULL,
  preco_calculado NUMERIC(18, 4) NOT NULL,
  formula_snapshot JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guindaste_id, uf)
);

COMMENT ON TABLE public.precos_venda_guindaste_uf IS 'Preços de venda calculados por guindaste e UF. Futuramente alimentará a tela de pagamento do representante.';

DROP TRIGGER IF EXISTS precos_venda_guindaste_uf_set_updated_at ON public.precos_venda_guindaste_uf;
CREATE TRIGGER precos_venda_guindaste_uf_set_updated_at
  BEFORE UPDATE ON public.precos_venda_guindaste_uf
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_precos_venda_guindaste_uf_guindaste ON public.precos_venda_guindaste_uf(guindaste_id);
CREATE INDEX IF NOT EXISTS idx_precos_venda_guindaste_uf_uf ON public.precos_venda_guindaste_uf(uf);

-- =====================================================
-- 4. FUNÇÃO AUXILIAR: buscar regra ativa para uma UF
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_regra_precificacao(p_uf TEXT)
RETURNS public.regras_precificacao
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_regra public.regras_precificacao;
BEGIN
  SELECT * INTO v_regra
  FROM public.regras_precificacao
  WHERE ativo = TRUE AND UPPER(TRIM(uf)) = UPPER(TRIM(p_uf))
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_regra
    FROM public.regras_precificacao
    WHERE ativo = TRUE AND uf IS NULL
    LIMIT 1;
  END IF;

  RETURN v_regra;
END;
$$;

-- =====================================================
-- 5. FUNÇÃO/FÓRMULA DE CÁLCULO DE PREÇO DE VENDA
--    Estrutura preparada; a fórmula pode ser ajustada
--    futuramente conforme a política comercial.
--    Fórmula atual (sugestão):
--      subtotal = custo_mp + custo_mo
--      variaveis = subtotal * (custo_fixo + comissao + assistencia)/100
--      base_com_impostos = (subtotal + variaveis) / (1 - (icms+ipi+pis+cofins+outros)/100)
--      preco = base_com_impostos * (1 + margem_lucro/100)
-- =====================================================
CREATE OR REPLACE FUNCTION public.calcular_preco_venda(
  p_guindaste_id BIGINT,
  p_uf TEXT
)
RETURNS NUMERIC(18, 4)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_mp NUMERIC(18, 4);
  v_mo NUMERIC(18, 4);
  v_regra public.regras_precificacao;
  v_subtotal NUMERIC(18, 4);
  v_variaveis NUMERIC(18, 4);
  v_imposto_rate NUMERIC(10, 4);
  v_base_impostos NUMERIC(18, 4);
  v_preco NUMERIC(18, 4);
BEGIN
  SELECT COALESCE(custo_mp, 0), COALESCE(custo_mo, 0)
  INTO v_mp, v_mo
  FROM public.guindastes
  WHERE id = p_guindaste_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_regra := public.get_regra_precificacao(p_uf);
  IF v_regra IS NULL THEN
    RETURN 0;
  END IF;

  v_subtotal := v_mp + v_mo;

  v_variaveis := v_subtotal *
    (
      COALESCE(v_regra.custo_fixo_percent, 0) +
      COALESCE(v_regra.comissao_percent, 0) +
      COALESCE(v_regra.assistencia_percent, 0)
    ) / 100;

  v_imposto_rate :=
    COALESCE(v_regra.icms_percent, 0) +
    COALESCE(v_regra.ipi_percent, 0) +
    COALESCE(v_regra.pis_percent, 0) +
    COALESCE(v_regra.cofins_percent, 0) +
    COALESCE(v_regra.outros_impostos_percent, 0);

  IF v_imposto_rate >= 100 THEN
    v_imposto_rate := 0;
  END IF;

  IF v_imposto_rate > 0 THEN
    v_base_impostos := (v_subtotal + v_variaveis) / (1 - (v_imposto_rate / 100));
  ELSE
    v_base_impostos := v_subtotal + v_variaveis;
  END IF;

  v_preco := v_base_impostos * (1 + COALESCE(v_regra.margem_lucro_percent, 0) / 100);

  RETURN ROUND(v_preco, 4);
END;
$$;

-- =====================================================
-- 6. VIEW PARA CONSUMO DA TELA DE PAGAMENTO FUTURA
-- =====================================================
CREATE OR REPLACE VIEW public.view_precificacao_guindaste_uf AS
SELECT
  g.id AS guindaste_id,
  g.codigo_referencia,
  g.subgrupo,
  g.modelo,
  g.custo_mp,
  g.custo_mo,
  u.uf,
  r.id AS regra_id,
  r.custo_fixo_percent,
  r.comissao_percent,
  r.assistencia_percent,
  r.margem_lucro_percent,
  r.icms_percent,
  r.ipi_percent,
  r.pis_percent,
  r.cofins_percent,
  r.outros_impostos_percent,
  public.calcular_preco_venda(g.id, u.uf) AS preco_venda_calculado
FROM public.guindastes g
CROSS JOIN (
  SELECT DISTINCT TRIM(UPPER(uf)) AS uf
  FROM public.fretes
  WHERE uf IS NOT NULL
  UNION ALL
  SELECT DISTINCT TRIM(UPPER(uf))
  FROM public.regras_precificacao
  WHERE uf IS NOT NULL
) u
LEFT JOIN public.regras_precificacao r
  ON r.uf = u.uf AND r.ativo = TRUE;

-- =====================================================
-- 7. VERIFICAÇÃO
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
    WHERE table_schema = 'public' AND table_name = 'regras_precificacao'
  ) THEN
    RAISE NOTICE '✅ Estrutura de precificação criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro: estrutura de precificação incompleta.';
  END IF;
END $$;
