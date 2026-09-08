-- =====================================================
-- MIGRATION: Controle de pendência de validação de preços
-- DESCRIÇÃO: Adiciona status de preço aos guindastes e
--            tabela de auditoria de aprovações/edições.
--            A importação ERP marca equipamentos com
--            variação percentual elevada como pendentes.
--            Apenas admin_full pode aprovar ou editar.
-- =====================================================

-- Status do preço do equipamento
ALTER TABLE public.guindastes
  ADD COLUMN IF NOT EXISTS status_preco TEXT NOT NULL DEFAULT 'aprovado'
    CHECK (status_preco IN ('aprovado', 'pendente'));

ALTER TABLE public.guindastes
  ADD COLUMN IF NOT EXISTS preco_pendente_desde TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.guindastes.status_preco IS 'aprovado = preço liberado para propostas; pendente = aguardando validação após variação de custo/preço';
COMMENT ON COLUMN public.guindastes.preco_pendente_desde IS 'Data/hora em que o equipamento foi marcado como pendente';

-- Auditoria de aprovações/edições de preço
CREATE TABLE IF NOT EXISTS public.preco_auditoria (
  id BIGSERIAL PRIMARY KEY,
  guindaste_id BIGINT NOT NULL REFERENCES public.guindastes(id) ON DELETE CASCADE,
  usuario_id BIGINT,
  usuario_nome TEXT,
  acao TEXT NOT NULL CHECK (acao IN ('importacao_pendente', 'aprovar', 'editar', 'rejeitar')),
  valor_anterior JSONB DEFAULT NULL,
  valor_novo JSONB DEFAULT NULL,
  motivo TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.preco_auditoria IS 'Histórico de aprovações, edições e marcações de pendência de preços/custos de equipamentos';

CREATE INDEX IF NOT EXISTS idx_preco_auditoria_guindaste
  ON public.preco_auditoria(guindaste_id, created_at DESC);

-- Garante que equipamentos existentes fiquem aprovados inicialmente
UPDATE public.guindastes
  SET status_preco = 'aprovado', preco_pendente_desde = NULL
  WHERE status_preco IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guindastes' AND column_name = 'status_preco'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'preco_auditoria'
  ) THEN
    RAISE NOTICE '✅ Controle de pendência de preços criado com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro: estrutura de pendência de preços incompleta.';
  END IF;
END $$;
