-- =====================================================
-- MIGRATION: Tributação por UF + NCM
-- DESCRIÇÃO: Cadastro de regras tributárias por combinação
--            UF + NCM para futura precificação.
--            Executar manualmente no PostgreSQL de produção.
-- =====================================================

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
-- TABELA DE TRIBUTAÇÃO
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

COMMENT ON TABLE public.tributacao IS 'Regras tributárias por UF e NCM para futura precificação.';
COMMENT ON COLUMN public.tributacao.uf IS 'UF brasileira (ex: SP, RS)';
COMMENT ON COLUMN public.tributacao.ncm IS 'Código NCM do produto';
COMMENT ON COLUMN public.tributacao.icms_contribuinte_percent IS 'Alíquota de ICMS para contribuinte (%)';
COMMENT ON COLUMN public.tributacao.icms_nao_contribuinte_percent IS 'Alíquota de ICMS para não contribuinte (%)';
COMMENT ON COLUMN public.tributacao.pis_cofins_percent IS 'Alíquota combinada de PIS/COFINS (%)';

-- Trigger updated_at
DROP TRIGGER IF EXISTS tributacao_set_updated_at ON public.tributacao;
CREATE TRIGGER tributacao_set_updated_at
  BEFORE UPDATE ON public.tributacao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_tributacao_uf ON public.tributacao(uf);
CREATE INDEX IF NOT EXISTS idx_tributacao_ncm ON public.tributacao(ncm);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tributacao'
  ) THEN
    RAISE NOTICE '✅ Tabela de tributação criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro: tabela de tributação não criada.';
  END IF;
END $$;
