-- =====================================================
-- TABELA: estoque_concessionaria
-- DESCRIÇÃO: Controla o estoque de guindastes de cada concessionária
--            Alimentado automaticamente quando pedidos são aprovados/faturados
-- =====================================================

CREATE TABLE IF NOT EXISTS public.estoque_concessionaria (
  id bigserial PRIMARY KEY,
  concessionaria_id uuid NOT NULL REFERENCES public.concessionarias(id) ON DELETE CASCADE,
  guindaste_id bigint NOT NULL REFERENCES public.guindastes(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(concessionaria_id, guindaste_id)
);

-- Comentários
COMMENT ON TABLE public.estoque_concessionaria IS 'Estoque de guindastes por concessionária (alimentado por pedidos aprovados)';
COMMENT ON COLUMN public.estoque_concessionaria.quantidade IS 'Quantidade de guindastes deste modelo em estoque';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS estoque_concessionaria_set_updated_at ON public.estoque_concessionaria;
CREATE TRIGGER estoque_concessionaria_set_updated_at
BEFORE UPDATE ON public.estoque_concessionaria
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_estoque_concessionaria_concessionaria 
  ON public.estoque_concessionaria(concessionaria_id);
CREATE INDEX IF NOT EXISTS idx_estoque_concessionaria_guindaste 
  ON public.estoque_concessionaria(guindaste_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.estoque_concessionaria ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admin Stark gerencia TODO o estoque
DROP POLICY IF EXISTS estoque_concessionaria_admin_stark_manage ON public.estoque_concessionaria;
CREATE POLICY estoque_concessionaria_admin_stark_manage ON public.estoque_concessionaria
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email()
      AND u.tipo = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email()
      AND u.tipo = 'admin'
  )
);

-- Policy 2: Admin Concessionária vê APENAS SEU estoque
DROP POLICY IF EXISTS estoque_concessionaria_admin_concessionaria_read ON public.estoque_concessionaria;
CREATE POLICY estoque_concessionaria_admin_concessionaria_read ON public.estoque_concessionaria
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email()
      AND u.tipo = 'admin_concessionaria'
      AND u.concessionaria_id = estoque_concessionaria.concessionaria_id
  )
);

-- Policy 3: Vendedores da concessionária veem APENAS o estoque da sua concessionária
DROP POLICY IF EXISTS estoque_concessionaria_vendedor_read ON public.estoque_concessionaria;
CREATE POLICY estoque_concessionaria_vendedor_read ON public.estoque_concessionaria
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.email = auth.email()
      AND u.tipo = 'vendedor_concessionaria'
      AND u.concessionaria_id = estoque_concessionaria.concessionaria_id
  )
);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'estoque_concessionaria'
  ) THEN
    RAISE NOTICE '✅ Tabela estoque_concessionaria criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro: Tabela estoque_concessionaria não foi criada!';
  END IF;
END $$;
