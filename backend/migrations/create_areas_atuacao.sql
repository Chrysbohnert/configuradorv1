-- ============================================
-- MIGRATION: Áreas de atuação genéricas
-- ============================================
-- Vincula municípios a qualquer entidade territorial:
-- instaladora, concessionaria, representante, etc.
-- Execute no Supabase SQL Editor com usuário postgres.

CREATE TABLE IF NOT EXISTS public.areas_atuacao (
  id SERIAL PRIMARY KEY,
  tipo_entidade TEXT NOT NULL CHECK (tipo_entidade IN ('instaladora', 'concessionaria', 'representante')),
  entidade_id TEXT NOT NULL,
  codigo_ibge TEXT NOT NULL,
  nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  cor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tipo_entidade, entidade_id, codigo_ibge)
);

COMMENT ON TABLE public.areas_atuacao IS 'Municípios que compõem a área de atuação de entidades territoriais (instaladoras, concessionárias, representantes)';

CREATE INDEX IF NOT EXISTS idx_areas_atuacao_tipo_entidade ON public.areas_atuacao(tipo_entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_areas_atuacao_uf ON public.areas_atuacao(uf);

ALTER TABLE public.areas_atuacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all" ON public.areas_atuacao
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- Migra dados legados da tabela frete_areas_atuacao, se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'frete_areas_atuacao'
  ) THEN
    INSERT INTO public.areas_atuacao (
      tipo_entidade, entidade_id, codigo_ibge, nome, uf, cor
    )
    SELECT
      'instaladora',
      frete_id,
      codigo_ibge,
      nome,
      uf,
      NULL
    FROM public.frete_areas_atuacao
    ON CONFLICT (tipo_entidade, entidade_id, codigo_ibge) DO NOTHING;

    DROP TABLE public.frete_areas_atuacao;
  END IF;
END $$;

-- Verificar estrutura criada
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'areas_atuacao'
ORDER BY ordinal_position;
