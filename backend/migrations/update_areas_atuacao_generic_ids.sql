-- Migration: generaliza areas_atuacao para IDs string e adiciona dados territoriais
-- nas tabelas de concessionárias e usuários (representantes).
-- Execute no PostgreSQL/Supabase antes de integrar concessionárias/representantes ao mapa.

-- 1. Permite que entidade_id armazene inteiros (instaladoras) ou UUIDs (concessionárias/representantes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'areas_atuacao'
      AND column_name = 'entidade_id'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.areas_atuacao
      ALTER COLUMN entidade_id TYPE TEXT USING entidade_id::TEXT;
  END IF;
END $$;

-- Recria índice para o novo tipo
DROP INDEX IF EXISTS public.idx_areas_atuacao_tipo_entidade;
CREATE INDEX idx_areas_atuacao_tipo_entidade ON public.areas_atuacao(tipo_entidade, entidade_id);

-- Atualiza constraint UNIQUE
ALTER TABLE public.areas_atuacao
  DROP CONSTRAINT IF EXISTS areas_atuacao_tipo_entidade_entidade_id_codigo_ibge_key,
  ADD CONSTRAINT areas_atuacao_tipo_entidade_entidade_id_codigo_ibge_key
    UNIQUE (tipo_entidade, entidade_id, codigo_ibge);

-- 2. Concessionárias: sede e cor no mapa
ALTER TABLE public.concessionarias
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS cor TEXT;

-- 3. Usuários (representantes): sede e cor no mapa
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS cor TEXT;

-- 4. Índices úteis para busca por UF
CREATE INDEX IF NOT EXISTS idx_concessionarias_uf ON public.concessionarias(uf);
CREATE INDEX IF NOT EXISTS idx_app_users_uf_tipo ON public.app_users(uf, tipo);
