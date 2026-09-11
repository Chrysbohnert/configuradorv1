-- Cria tabela de acessorios, separada de guindastes
CREATE TABLE IF NOT EXISTS public.acessorios (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  foto_url TEXT,
  preco NUMERIC(18, 4) NOT NULL DEFAULT 0,
  max_parcelas INTEGER NOT NULL DEFAULT 1 CHECK (max_parcelas >= 1 AND max_parcelas <= 12),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.acessorios IS 'Acessorios comerciais independentes de guindastes';
COMMENT ON COLUMN public.acessorios.codigo IS 'Codigo unico do acessorio';
COMMENT ON COLUMN public.acessorios.nome IS 'Nome do acessorio';
COMMENT ON COLUMN public.acessorios.descricao IS 'Descricao do acessorio';
COMMENT ON COLUMN public.acessorios.foto_url IS 'URL da foto do acessorio';
COMMENT ON COLUMN public.acessorios.preco IS 'Preco do acessorio';
COMMENT ON COLUMN public.acessorios.max_parcelas IS 'Numero maximo de parcelas permitidas (1 a 12)';
COMMENT ON COLUMN public.acessorios.ativo IS 'Indica se o acessorio esta ativo para uso';

CREATE INDEX IF NOT EXISTS idx_acessorios_ativo ON public.acessorios (ativo);
CREATE INDEX IF NOT EXISTS idx_acessorios_codigo ON public.acessorios (codigo);
