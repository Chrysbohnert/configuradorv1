-- ============================================
-- MIGRATION: Áreas de atuação das instaladoras/oficinas
-- ============================================
-- Vincula municípios às instaladoras cadastradas na tabela fretes.
-- Execute no Supabase SQL Editor com usuário postgres.

CREATE TABLE IF NOT EXISTS public.frete_areas_atuacao (
  id SERIAL PRIMARY KEY,
  frete_id INTEGER NOT NULL REFERENCES public.fretes(id) ON DELETE CASCADE,
  codigo_ibge TEXT NOT NULL,
  nome TEXT NOT NULL,
  uf TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (frete_id, codigo_ibge)
);

COMMENT ON TABLE public.frete_areas_atuacao IS 'Municípios que compõem a área de atuação de cada instaladora/oficina (tabela fretes)';

-- Índice útil para joins e carregamentos
CREATE INDEX IF NOT EXISTS idx_frete_areas_atuacao_frete_id ON public.frete_areas_atuacao(frete_id);
CREATE INDEX IF NOT EXISTS idx_frete_areas_atuacao_uf ON public.frete_areas_atuacao(uf);

-- Permissões para o service (ajuste conforme sua role/application)
ALTER TABLE public.frete_areas_atuacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all" ON public.frete_areas_atuacao
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- Verificar estrutura criada
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'frete_areas_atuacao'
ORDER BY ordinal_position;
