CREATE TABLE IF NOT EXISTS public.erp_import_lotes (
  id BIGSERIAL PRIMARY KEY,
  arquivo TEXT NOT NULL,
  importado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id BIGINT,
  usuario_nome TEXT,
  status TEXT NOT NULL DEFAULT 'processando'
    CHECK (status IN ('processando', 'concluido', 'falhou')),
  atual BOOLEAN NOT NULL DEFAULT FALSE,
  total_importado INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.erp_import_itens (
  id BIGSERIAL PRIMARY KEY,
  lote_id BIGINT NOT NULL REFERENCES public.erp_import_lotes(id) ON DELETE CASCADE,
  referencia TEXT NOT NULL,
  descricao TEXT,
  ncm TEXT,
  custo_mp NUMERIC(18, 4),
  custo_mo NUMERIC(18, 4),
  margem_lucro_percent NUMERIC(10, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT erp_import_itens_lote_referencia_unico UNIQUE (lote_id, referencia)
);

CREATE UNIQUE INDEX IF NOT EXISTS erp_import_lotes_atual_unico
  ON public.erp_import_lotes (atual)
  WHERE atual = TRUE;

CREATE INDEX IF NOT EXISTS idx_erp_import_lotes_status_data
  ON public.erp_import_lotes (status, importado_em DESC);

CREATE INDEX IF NOT EXISTS idx_erp_import_itens_lote
  ON public.erp_import_itens (lote_id);

CREATE INDEX IF NOT EXISTS idx_erp_import_itens_referencia
  ON public.erp_import_itens (referencia);
