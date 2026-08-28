-- =============================================================================
-- FIX: adiciona DEFAULT auto-incremento na coluna id de graficos_carga
-- Causa: coluna id tem NOT NULL mas sem DEFAULT/SERIAL → INSERT sem id falha
--        com erro PostgreSQL 23502.
--
-- Execute como superuser (postgres) no banco starkindustrial_configurador
-- É seguro rodar mais de uma vez (usa IF NOT EXISTS / IF EXISTS).
-- =============================================================================

-- 1. Cria a sequence se ainda não existir
CREATE SEQUENCE IF NOT EXISTS public.graficos_carga_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- 2. Define a sequence como DEFAULT da coluna id
ALTER TABLE public.graficos_carga
  ALTER COLUMN id SET DEFAULT nextval('public.graficos_carga_id_seq'::regclass);

-- 3. Vincula a sequence à coluna (é destruída junto com a tabela)
ALTER SEQUENCE public.graficos_carga_id_seq
  OWNED BY public.graficos_carga.id;

-- 4. Sincroniza o valor da sequence com o maior id existente
--    (evita conflito de chave duplicada em novos inserts)
SELECT setval(
  'public.graficos_carga_id_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM public.graficos_carga), 0), 1),
  true
);

-- 5. Garante permissão de uso ao usuário da aplicação
GRANT USAGE, SELECT ON SEQUENCE public.graficos_carga_id_seq
  TO starkindustrial_configuser;

-- =============================================================================
-- Após rodar este script, o fluxo abaixo funciona sem enviar id:
--   POST /api/graficos-carga  { "nome": "...", "arquivo_url": "..." }
--   → PostgreSQL gera id automaticamente → retorna registro completo
-- =============================================================================
